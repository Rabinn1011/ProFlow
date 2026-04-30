import { io, type Socket } from "socket.io-client";
import { useEffect, useMemo } from "react";

export const useSocket = (url: string): Socket => {
  const socket = useMemo(
    () =>
      io(url, {
        autoConnect: false,
        transports: ["websocket"],
      }),
    [url],
  );

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};
