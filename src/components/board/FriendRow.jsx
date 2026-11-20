import { NavLink } from "react-router";
import { m } from "motion/react";
import Avatar from "../ui/Avatar";
import TypingDots from "../ui/TypingDots";
import { boardTime, daysAgo } from "../../lib/time";

const QUIET_AFTER_DAYS = 7;
const MotionLi = m.li;

function previewText(friend) {
  const last = friend.lastMessage;
  if (!last) return "You’re friends now. Say hi.";
  const body = last.text || (last.hasImage ? "Photo" : "");
  return last.fromMe ? `You: ${body}` : body;
}

function Status({ friend, typing, quietDays }) {
  if (typing) return <span className="label shrink-0 text-[12px] text-signal">Typing</span>;
  if (friend.unread > 0) {
    return (
      <span className="grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-[6px] bg-signal px-1.5 font-board text-[14px] font-bold leading-none text-signal-ink tabular">
        {friend.unread > 99 ? "99+" : friend.unread}
      </span>
    );
  }
  if (quietDays >= QUIET_AFTER_DAYS) {
    return <span className="label shrink-0 text-[12px] text-ink-faint">Quiet {quietDays}d</span>;
  }
  if (friend.lastMessage?.fromMe) {
    return (
      <span className="label shrink-0 text-[12px]">{friend.lastMessage.readAt ? "Seen" : "Sent"}</span>
    );
  }
  return null;
}

// One timetable line: who, what they last said, when, and where things stand.
// Friends you haven't talked to in a week fade, like a line nobody runs any more.
export default function FriendRow({ friend, online, typing }) {
  const quietDays = daysAgo(friend.lastActivityAt);
  const quiet = !typing && friend.unread === 0 && quietDays >= QUIET_AFTER_DAYS;

  return (
    <MotionLi layout="position" transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
      <NavLink
        to={`/c/${friend.username}`}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-[background-color,opacity] duration-150 ease-out active:bg-tile ${
            isActive ? "bg-tile" : "hover:bg-board-rail"
          } ${quiet ? "opacity-[0.55] hover:opacity-100" : ""}`
        }
      >
        <Avatar user={friend} size={46} online={online} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="board-name truncate text-[19px] leading-6">{friend.fullName}</span>
            <span className="label shrink-0 text-[12px] tabular">{boardTime(friend.lastActivityAt)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <span
              className={`truncate text-[14px] leading-5 ${
                friend.unread > 0 ? "font-medium text-ink" : "text-ink-muted"
              }`}
            >
              {typing ? <TypingDots /> : previewText(friend)}
            </span>
            <Status friend={friend} typing={typing} quietDays={quietDays} />
          </div>
        </div>
      </NavLink>
    </MotionLi>
  );
}
