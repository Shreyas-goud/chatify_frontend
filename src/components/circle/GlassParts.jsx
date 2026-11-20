import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BellRingIcon, EyeIcon, XIcon } from "lucide-react";
import Avatar from "../ui/Avatar";
import { attentionOf, liveStateOf, nudgeStatusOf } from "../../lib/attention";
import { boardTime, clock } from "../../lib/time";
import { firstName } from "../../lib/names";

const TONES = {
  go: "text-go",
  stop: "text-stop",
  signal: "text-signal",
  muted: "text-ink-muted",
  faint: "text-ink-faint",
};


// Always on screen in a circle: everyone here agreed to be seen.
export function GlassBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[5px] border border-signal/60 px-1.5 py-px font-board text-[11px] font-bold uppercase tracking-[0.1em] text-signal ${className}`}
    >
      <EyeIcon className="size-3" strokeWidth={2.5} /> Glass
    </span>
  );
}

// Who's here right now, and a Nudge for anyone who hasn't seen the latest message.
export function MemberStrip({ members, me, latest, onNudge, nudging }) {
  const others = members.filter((m) => m._id !== me && m.status === "joined");
  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-tile-edge bg-board px-3 py-2.5 sm:px-5" role="list" aria-label="Circle members">
      {others.map((member) => {
        const live = liveStateOf(member);
        const attention = latest && latest.senderId !== member._id ? attentionOf(member, latest) : null;
        const canNudge = attention && attention.state !== "seen";
        return (
          <div key={member._id} role="listitem" className="flex shrink-0 items-center gap-2.5 rounded-[12px] bg-board-rail py-1.5 pl-1.5 pr-2">
            <span className="relative">
              <Avatar user={member} size={32} />
              {live.lamp && <span className={`lamp absolute -bottom-0.5 -right-0.5 size-2.5 ${live.lamp}`} />}
            </span>
            <span className="min-w-0">
              <span className="block max-w-[110px] truncate text-[13px] font-semibold leading-4">{firstName(member)}</span>
              <span className={`label block text-[10px] ${TONES[live.tone]}`}>
                {live.label}
                {live.at ? ` ${boardTime(live.at)}` : ""}
              </span>
            </span>
            {canNudge && (
              <button
                type="button"
                onClick={() => onNudge(member)}
                disabled={nudging === member._id}
                className="ml-1 grid size-8 place-items-center rounded-[8px] bg-signal text-signal-ink transition-transform duration-150 ease-out active:scale-[0.94] disabled:opacity-50"
                aria-label={`Nudge ${firstName(member)}`}
                title={`Nudge ${firstName(member)}`}
              >
                <BellRingIcon className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Under the newest message: what became of it for each member. Tapping opens the full timeline.
export function AttentionLine({ members, me, latest, onOpen }) {
  const others = members.filter((m) => m._id !== latest.senderId && m.status === "joined");
  if (others.length === 0) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-2 flex max-w-full flex-wrap gap-1.5 rounded-[10px] px-1 py-1 text-left transition-colors hover:bg-board ${
        latest.senderId === me ? "self-end justify-end" : "self-start"
      }`}
      aria-label="What happened to this message, per person"
    >
      {others.map((member) => {
        const attention = attentionOf(member, latest);
        return (
          <span key={member._id} className="label inline-flex items-center gap-1 rounded-[6px] bg-board px-2 py-1 text-[11px]">
            <span className="text-ink">{member._id === me ? "You" : firstName(member)}</span>
            <span className={TONES[attention.tone]}>
              {attention.label}
              {attention.state === "seen" ? ` ${clock(attention.at)}` : ""}
            </span>
          </span>
        );
      })}
    </button>
  );
}

const STEP_LABELS = {
  delivered: "Reached their device",
  notified: "Notification shown",
  dismissed: "Notification swiped away",
  active: "On Chatify, not in this circle",
  seen: "Seen",
};

