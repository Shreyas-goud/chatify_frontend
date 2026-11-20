import { useEffect, useState } from "react";
import { axiosInstance } from "../lib/axios";

export const normalizeUsername = (raw) => String(raw ?? "").trim().replace(/^@+/, "").toLowerCase();

// A readable suggestion from a name: "Ravi Mehta" → "ravimehta".
export const suggestUsername = (name) =>
  String(name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15);

// Asks the server whether a username is free, 350 ms after typing stops.
// `current` is the person's own username, which is always fine for them to keep.
export function useUsernameCheck(raw, current) {
  const username = normalizeUsername(raw);
  const [result, setResult] = useState({ username: "", state: "idle", message: "" });

  useEffect(() => {
    if (!username || username === current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await axiosInstance.get(`/auth/username/${encodeURIComponent(username)}`);
        if (cancelled) return;
        setResult(
          data.available
            ? { username, state: "ok", message: `@${username} is yours.` }
            : { username, state: "bad", message: data.problem }
        );
      } catch {
        if (!cancelled) setResult({ username, state: "idle", message: "" });
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, current]);

  if (!username || username === current) return { username, state: "idle", message: "" };
  if (result.username !== username) return { username, state: "checking", message: "Checking…" };
  return result;
}
