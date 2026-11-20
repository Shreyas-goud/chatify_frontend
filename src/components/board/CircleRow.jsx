import { NavLink } from "react-router";
import { m } from "motion/react";
import { EyeIcon } from "lucide-react";
import Avatar from "../ui/Avatar";
import TypingDots from "../ui/TypingDots";
import { attentionOf } from "../../lib/attention";
import { boardTime } from "../../lib/time";

const MotionLi = m.li;

// A Glass circle on the board. Its status says what the circle is doing with your last message.
export default function CircleRow({ circle, me, typing }) {
  const last = circle.lastMessage;
  const others = circle.members.filter((member) => member._id !== me && member.status === "joined");
  const sender = last && circle.members.find((member) => member._id === last.senderId);
  const preview = last
    ? `${last.fromMe ? "You" : (sender?.fullName.split(" ")[0] ?? "Someone")}: ${last.text || (last.hasImage ? "Photo" : "")}`
    : others.length === 0
      ? "Waiting for people to join"
      : "Nobody’s said anything yet";

  let status = null;
  if (typing) status = <span className="label shrink-0 text-[12px] text-signal">Typing</span>;
  else if (circle.unread > 0) {
    status = (
      <span className="grid h-[22px] min-w-[22px] shrink-0 place-items-center rounded-[6px] bg-signal px-1.5 font-board text-[14px] font-bold leading-none text-signal-ink tabular">
        {circle.unread > 99 ? "99+" : circle.unread}
      </span>
    );
  } else if (last?.fromMe && others.length) {
    const states = others.map((member) => attentionOf(member, last).state);
    const ignoring = states.filter((s) => s === "ignored" || s === "dismissed").length;
    const seen = states.filter((s) => s === "seen").length;
    status = ignoring ? (
      <span className="label shrink-0 text-[12px] text-stop">{ignoring} ignoring</span>
    ) : seen === others.length ? (
      <span className="label shrink-0 text-[12px] text-go">Seen by all</span>
    ) : (
      <span className="label shrink-0 text-[12px]">Seen {seen}/{others.length}</span>
    );
  }

  return (
    <MotionLi layout="position" transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
      <NavLink
        to={`/g/${circle._id}`}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-colors duration-150 ease-out active:bg-tile ${
            isActive ? "bg-tile" : "hover:bg-board-rail"
          }`
        }
      >
        <span className="relative">
          <Avatar user={{ fullName: circle.name }} size={46} />
          <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-signal text-signal-ink ring-2 ring-board">
            <EyeIcon className="size-3" strokeWidth={2.75} />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="board-name truncate text-[19px] leading-6">{circle.name}</span>
            <span className="label shrink-0 text-[12px] tabular">{boardTime(circle.lastMessageAt ?? circle.createdAt)}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3">
            <span className={`truncate text-[14px] leading-5 ${circle.unread > 0 ? "font-medium text-ink" : "text-ink-muted"}`}>
              {typing ? <TypingDots /> : preview}
            </span>
            {status}
          </div>
        </div>
      </NavLink>
    </MotionLi>
  );
}
