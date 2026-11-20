import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance, errorMessage } from "../lib/axios";

const timezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

export const useAuthStore = create((set) => ({
  authUser: null,
  isCheckingAuth: true,
  isSubmitting: false,

  // Only a 401 means signed out. A timeout or 5xx usually means Render's free server is still
  // waking up, so keep the loader ("Waking the server") and retry for up to about two minutes
  // rather than send a signed-in person to the login page.
  checkAuth: async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await axiosInstance.get("/auth/check");
        set({ authUser: res.data, isCheckingAuth: false });
        return;
      } catch (error) {
        const status = error.response?.status;
        const serverDown = !status || status >= 500;
        if (!serverDown || attempt >= 30) {
          set({ authUser: null, isCheckingAuth: false });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** attempt, 4000)));
      }
    }
  },

  // Returns true on success, so the form can move on; errors are shown as toasts.
  signup: async (data) => {
    set({ isSubmitting: true });
    try {
      const res = await axiosInstance.post("/auth/signup", { ...data, timezone: timezone() });
      set({ authUser: res.data });
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  login: async (data) => {
    set({ isSubmitting: true });
    try {
      const res = await axiosInstance.post("/auth/login", { ...data, timezone: timezone() });
      set({ authUser: res.data });
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  },
}));
