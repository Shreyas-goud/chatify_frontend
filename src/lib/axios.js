import axios from "axios";

// A trailing slash on VITE_BACKEND_URL would make every path start with "//", which matches no route.
export const BACKEND_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");

export const axiosInstance = axios.create({
  baseURL: BACKEND_URL + "/api",
  withCredentials: true,
});

// No response at all means the server couldn't be reached (on Render's free plan it sleeps when idle).
export const errorMessage = (error) =>
  error.response?.data?.message ??
  (error.response ? "Something went wrong" : "Can't reach the server. Try again in a moment.");