export function AttentionSheet({ members, me, latest, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const others = members.filter((m) => m._id !== latest.senderId && m.status === "joined");
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Message timeline"
        onClick={(e) => e.stopPropagation()}
        className="menu-enter max-h-[80dvh] w-full max-w-[460px] overflow-y-auto rounded-t-[18px] border border-tile-line bg-board p-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:rounded-[18px]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">Sent {clock(latest.createdAt)}</p>
            <p className="mt-1 line-clamp-2 text-[15px] text-ink">{latest.text || "Photo"}</p>
          </div>
          <button className="icon-btn -mr-2 -mt-1" onClick={onClose} aria-label="Close" autoFocus>
            <XIcon className="size-5" />
          </button>
        </div>
        <ul className="mt-5 space-y-5">
          {others.map((member) => {
            const attention = attentionOf(member, latest);
            return (
              <li key={member._id}>
                <div className="flex items-center gap-3">
                  <Avatar user={member} size={34} />
                  <span className="board-name flex-1 text-[17px]">{member._id === me ? "You" : member.fullName}</span>
                  <span className={`label text-[11px] ${TONES[attention.tone]}`}>{attention.label}</span>
                </div>
                <ol className="ml-[17px] mt-2 space-y-1.5 border-l border-tile-line pl-5">
                  {attention.timeline.length === 0 && <li className="text-[13px] text-ink-faint">Nothing yet</li>}
                  {attention.timeline.map((step) => (
                    <li key={step.kind} className="flex justify-between gap-3 text-[13px]">
                      <span className={step.kind === "dismissed" ? "text-stop" : "text-ink-muted"}>{STEP_LABELS[step.kind]}</span>
                      <span className="label tabular text-[11px]">{step.kind === "active" && member.active ? "Now" : clock(step.at)}</span>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-[12px] leading-relaxed text-ink-faint">
          Everyone in a Glass circle sees this about everyone, you included. Chatify can’t see other apps.
        </p>
      </div>
    </div>,
    document.body
  );
}

// A nudge in the thread: who nudged whom, and what came of it.
export function NudgeRow({ nudge, people, me }) {
  const from = people.get(nudge.from);
  const to = people.get(nudge.to);
  const status = nudgeStatusOf(nudge, to);
  return (
    <div className="my-4 flex justify-center">
      <span className="label inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-[8px] border border-tile-line px-3 py-1.5 text-center text-[11px]">
        <BellRingIcon className="size-3 text-signal" />
        <span className="text-ink">
          {nudge.from === me ? "You" : firstName(from)} nudged {nudge.to === me ? "you" : firstName(to)}
        </span>
        <span>{clock(nudge.createdAt)}</span>
        <span aria-hidden="true">·</span>
        <span className={TONES[status.tone]}>
          {status.label}
          {nudge.outcomeAt ? ` ${clock(nudge.outcomeAt)}` : ""}
        </span>
      </span>
    </div>
  );
}

// A nudge for me while Chatify is on screen. It stays until answered; both answers are shared.
export function NudgePopup({ nudge, onAnswer }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onAnswer("dismissed");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnswer]);

  return createPortal(
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-5">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="nudge-title"
        className="nudge-enter w-full max-w-[400px] rounded-[18px] border border-signal/50 bg-board p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        <Avatar user={nudge.fromUser} size={64} className="mx-auto" />
        <p className="label mt-5 text-signal">Nudge · {nudge.circleName}</p>
        <h2 id="nudge-title" className="board-name mt-2 text-[28px] leading-tight">
          {firstName(nudge.fromUser)} is waiting for you
        </h2>
        {nudge.preview && <p className="mx-auto mt-3 line-clamp-3 max-w-[32ch] text-[15px] text-ink-muted">“{nudge.preview}”</p>}
        <div className="mt-7 grid gap-2.5">
          <button
            className="btn-primary w-full"
            autoFocus
            disabled={leaving}
            onClick={() => {
              setLeaving(true);
              onAnswer("opened");
            }}
          >
            Reply now
          </button>
          <button className="btn-quiet w-full" disabled={leaving} onClick={() => onAnswer("dismissed")}>
            Not now
          </button>
        </div>
        <p className="mt-4 text-[12px] text-ink-faint">The circle sees which one you pick.</p>
      </div>
    </div>,
    document.body
  );
}
