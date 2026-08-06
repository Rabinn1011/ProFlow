import { io, type Socket } from "socket.io-client";
import { useEffect, useMemo } from "react";

// The server verifies handshake.auth.token, so a socket without a token is refused.
// Passing null returns null rather than opening a connection that will be rejected.
export const useSocket = (url: string, token: string | null): Socket | null => {
  const socket = useMemo(
    () =>
      token
        ? io(url, {
            autoConnect: false,
            transports: ["websocket"],
            auth: { token },
          })
        : null,
    [url, token],
  );

  useEffect(() => {
    if (!socket) return;

    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return socket;
};
