import { useEffect, useRef } from "react";

const VideoTile = ({ stream, muted = false, label }) => {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-gray-900 aspect-video">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      <span className="absolute bottom-1 left-2 text-xs text-white bg-black/50 px-2 py-0.5 rounded">
        {label}
      </span>
    </div>
  );
};

const VideoChat = ({
  localStream,
  peers,
  micOn,
  camOn,
  toggleMic,
  toggleCam,
  onEndCall,
}) => {
  const peerEntries = Object.entries(peers);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center gap-2 shrink-0">
        <span>📹</span>
        <p className="font-bold text-sm">Video Call</p>
        <span className="ml-auto text-xs text-gray-400">
          {peerEntries.length + (localStream ? 1 : 0)} participant
          {peerEntries.length + (localStream ? 1 : 0) !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Video grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {!localStream && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <p className="text-3xl mb-3">📹</p>
            <p>Starting camera...</p>
          </div>
        )}

        {localStream && (
          <VideoTile stream={localStream} muted label="You" />
        )}

        {peerEntries.map(([socketId, stream]) => (
          <VideoTile
            key={socketId}
            stream={stream}
            label={`User ${socketId.slice(0, 5)}`}
          />
        ))}

        {localStream && peerEntries.length === 0 && (
          <p className="text-gray-500 text-xs text-center mt-4">
            Waiting for others to join the call...
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="p-3 border-t border-gray-700 space-y-2 shrink-0">
        {/* Mic + Cam toggles */}
        <div className="flex gap-2">
          <button
            onClick={toggleMic}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              micOn
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {micOn ? "🎙 Mute" : "🔇 Unmute"}
          </button>
          <button
            onClick={toggleCam}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              camOn
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {camOn ? "📷 Hide" : "📷 Show"}
          </button>
        </div>

        {/* End call button */}
        <button
          onClick={onEndCall}
          className="w-full py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition"
        >
          📵 End Call &amp; Leave Room
        </button>
      </div>
    </div>
  );
};

export default VideoChat;