import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { disablePush, enablePush, pushStatus } from "../lib/push";

// This browser's notification state: unsupported | blocked | off | on (null while checking).
export function usePush() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pushStatus().then(setStatus).catch(() => setStatus("unsupported"));
  }, []);

  const turnOn = useCallback(async () => {
    setBusy(true);
    try {
      await enablePush();
      setStatus("on");
      toast.success("Notifications are on.");
    } catch (error) {
      toast.error(error.message);
      setStatus(await pushStatus().catch(() => "unsupported"));
    } finally {
      setBusy(false);
    }
  }, []);

  const turnOff = useCallback(async () => {
    setBusy(true);
    try {
      await disablePush();
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, turnOn, turnOff };
}
