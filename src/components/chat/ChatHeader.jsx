import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeftIcon, MoreHorizontalIcon, UserMinusIcon } from "lucide-react";
import { useChatStore } from "../../store/useChatStore";
import { typingKey, usePresenceStore } from "../../store/usePresenceStore";
import Avatar from "../ui/Avatar";
import { fullDate } from "../../lib/time";

function FriendMenu({ friend }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const removeFriend = useChatStore((s) => s.removeFriend);
  const navigate = useNavigate();
  const root = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && root.current?.contains(event.target)) return;
      setOpen(false);
      setConfirming(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const remove = async () => {
    if (await removeFriend(friend)) navigate("/", { replace: true });
  };

  return (
    <div ref={root} className="relative">
      <button
        className="icon-btn"
        aria-label="Chat options"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
      >
        <MoreHorizontalIcon className="size-5" />
      </button>
      {open && (
        <div className="menu-enter absolute right-0 top-12 z-20 w-[260px] origin-top-right rounded-[12px] border border-tile-line bg-board p-2 shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
          <p className="px-3 pb-2 pt-1 text-[13px] text-ink-faint">
            Friends since {fullDate(friend.friendSince)}
          </p>
          {confirming ? (
            <div className="rounded-[8px] bg-tile p-3">
              <p className="text-[14px] text-ink">Remove {friend.fullName}?</p>
              <p className="mt-1 text-[13px] text-ink-muted">Your messages stay. You can add each other again.</p>
              <div className="mt-3 flex gap-2">
                <button className="btn-danger h-9 flex-1 px-3 text-[13px]" onClick={remove}>
                  Remove
                </button>
                <button className="btn-quiet h-9 flex-1 px-3 text-[13px]" onClick={() => setConfirming(false)}>
                  Keep
                </button>
              </div>
            </div>
          ) : (
            <button
              className="flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[14px] text-stop hover:bg-tile"
              onClick={() => setConfirming(true)}
            >
              <UserMinusIcon className="size-4" />
              Remove friend
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ChatHeader({ friend }) {
  const online = usePresenceStore((s) => s.online.has(friend._id));
  const typing = usePresenceStore((s) => s.typing.has(typingKey(friend._id)));

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-tile-edge bg-board px-3 sm:px-5">
      <Link to="/" className="icon-btn -ml-1 lg:hidden" aria-label="Back to board">
        <ArrowLeftIcon className="size-5" />
      </Link>
      <Avatar user={friend} size={42} online={online} />
      <div className="min-w-0 flex-1">
        <h1 className="board-name truncate text-[22px] leading-6">{friend.fullName}</h1>
        <p className="label text-[12px]" aria-live="polite">
          {typing ? (
            <span className="text-signal">Typing…</span>
          ) : online ? (
            <span className="text-go">Online</span>
          ) : (
            <span className="normal-case tracking-normal">@{friend.username}</span>
          )}
        </p>
      </div>
      <FriendMenu friend={friend} />
    </header>
  );
}
