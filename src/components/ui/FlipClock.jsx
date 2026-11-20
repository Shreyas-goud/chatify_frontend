import { useEffect, useState } from "react";
import FlapText from "./FlapText";
import { clock } from "../../lib/time";

// Wakes at each minute boundary rather than polling.
export default function FlipClock({ className = "" }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60_000 - (Date.now() % 60_000) + 50);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  return <FlapText text={clock(now)} cycles={0} stagger={0} className={`tabular ${className}`} />;
}
