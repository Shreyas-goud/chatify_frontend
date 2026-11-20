import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useChatStore } from "../store/useChatStore";
import { useCircleStore } from "../store/useCircleStore";
import { usePresenceStore } from "../store/usePresenceStore";
import Avatar from "./ui/Avatar";

// Ctrl/⌘+K: jump to any friend from the keyboard. Opens instantly, without animation,
// because it is used many times a day.
export default function QuickSwitcher() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const friends = useChatStore((s) => s.friends);
  const circles = useCircleStore((s) => s.circles);
  const online = usePresenceStore((s) => s.online);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActive(0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Circles and friends together; each result carries where it goes.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    const everything = [
      ...circles
        .filter((c) => c.myStatus === "joined")
        .map((c) => ({ _id: c._id, fullName: c.name, sub: "Glass circle", to: `/g/${c._id}` })),
      ...friends.map((f) => ({ ...f, sub: `@${f.username}`, to: `/c/${f.username}` })),
    ];
    const list = q
      ? everything.filter((r) => r.fullName.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q))
      : everything;
    return list.slice(0, 8);
  }, [friends, circles, query]);

  if (!open) return null;

  const go = (friend) => {
    setOpen(false);
    navigate(friend.to);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      go(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[14vh]"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a friend"
        className="w-full max-w-[520px] overflow-hidden rounded-[14px] border border-tile-line bg-board shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a friend or circle…"
          aria-controls="switcher-results"
          aria-activedescendant={results[active] ? `switch-${results[active]._id}` : undefined}
          className="h-14 w-full border-b border-tile-edge px-5 text-[17px] outline-none"
        />
        <ul id="switcher-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-ink-muted">Nothing by that name.</li>}
          {results.map((friend, i) => (
            <li
              key={friend._id}
              id={`switch-${friend._id}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(friend)}
              className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 ${i === active ? "bg-tile" : ""}`}
            >
              <Avatar user={friend} size={34} online={online.has(friend._id)} />
              <span className="board-name truncate text-[17px]">{friend.fullName}</span>
              <span className="truncate text-[13px] text-ink-faint">{friend.sub}</span>
            </li>
          ))}
        </ul>
        <p className="label border-t border-tile-edge px-5 py-2.5 text-[11px] text-ink-faint">
          ↑ ↓ move · Enter open · Esc close
        </p>
      </div>
    </div>
  );
}
