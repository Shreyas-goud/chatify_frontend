import { Fragment, useEffect, useRef, useState } from "react";
import { clack } from "../../lib/sound";

const FLIP_MS = 70; // keep in step with --flip in index.css
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const randomChar = () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const show = (char) => (char === " " ? " " : char);

// One split-flap module. When `char` changes it flips through `cycles` random letters first,
// as the mechanical boards do, then lands.
function FlapChar({ char, cycles, delay, tone, sound }) {
  const [face, setFace] = useState({ now: char, before: char, flips: 0 });
  const shown = useRef(char);

  useEffect(() => {
    if (shown.current === char) return;
    if (reducedMotion()) {
      shown.current = char;
      setFace((f) => ({ now: char, before: char, flips: f.flips }));
      return;
    }
    const path = [...Array.from({ length: char === " " ? 0 : cycles }, randomChar), char];
    let step = 0;
    let timer;
    const next = () => {
      const target = path[step++];
      setFace((f) => ({ now: target, before: f.now, flips: f.flips + 1 }));
      shown.current = target;
      if (step < path.length) timer = setTimeout(next, FLIP_MS * 2);
      else if (sound) clack();
    };
    timer = setTimeout(next, delay);
    return () => clearTimeout(timer);
  }, [char, cycles, delay, sound]);

  const flipping = face.flips > 0 && face.before !== face.now;
  return (
    <span className={`flap ${tone === "signal" ? "flap-signal" : ""}`}>
      <span className="flap-half flap-top">
        <span>{show(face.now)}</span>
      </span>
      <span className="flap-half flap-bottom">
        <span>{show(flipping ? face.before : face.now)}</span>
      </span>
      {flipping && (
        <Fragment key={face.flips}>
          <span className="flap-half flap-top flap-fold-top">
            <span>{show(face.before)}</span>
          </span>
          <span className="flap-half flap-bottom flap-fold-bottom">
            <span>{show(face.now)}</span>
          </span>
        </Fragment>
      )}
    </span>
  );
}

// A row of flap modules. `length` pads or cuts to a fixed width, like a board field.
// `reveal` starts blank and flips the text in on mount; `stagger` delays each module.
export default function FlapText({
  text,
  length,
  className = "",
  tone,
  cycles = 2,
  stagger = 35,
  delay = 0,
  reveal = false,
  sound = false,
}) {
  const value = String(text ?? "").toUpperCase();
  const fitted = length ? value.padEnd(length).slice(0, length) : value;
  const [mounted, setMounted] = useState(!reveal);

  useEffect(() => {
    if (mounted) return;
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  const chars = (mounted ? fitted : " ".repeat(fitted.length)).split("");
  return (
    <span className={`inline-flex gap-[0.08em] ${className}`}>
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" className="inline-flex gap-[0.08em]">
        {chars.map((char, i) => (
          <FlapChar
            key={i}
            char={char}
            cycles={cycles}
            delay={delay + i * stagger}
            tone={tone}
            sound={sound && i === chars.length - 1}
          />
        ))}
      </span>
    </span>
  );
}
