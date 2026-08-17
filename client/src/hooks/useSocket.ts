import { io, type Socket } from "socket.io-client";
import { useEffect, useMemo } from "react";
import { useAuthStore } from "../store/authStore";

// The server verifies handshake.auth.token, so there is no point connecting without one.
//
// The token is read through a callback rather than captured in a closure: socket.io calls
// it on every connection attempt, so a reconnect after the access token was rotated sends
// the current one. Passing the token as a prop instead would mean rebuilding the whole
// socket every ~15 minutes when it refreshes — tearing down a healthy connection, leaving
// the room, and re-joining, for no reason.
export const useSocket = (url: string, enabled: boolean): Socket | null => {
  const socket = useMemo(
    () =>
      enabled
        ? io(url, {
            autoConnect: false,
            transports: ["websocket"],
            auth: (cb) => cb({ token: useAuthStore.getState().accessToken ?? "" }),
          })
        : null,
    [url, enabled],
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
