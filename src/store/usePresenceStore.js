import { create } from "zustand";

// A typing signal that stops arriving (closed tab, lost connection) expires on its own.
const TYPING_TTL = 6000;
const typingTimers = new Map();

// Typing is per place: a friend typing to me ("dm:<id>") or in a circle ("<circleId>:<id>").
export const typingKey = (userId, circleId) => `${circleId ?? "dm"}:${userId}`;

export const usePresenceStore = create((set) => ({
  online: new Set(), // connected
  active: new Set(), // with Chatify on screen (shared with friends and circle members)
  typing: new Set(),
  connection: "connecting", // connecting | online | offline

  setConnection: (connection) => set({ connection }),

  setInitial: (entries) =>
    set({
      online: new Set(entries.filter((e) => e.online).map((e) => String(e.userId))),
      active: new Set(entries.filter((e) => e.active).map((e) => String(e.userId))),
    }),

  setPresence: ({ userId, online, active }) =>
    set((state) => {
      const id = String(userId);
      const nextOnline = new Set(state.online);
      const nextActive = new Set(state.active);
      online ? nextOnline.add(id) : nextOnline.delete(id);
      active ? nextActive.add(id) : nextActive.delete(id);
      return { online: nextOnline, active: nextActive };
    }),

  setTyping: (userId, on, circleId) => {
    const key = typingKey(userId, circleId);
    clearTimeout(typingTimers.get(key));
    if (on) {
      typingTimers.set(
        key,
        setTimeout(() => usePresenceStore.getState().setTyping(userId, false, circleId), TYPING_TTL)
      );
    }
    set((state) => {
      if (state.typing.has(key) === on) return state;
      const typing = new Set(state.typing);
      on ? typing.add(key) : typing.delete(key);
      return { typing };
    });
  },

  reset: () => {
    typingTimers.forEach(clearTimeout);
    typingTimers.clear();
    set({ online: new Set(), active: new Set(), typing: new Set(), connection: "connecting" });
  },
}));
