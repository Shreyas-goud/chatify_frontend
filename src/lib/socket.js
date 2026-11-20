import { io } from "socket.io-client";
import { axiosInstance, BACKEND_URL } from "./axios";
import { useChatStore } from "../store/useChatStore";
import { useCircleStore } from "../store/useCircleStore";
import { usePresenceStore } from "../store/usePresenceStore";

let socket = null;
let reportActivity = null;

// The socket goes straight to the backend, where the website's cookie isn't sent, so each
// (re)connection first fetches a two-minute token over the cookie-authenticated API.
const fetchToken = (callback) =>
  axiosInstance
    .get("/auth/socket-token")
    .then((res) => callback({ token: res.data.token }))
    .catch(() => callback({}));

const onScreen = () => document.visibilityState === "visible";

export function connectSocket() {
  if (socket) return socket;
  const presence = () => usePresenceStore.getState();
  const chat = () => useChatStore.getState();
  const circles = () => useCircleStore.getState();

  socket = io(BACKEND_URL, { auth: fetchToken });
  let hadConnected = false;

  // Whether Chatify is on screen. Friends and circle members see it as "On Chatify".
  reportActivity = () => socket?.connected && socket.emit("activity", { active: onScreen() });
  document.addEventListener("visibilitychange", reportActivity);

  socket.on("connect", () => {
    presence().setConnection("online");
    reportActivity();
    if (hadConnected) {
      chat().resync();
      circles().resync();
    }
    hadConnected = true;
  });
  socket.on("disconnect", () => presence().setConnection("offline"));
  socket.io.on("reconnect_attempt", () => presence().setConnection("connecting"));

  socket.on("presence:init", (entries) => presence().setInitial(entries));
  socket.on("presence", (entry) => {
    presence().setPresence(entry);
    circles().applyPresence(entry);
  });
  socket.on("typing", ({ from, on, circleId }) => presence().setTyping(from, on, circleId));

  socket.on("message:new", (message) => chat().receiveMessage(message));
  socket.on("messages:read", (receipt) => chat().receiveRead(receipt));
  socket.on("friends:changed", () => chat().loadFriends());
  socket.on("friend:updated", (user) => chat().updateFriend(user));

  socket.on("circles:changed", () => circles().loadCircles());
  socket.on("circle:message", (message) => circles().receiveMessage(message));
  socket.on("circle:attention", (update) => circles().receiveAttention(update));
  socket.on("nudge", (nudge) => circles().incomingNudge(nudge));
  socket.on("nudge:updated", (nudge) => circles().receiveNudge(nudge));

  return socket;
}

export function disconnectSocket() {
  if (reportActivity) document.removeEventListener("visibilitychange", reportActivity);
  reportActivity = null;
  socket?.disconnect();
  socket = null;
}

export function emitTyping(to, on, circleId) {
  if (socket?.connected) socket.emit("typing", circleId ? { circleId, on } : { to, on });
}
