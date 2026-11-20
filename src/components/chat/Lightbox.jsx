import { useEffect } from "react";
import { createPortal } from "react-dom";
import { m } from "motion/react";
import { ExternalLinkIcon, XIcon } from "lucide-react";

const MotionDiv = m.div;
const MotionImg = m.img;

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <MotionDiv
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4 sm:p-10"
      onClick={onClose}
    >
      <MotionImg
        src={src}
        alt=""
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="max-h-full max-w-full rounded-[8px] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute right-3 top-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a href={src} target="_blank" rel="noopener noreferrer" className="icon-btn bg-tile text-ink" aria-label="Open original">
          <ExternalLinkIcon className="size-[18px]" />
        </a>
        <button className="icon-btn bg-tile text-ink" onClick={onClose} aria-label="Close" autoFocus>
          <XIcon className="size-5" />
        </button>
      </div>
    </MotionDiv>,
    document.body
  );
}
