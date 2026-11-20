import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export default function Field({ label, hint, hintTone = "muted", prefix, type = "text", className = "", ...input }) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const tones = { muted: "text-ink-muted", ok: "text-go", bad: "text-stop" };

  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-2 block">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] text-ink-faint">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={`field ${prefix ? "pl-8" : ""} ${isPassword ? "pr-12" : ""}`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            className="icon-btn absolute right-1 top-1/2 -translate-y-1/2"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? <EyeOffIcon className="size-[18px]" /> : <EyeIcon className="size-[18px]" />}
          </button>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className={`mt-2 min-h-5 text-[13px] ${tones[hintTone]}`} aria-live="polite">
          {hint}
        </p>
      )}
    </div>
  );
}
