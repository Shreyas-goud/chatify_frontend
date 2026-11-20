import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { inviteUrl } from "../lib/invite";

// Your invite link, as text to copy or share and as a QR code to scan from across the table.
export default function InviteCard({ qr: withQr = true, className = "" }) {
  const code = useAuthStore((s) => s.authUser?.inviteCode);
  const url = inviteUrl(code);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === "function";

  useEffect(() => {
    if (!withQr) return;
    // The QR library is only needed here, so it loads on demand.
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, { margin: 1, width: 400, color: { dark: "#111214", light: "#F1EDE4" } })
      )
      .then(setQr)
      .catch(() => setQr(null));
  }, [url, withQr]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.");
    }
  };

  const share = () =>
    navigator.share({ title: "Chatify", text: "Get on my Chatify board so we never go quiet.", url }).catch(() => {});

  return (
    <div className={`rounded-[14px] bg-board-rail p-5 text-left ${className}`}>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        {withQr && qr && (
          <img src={qr} alt="QR code of your invite link" className="size-[132px] shrink-0 rounded-[10px]" />
        )}
        <div className="min-w-0">
          <p className="label">Your invite link</p>
          <p className="mt-2 select-all break-all font-board text-[19px] font-semibold tracking-[0.03em] text-ink">
            {url.replace(/^https?:\/\//, "")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn-primary h-10 px-4">
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Get on my Chatify board so we never go quiet: ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn h-10 bg-[#25D366] px-4 text-[#06301A] hover:bg-[#3ee07a]"
            >
              WhatsApp
            </a>
            {canShare && (
              <button type="button" onClick={share} className="btn-quiet h-10 px-4">
                <Share2Icon className="size-4" />
                Share
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[13px] text-ink-muted">Anyone who opens it lands on your board as a friend.</p>
    </div>
  );
}
