import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const useSocket = (serverUrl) => {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(serverUrl, {
      withCredentials: true,
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [serverUrl]);

  return socketRef;
};

export default useSocket;