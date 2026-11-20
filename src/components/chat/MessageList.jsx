import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDownIcon, LoaderIcon, RotateCwIcon } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { clock, dayLabel, sameDay } from "../../lib/time";
import Avatar from "../ui/Avatar";
import TypingDots from "../ui/TypingDots";

const GROUP_GAP_MS = 5 * 60 * 1000;
const PINNED_PX = 140;
const keyOf = (m) => m.clientId ?? m._id;
const NONE = [];
const URL_PATTERN = /(https?:\/\/[^\s<]+[^\s<.,:;"')\]!?])/g;

// Day separators; runs of messages from one person within five minutes become one group;
// events (nudges) sit between messages at their time.
function toRows(items, events) {
  const timeline = [
    ...items.map((message) => ({ kind: "message", at: message.createdAt, message })),
    ...events.map((event) => ({ kind: "event", at: event.createdAt, event })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));

  const rows = [];
  let prevAt = null;
  let prevMessage = null;
  for (const entry of timeline) {
    if (!prevAt || !sameDay(prevAt, entry.at)) {
      rows.push({ type: "day", key: `day-${entry.at}`, label: dayLabel(entry.at) });
      prevMessage = null;
    }
    prevAt = entry.at;
    if (entry.kind === "event") {
      rows.push({ type: "event", key: `event-${entry.event._id}`, event: entry.event });
      prevMessage = null;
      continue;
    }
    const message = entry.message;
    const continues =
      prevMessage &&
      prevMessage.senderId === message.senderId &&
      new Date(message.createdAt) - new Date(prevMessage.createdAt) < GROUP_GAP_MS;
    if (continues) rows.at(-1).messages.push(message);
    else rows.push({ type: "group", key: `g-${keyOf(message)}`, senderId: message.senderId, messages: [message] });
    prevMessage = message;
  }
  return rows;
}

function Linkified({ text, mine }) {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline underline-offset-2 ${mine ? "decoration-signal-ink/50" : "text-signal decoration-signal/40"}`}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

function Bubble({ message, mine, first, last, onOpenImage }) {
  const corners = mine
    ? `${first ? "" : "rounded-tr-[6px]"} ${last ? "" : "rounded-br-[6px]"}`
    : `${first ? "" : "rounded-tl-[6px]"} ${last ? "" : "rounded-bl-[6px]"}`;
  return (
    <div
      className={`${message.live ? (mine ? "msg-enter-mine" : "msg-enter") : ""} ${
        message.image ? "max-w-[min(82%,340px)]" : "max-w-[min(82%,560px)]"
      } overflow-hidden rounded-[18px] ${corners} ${mine ? "bg-signal text-signal-ink" : "bg-tile text-ink"} ${
        message.status === "failed" ? "opacity-60" : ""
      }`}
    >
      {message.image && (
        <button type="button" className="block w-full" onClick={() => onOpenImage(message.image)} aria-label="Open photo">
          <img src={message.image} alt="Photo" loading="lazy" className="max-h-[340px] w-full min-w-[160px] bg-tile-hi object-cover" />
        </button>
      )}
      {message.text && (
        <p className="whitespace-pre-wrap break-words px-3.5 py-2 text-[15.5px] leading-[1.42]">
          <Linkified text={message.text} mine={mine} />
        </p>
      )}
    </div>
  );
}

function Receipt({ message, onRetry }) {
  if (message.status === "sending") return <span>Sending…</span>;
  if (message.status === "failed") {
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 text-stop">
        <RotateCwIcon className="size-3" /> Not sent · retry
      </button>
    );
  }
  return <span>{message.readAt ? `Seen ${clock(message.readAt)}` : "Sent"}</span>;
}

// A conversation's messages, shared by 1:1 chats and Glass circles.
//   people: Map(id → user) for avatars and names; showNames: label each group (circles)
//   receipts: SENT/SEEN under my latest message (1:1); circles show attention instead
//   events + renderEvent: things that happen between messages (nudges)
//   beginning/empty/after: what to show at the top, when there's nothing, and after the last row
export default function MessageList({
  conversation,
  people,
  showNames = false,
  receipts = true,
  typingUsers = NONE,
  events = NONE,
  renderEvent,
  beginning,
  empty,
  after,
  onOpenImage,
  onLoadOlder,
  onReload,
  onRetry,
}) {
  const me = useAuthStore((s) => s.authUser._id);
  const { items, status, hasMore, loadingOlder } = conversation;

  const scroller = useRef(null);
  const content = useRef(null);
  const topSentinel = useRef(null);
  const pinned = useRef(true);
  const previous = useRef({ first: null, last: null, height: 0 });
  const [showJump, setShowJump] = useState(false);

  const rows = useMemo(() => toRows(items, events), [items, events]);
  const lastMine = useMemo(() => [...items].reverse().find((m) => m.senderId === me), [items, me]);

  const onScroll = () => {
    const el = scroller.current;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < PINNED_PX;
    if (pinned.current) setShowJump(false);
  };

  // Older pages keep the reader's place; new messages follow the reader only if they were at
  // the bottom (or sent them), otherwise a "new messages" button appears.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const first = items[0] ? keyOf(items[0]) : null;
    const lastItem = items.at(-1);
    const last = lastItem ? keyOf(lastItem) : null;
    const before = previous.current;
    if (before.first && first !== before.first && last === before.last) {
      el.scrollTop += el.scrollHeight - before.height;
    } else if (last && last !== before.last) {
      if (!before.last || pinned.current || lastItem.senderId === me) {
        el.scrollTop = el.scrollHeight;
        pinned.current = true;
      } else {
        setShowJump(true);
      }
    }
    previous.current = { first, last, height: el.scrollHeight };
  }, [items, me]);

  // Photos, typing tiles and events change the height after render; stay at the bottom if pinned.
  useEffect(() => {
    if (!content.current) return;
    const observer = new ResizeObserver(() => {
      const el = scroller.current;
      if (!el) return;
      if (pinned.current) el.scrollTop = el.scrollHeight;
      previous.current.height = el.scrollHeight;
    });
    observer.observe(content.current);
    return () => observer.disconnect();
  }, [status]);

  // Reaching the top loads the page before.
  useEffect(() => {
    const target = topSentinel.current;
    if (!target || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onLoadOlder(), {
      root: scroller.current,
      rootMargin: "240px 0px 0px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, onLoadOlder]);

  if (status === "loading" || status === "idle") {
    return (
      <div className="flex flex-1 flex-col justify-end gap-3 px-4 pb-6 sm:px-8" aria-label="Loading messages">
        {[["w-48", "self-start"], ["w-64", "self-end"], ["w-40", "self-start"], ["w-56", "self-end"]].map(([width, side], i) => (
          <span key={i} className={`h-10 ${width} ${side} rounded-[18px] bg-tile/70`} />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div>
          <p className="text-ink-muted">These messages didn’t load.</p>
          <button className="btn-quiet mt-4" onClick={onReload}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scroller} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain">
        <div ref={content} className="mx-auto flex min-h-full max-w-[860px] flex-col justify-end px-3 pb-4 pt-6 sm:px-8">
          <div ref={topSentinel} />
          {loadingOlder && <LoaderIcon className="mx-auto mb-4 size-5 animate-spin text-ink-faint" />}
          {!hasMore && items.length > 0 && beginning}
          {items.length === 0 && events.length === 0 && empty}

          {rows.map((row) => {
            if (row.type === "day") {
              return (
                <div key={row.key} className="my-5 flex justify-center">
                  <span className="label rounded-[6px] bg-board px-2.5 py-1 text-[11px]">{row.label}</span>
                </div>
              );
            }
            if (row.type === "event") return <div key={row.key}>{renderEvent?.(row.event)}</div>;

            const mine = row.senderId === me;
            const sender = people.get(row.senderId);
            const lastOfGroup = row.messages.at(-1);
            const showReceipt = receipts && mine && lastMine && row.messages.includes(lastMine);
            return (
              <div key={row.key} className={`mt-3 flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                {!mine && <Avatar user={sender} size={28} className="mb-6 hidden sm:inline-block" />}
                <div className={`flex min-w-0 flex-1 flex-col gap-[3px] ${mine ? "items-end" : "items-start"}`}>
                  {showNames && !mine && (
                    <span className="label mb-0.5 px-1 text-[11px] text-ink-muted">{sender?.fullName ?? "Someone"}</span>
                  )}
                  {row.messages.map((message, i) => (
                    <Bubble
                      key={keyOf(message)}
                      message={message}
                      mine={mine}
                      first={i === 0}
                      last={i === row.messages.length - 1}
                      onOpenImage={onOpenImage}
                    />
                  ))}
                  {row.messages
                    .filter((m) => m.status === "failed" && (!receipts || m !== lastMine))
                    .map((m) => (
                      <p key={`retry-${keyOf(m)}`} className="label px-1 text-[11px]">
                        <Receipt message={m} onRetry={() => onRetry(m.clientId)} />
                      </p>
                    ))}
                  <p className="label mt-1 flex gap-2 px-1 text-[11px] tabular">
                    <span>{lastOfGroup.status === "sending" && !receipts ? "Sending…" : clock(lastOfGroup.createdAt)}</span>
                    {showReceipt && (
                      <>
                        <span aria-hidden="true">·</span>
                        <Receipt message={lastMine} onRetry={() => onRetry(lastMine.clientId)} />
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })}

          {after}

          {typingUsers.length > 0 && (
            <div className="msg-enter mt-3 flex items-end gap-2">
              <Avatar user={typingUsers[0]} size={28} className="hidden sm:inline-block" />
              <span className="flex h-10 items-center gap-2 rounded-[18px] bg-tile px-4">
                <TypingDots />
                {showNames && (
                  <span className="label text-[11px] text-ink-muted">
                    {typingUsers.map((u) => u.fullName.split(" ")[0]).join(", ")}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {showJump && (
        <button
          className="msg-enter absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-signal px-4 py-2 font-board text-[14px] font-bold uppercase tracking-[0.06em] text-signal-ink shadow-[0_8px_24px_rgba(0,0,0,0.4)] active:scale-[0.97]"
          onClick={() => {
            scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
            setShowJump(false);
          }}
        >
          <ArrowDownIcon className="size-4" /> New messages
        </button>
      )}
    </div>
  );
}
