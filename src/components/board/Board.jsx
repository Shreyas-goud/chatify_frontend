import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { BellIcon, PlusIcon, SearchIcon, SettingsIcon, UserPlusIcon, XIcon } from "lucide-react";
import { usePush } from "../../hooks/usePush";
import { useAuthStore } from "../../store/useAuthStore";
import { useChatStore } from "../../store/useChatStore";
import { useCircleStore } from "../../store/useCircleStore";
import { typingKey, usePresenceStore } from "../../store/usePresenceStore";
import Avatar from "../ui/Avatar";
import FlapText from "../ui/FlapText";
import FlipClock from "../ui/FlipClock";
import Logo from "../ui/Logo";
import FriendRow from "./FriendRow";
import CircleRow from "./CircleRow";

const isTypingTarget = (el) => el?.closest?.("input, textarea, [contenteditable='true']");

const CONNECTION = {
  online: { lamp: "bg-go", text: "Connected" },
  connecting: { lamp: "bg-signal", text: "Connecting" },
  offline: { lamp: "bg-stop", text: "Offline · reconnecting" },
};

function SkeletonRows() {
  return (
    <ul className="space-y-1 px-2" aria-hidden="true">
      {[0.9, 0.7, 0.5].map((opacity) => (
        <li key={opacity} className="flex items-center gap-3 px-3 py-2.5" style={{ opacity }}>
          <span className="size-[46px] rounded-[10px] bg-tile" />
          <span className="flex-1 space-y-2">
            <span className="block h-4 w-1/2 rounded bg-tile" />
            <span className="block h-3 w-3/4 rounded bg-tile/70" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyBoard() {
  return (
    <div className="px-6 py-12 text-center">
      <FlapText text="NO ONE YET" reveal className="text-[26px]" />
      <p className="mx-auto mt-5 max-w-[28ch] text-[15px] text-ink-muted">
        Chatify is for your people. Send them your invite link and they land right here.
      </p>
      <Link to="/add" className="btn-primary mt-7">
        Invite friends
      </Link>
    </div>
  );
}

const PROMPT_KEY = "chatify:notify-prompt";

// Nudges only work when they can reach you, so the board asks once (and can be told no).
function NotifyPrompt() {
  const { status, busy, turnOn } = usePush();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(PROMPT_KEY) === "hidden";
    } catch {
      return false;
    }
  });
  if (hidden || status !== "off") return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(PROMPT_KEY, "hidden");
    } catch {
      // private mode: it comes back next visit
    }
  };
  return (
    <div className="mx-4 mb-2 flex items-center gap-3 rounded-[10px] bg-board-rail px-3 py-2.5 sm:mx-5">
      <BellIcon className="size-4 shrink-0 text-signal" />
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-muted">Get messages and nudges when Chatify is closed.</p>
      <button type="button" className="font-board text-[13px] font-bold uppercase tracking-[0.08em] text-signal" disabled={busy} onClick={turnOn}>
        Turn on
      </button>
      <button type="button" className="icon-btn size-7" onClick={hide} aria-label="Hide this tip">
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

export default function Board() {
  const authUser = useAuthStore((s) => s.authUser);
  const friends = useChatStore((s) => s.friends);
  const incoming = useChatStore((s) => s.incoming);
  const status = useChatStore((s) => s.friendsStatus);
  const online = usePresenceStore((s) => s.online);
  const typing = usePresenceStore((s) => s.typing);
  const connection = usePresenceStore((s) => s.connection);
  const circles = useCircleStore((s) => s.circles);
  const [query, setQuery] = useState("");
  const search = useRef(null);

  // "/" jumps to search from anywhere that isn't a text field.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || isTypingTarget(event.target)) return;
      event.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return friends;
    return friends.filter((f) => f.fullName.toLowerCase().includes(q) || f.username.includes(q));
  }, [friends, query]);

  const conn = CONNECTION[connection];
  const q = query.trim().toLowerCase().replace(/^@/, "");
  const joinedCircles = circles.filter((c) => c.myStatus === "joined" && (!q || c.name.toLowerCase().includes(q)));
  const circleInvites = circles.filter((c) => c.myStatus === "invited");
  const circleTyping = (circle) =>
    circle.members.some((m) => m._id !== authUser._id && typing.has(typingKey(m._id, circle._id)));

  return (
    <>
      <header className="shrink-0 px-4 pb-3 pt-4 sm:px-5">
        <div className="flex items-center justify-between">
          <Link to="/" aria-label="Chatify board">
            <Logo className="text-[17px]" />
          </Link>
          <FlipClock className="text-[17px]" />
        </div>
        <div className="mt-4 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search friends</span>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setQuery(""), e.currentTarget.blur())}
              placeholder="Search friends"
              className="field h-10 pl-10 pr-9 text-[15px]"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-tile-line px-1.5 font-board text-[11px] text-ink-faint lg:block">
              /
            </kbd>
          </label>
          <Link to="/add" className="icon-btn relative bg-tile text-ink" aria-label="Add friends">
            <UserPlusIcon className="size-[18px]" />
            {incoming.length > 0 && <span className="lamp absolute right-1.5 top-1.5 bg-signal" />}
          </Link>
        </div>
      </header>

      {incoming.length > 0 && (
        <Link
          to="/add"
          className="mx-4 mb-2 flex items-center justify-between rounded-[10px] bg-signal px-4 py-2.5 text-signal-ink transition-transform duration-150 ease-out active:scale-[0.98] sm:mx-5"
        >
          <span className="font-board text-[15px] font-bold uppercase tracking-[0.06em]">
            {incoming.length} friend {incoming.length === 1 ? "request" : "requests"}
          </span>
          <span className="font-board text-[13px] font-bold uppercase tracking-[0.08em]">Review</span>
        </Link>
      )}

      <NotifyPrompt />

      {circleInvites.map((circle) => (
        <Link
          key={circle._id}
          to={`/g/${circle._id}`}
          className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-[10px] border border-signal/50 px-4 py-2.5 transition-transform duration-150 ease-out active:scale-[0.98] sm:mx-5"
        >
          <span className="min-w-0 truncate text-[14px]">
            <span className="text-ink-muted">{circle.invitedBy?.fullName.split(" ")[0] ?? "Someone"} added you to </span>
            <span className="font-semibold text-ink">{circle.name}</span>
          </span>
          <span className="shrink-0 font-board text-[13px] font-bold uppercase tracking-[0.08em] text-signal">Review</span>
        </Link>
      ))}

      <nav className="min-h-0 flex-1 overflow-y-auto pb-3" aria-label="Circles and friends">
        <div className="flex shrink-0 items-center justify-between px-6 pb-1 pt-1 sm:px-7">
          <span className="label text-[11px] text-ink-faint">Glass circles</span>
          <Link to="/circles/new" className="label inline-flex items-center gap-1 text-[11px] text-signal hover:text-ink">
            <PlusIcon className="size-3" strokeWidth={3} /> New
          </Link>
        </div>
        {joinedCircles.length > 0 ? (
          <ul className="mb-3 space-y-0.5 px-2">
            {joinedCircles.map((circle) => (
              <CircleRow key={circle._id} circle={circle} me={authUser._id} typing={circleTyping(circle)} />
            ))}
          </ul>
        ) : (
          !q && (
            <Link
              to="/circles/new"
              className="mx-4 mb-4 block rounded-[12px] border border-dashed border-tile-line px-4 py-3 text-[13px] leading-snug text-ink-muted transition-colors hover:border-signal/60 hover:text-ink sm:mx-5"
            >
              Start a Glass circle with your closest people: everyone sees who read, who swiped away, and who’s around but quiet.
            </Link>
          )
        )}

        <div className="flex shrink-0 justify-between px-6 pb-1.5 sm:px-7">
          <span className="label text-[11px] text-ink-faint">Friends</span>
          <span className="label text-[11px] text-ink-faint">Last</span>
        </div>
        {status === "loading" || status === "idle" ? (
          <SkeletonRows />
        ) : friends.length === 0 ? (
          <EmptyBoard />
        ) : visible.length === 0 ? (
          <p className="px-6 py-10 text-center text-[15px] text-ink-muted">
            No friend matches “{query}”.{" "}
            <Link to={`/add?q=${encodeURIComponent(query.replace(/^@/, ""))}`} className="text-signal">
              Find @{query.replace(/^@/, "")}
            </Link>
          </p>
        ) : (
          <ul className="space-y-0.5 px-2">
            {visible.map((friend) => (
              <FriendRow
                key={friend._id}
                friend={friend}
                online={online.has(friend._id)}
                typing={typing.has(typingKey(friend._id))}
              />
            ))}
          </ul>
        )}
      </nav>

      <footer className="flex shrink-0 items-center gap-3 border-t border-tile-edge px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5">
        <Avatar user={authUser} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-5">{authUser.fullName}</p>
          <p className="label flex items-center gap-1.5 text-[11px]">
            <span className={`lamp ${conn.lamp}`} />
            {conn.text}
          </p>
        </div>
        <Link to="/settings" className="icon-btn" aria-label="Settings">
          <SettingsIcon className="size-[18px]" />
        </Link>
      </footer>
    </>
  );
}
