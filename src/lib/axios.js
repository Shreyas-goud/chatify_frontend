import axios from "axios";

// The REST API is always called on the website's own domain: Vite proxies /api in development
// and Vercel rewrites it to Render in production. That keeps the login cookie first-party,
// which Safari requires.
export const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// The socket can't go through Vercel, so it connects to the backend directly.
// A trailing slash on VITE_BACKEND_URL would break the socket.io path.
export const BACKEND_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:3000"
    : import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, "");

// No response at all means the server couldn't be reached (on Render's free plan it sleeps when idle).
export const errorMessage = (error) =>
  error.response?.data?.message ??
  (error.response ? "Something went wrong" : "Can't reach the server. Try again in a moment.");
