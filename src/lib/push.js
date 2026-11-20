import { axiosInstance } from "./axios";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const keyBytes = (base64) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

// unsupported | blocked | off | on
export async function pushStatus() {
  if (!supported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

// Asks permission (it must follow a tap), subscribes this browser and registers it.
export async function enablePush() {
  if (!supported()) throw new Error("This browser can't receive notifications. On iPhone, add Chatify to your Home Screen first.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your browser's site settings.");
  const { data } = await axiosInstance.get("/push/key");
  if (!data.enabled) throw new Error("Notifications aren't set up on this server yet.");
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.publicKey) }));
  await axiosInstance.post("/push/subscribe", { subscription: subscription.toJSON() });
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await axiosInstance.post("/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
}
