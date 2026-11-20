// Chrome and Android offer "Install app" through this event; it has to be caught early,
// before any component mounts, and kept until the person asks.
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export const canInstall = () => Boolean(deferred);

export const subscribeInstall = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  notify();
  return outcome === "accepted";
}

export const isInstalled = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
