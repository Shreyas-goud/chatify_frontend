import { useEffect, useState } from "react";
import FlapText from "./ui/FlapText";

// Illustrative only (labelled DEMO): how the board reads as friends type, write and drift.
const NAMES = ["ANANYA", "KABIR", "MEERA"];
const SCRIPT = [
  [["14:31", "TYPING"], ["14:02", "SEEN"], ["23 DAYS", "QUIET"]],
  [["14:32", "1 NEW"], ["14:02", "TYPING"], ["23 DAYS", "QUIET"]],
  [["14:32", "SEEN"], ["14:33", "2 NEW"], ["23 DAYS", "TYPING"]],
  [["14:34", "TYPING"], ["14:33", "SEEN"], ["14:35", "1 NEW"]],
];
const loud = (status) => status === "TYPING" || status.endsWith("NEW");

export default function DemoBoard({ className = "" }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setStep((s) => (s + 1) % SCRIPT.length), 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <figure className={`rounded-[14px] bg-board p-4 sm:p-5 ${className}`} aria-label="Demo of the Chatify board">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">Your board</span>
        <span className="label rounded-[4px] border border-tile-line px-1.5 text-[11px] text-ink-faint">Demo</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 gap-y-2 text-[clamp(13px,1.35vw,17px)]">
        <span className="label text-[11px] text-ink-faint">Friend</span>
        <span className="label text-[11px] text-ink-faint">Last</span>
        <span className="label text-[11px] text-ink-faint">Status</span>
        {NAMES.map((name, row) => {
          const [time, status] = SCRIPT[step][row];
          const quiet = status === "QUIET";
          return (
            <div key={name} className={`contents ${quiet ? "[&>*]:opacity-[0.55]" : ""}`}>
              <FlapText text={name} length={7} cycles={0} />
              <FlapText text={time} length={7} cycles={1} />
              <FlapText text={status} length={6} cycles={2} tone={loud(status) ? "signal" : undefined} />
            </div>
          );
        })}
      </div>
    </figure>
  );
}
