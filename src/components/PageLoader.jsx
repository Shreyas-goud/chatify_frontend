import { useEffect, useState } from "react";
import Logo from "./ui/Logo";

// Render's free plan sleeps when idle; the first request can take up to a minute. Say so
// instead of leaving a silent spinner.
export default function PageLoader() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="grid h-dvh place-items-center bg-board-deep px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo className="text-[clamp(28px,7vw,44px)]" reveal />
        <p className="label h-5" aria-live="polite">
          {slow ? "Waking the server · this can take up to a minute" : "Connecting"}
        </p>
      </div>
    </div>
  );
}
