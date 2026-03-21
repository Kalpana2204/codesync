import { useEffect, useRef, useState, useCallback } from "react";

const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const useWebRTC = (socketRef, roomId, isEnabled) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const pcsRef = useRef({});
  const localStreamRef = useRef(null);

  // Create a peer connection for a remote socket
  const createPC = useCallback((remoteId, socket) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Push our local tracks to the remote peer
    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    // Send ICE candidates to remote peer via server
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit("webrtc:ice-candidate", {
          candidate,
          to: remoteId,
        });
      }
    };

    // When we receive remote video/audio stream
    pc.ontrack = ({ streams }) => {
      setPeers((prev) => ({ ...prev, [remoteId]: streams[0] }));
    };

    // Clean up if connection drops
    pc.onconnectionstatechange = () => {
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        setPeers((prev) => {
          const next = { ...prev };
          delete next[remoteId];
          return next;
        });
        delete pcsRef.current[remoteId];
      }
    };

    pcsRef.current[remoteId] = pc;
    return pc;
  }, []);

  // Start camera/mic and register socket listeners
  useEffect(() => {
    if (!isEnabled || !socketRef.current) return;

    // Capture ref value at effect run time — fixes ESLint warning
    const socket = socketRef.current;

    let active = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Tell everyone in the room we're ready for video
        socket.emit("webrtc:ready", { roomId });
      } catch (err) {
        console.error("Camera/mic access failed:", err);
      }
    };

    init();

    // Someone else just enabled video — we send them an offer
    socket.on("webrtc:user-joined", async ({ from }) => {
      const pc = createPC(from, socket);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("webrtc:offer", { offer, to: from });
    });

    // We just joined — connect to ALL users already in the room
    socket.on("webrtc:existing-users", async ({ users }) => {
      for (const remoteId of users) {
        const pc = createPC(remoteId, socket);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc:offer", { offer, to: remoteId });
      }
    });

    // We received an offer — send back an answer
    socket.on("webrtc:offer", async ({ offer, from }) => {
      const pc = createPC(from, socket);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("webrtc:answer", { answer, to: from });
    });

    // We received an answer to our offer
    socket.on("webrtc:answer", ({ answer, from }) => {
      pcsRef.current[from]?.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    });

    // ICE candidate from a peer
    socket.on("webrtc:ice-candidate", ({ candidate, from }) => {
      pcsRef.current[from]?.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // A peer left — close their connection
    socket.on("webrtc:user-left", ({ from }) => {
      pcsRef.current[from]?.close();
      delete pcsRef.current[from];
      setPeers((prev) => {
        const next = { ...prev };
        delete next[from];
        return next;
      });
    });

    return () => {
      active = false;

      // Stop camera/mic
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);

      // Close all peer connections
      Object.values(pcsRef.current).forEach((pc) => pc.close());
      pcsRef.current = {};
      setPeers({});

      // Use captured socket variable — not socketRef.current
      socket.off("webrtc:user-joined");
      socket.off("webrtc:existing-users");  // ← ADDED
      socket.off("webrtc:offer");
      socket.off("webrtc:answer");
      socket.off("webrtc:ice-candidate");
      socket.off("webrtc:user-left");
    };
  }, [isEnabled, roomId, socketRef, createPC]);

  const toggleMic = () => {
    localStreamRef.current
      ?.getAudioTracks()
      .forEach((t) => (t.enabled = !micOn));
    setMicOn((v) => !v);
  };

  const toggleCam = () => {
    localStreamRef.current
      ?.getVideoTracks()
      .forEach((t) => (t.enabled = !camOn));
    setCamOn((v) => !v);
  };

  return { localStream, peers, micOn, camOn, toggleMic, toggleCam };
};

export default useWebRTC;