import { create } from "zustand";

const KEY = "chatify:sound";

const readSound = () => {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
};

export const usePrefsStore = create((set, get) => ({
  soundOn: readSound(),
  toggleSound: () => {
    const soundOn = !get().soundOn;
    try {
      localStorage.setItem(KEY, soundOn ? "on" : "off");
    } catch {
      // private mode: the choice lasts for this visit only
    }
    set({ soundOn });
  },
}));
