import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeftIcon, EyeIcon, EyeOffIcon, ImageIcon, LoaderIcon, LogOutIcon, MoreHorizontalIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useCircleStore } from "../store/useCircleStore";
import { typingKey, usePresenceStore } from "../store/usePresenceStore";
import { emitTyping } from "../lib/socket";
import { fullDate } from "../lib/time";
import Avatar from "../components/ui/Avatar";
import FlapText from "../components/ui/FlapText";
import MessageList from "../components/chat/MessageList";
import Composer from "../components/chat/Composer";
import Lightbox from "../components/chat/Lightbox";
import PageHeader from "../components/PageHeader";
import { AttentionLine, AttentionSheet, GlassBadge, MemberStrip, NudgeRow } from "../components/circle/GlassParts";
import { firstName } from "../lib/names";

const idle = { items: [], nudges: [], hasMore: false, status: "idle", loadingOlder: false };
const isTextField = (el) => el?.closest?.("input, textarea");

const SHARED = [
  "When a message reaches your phone or computer",
  "When its notification is shown, and if you swipe it away",
  "When you’re on Chatify, and when you were last on",
  "When you read the circle",
  "Whether you open or dismiss a nudge",
];
const NOT_SHARED = ["Other apps you use", "Where you are", "What you type before sending"];

// Joining is consent, so the invitation says exactly what the circle will see.
function GlassConsent({ circle }) {
  const joinCircle = useCircleStore((s) => s.joinCircle);
  const leaveCircle = useCircleStore((s) => s.leaveCircle);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const joined = circle.members.filter((m) => m.status === "joined");

  return (
    <>
      <PageHeader title={circle.name} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[520px] px-5 py-10 pb-[max(40px,env(safe-area-inset-bottom))]">
          <FlapText text="GLASS" reveal tone="signal" className="text-[40px]" />
          <h2 className="board-name mt-6 text-[30px] leading-tight">
            {circle.invitedBy ? `${firstName(circle.invitedBy)} added you to ${circle.name}` : circle.name}
          </h2>
          <div className="mt-4 flex -space-x-2">
            {circle.members.map((m) => (
              <Avatar key={m._id} user={m} size={36} className="rounded-[10px] ring-2 ring-board-deep" />
            ))}
          </div>
          <p className="mt-3 text-[14px] text-ink-muted">
            {joined.map((m) => m.fullName).join(", ")} {joined.length === 1 ? "is" : "are"} in. It’s a Glass circle: nobody
            can quietly ignore anybody.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <section>
              <h3 className="label flex items-center gap-1.5 text-signal">
                <EyeIcon className="size-3.5" /> Everyone here sees
              </h3>
              <ul className="mt-3 space-y-2 text-[14px] text-ink">
                {SHARED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3 className="label flex items-center gap-1.5">
                <EyeOffIcon className="size-3.5" /> Never
              </h3>
              <ul className="mt-3 space-y-2 text-[14px] text-ink-muted">
                {NOT_SHARED.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          </div>
          <p className="mt-6 text-[13px] text-ink-faint">It works both ways: you see the same about them. Leave any time.</p>

          <div className="mt-8 grid gap-2.5 sm:grid-cols-2">
            <button
              className="btn-primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (!(await joinCircle(circle._id))) setBusy(false);
              }}
            >
              {busy ? <LoaderIcon className="size-5 animate-spin" /> : "Join with Glass"}
            </button>
            <button
              className="btn-quiet"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (await leaveCircle(circle._id)) navigate("/", { replace: true });
                else setBusy(false);
              }}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function CircleMenu({ circle }) {
  const [open, setOpen] = useState(false);
  const leaveCircle = useCircleStore((s) => s.leaveCircle);
  const navigate = useNavigate();
  const root = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && root.current?.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button className="icon-btn" aria-label="Circle options" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <MoreHorizontalIcon className="size-5" />
      </button>
      {open && (
        <div className="menu-enter absolute right-0 top-12 z-20 w-[290px] origin-top-right rounded-[12px] border border-tile-line bg-board p-4 shadow-[0_18px_40px_rgba(0,0,0,0.5)]">
          <p className="label text-signal">Everyone here sees</p>
          <ul className="mt-2 space-y-1 text-[13px] text-ink-muted">
            {SHARED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-ink-faint">Started {fullDate(circle.createdAt)}</p>
          <button
            className="mt-4 flex w-full items-center gap-3 rounded-[8px] px-3 py-2.5 text-left text-[14px] text-stop hover:bg-tile"
            onClick={async () => {
              if (await leaveCircle(circle._id)) navigate("/", { replace: true });
            }}
          >
            <LogOutIcon className="size-4" /> Leave circle
          </button>
        </div>
      )}
    </div>
  );
}

function CircleChat({ circle }) {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.authUser);
  const me = authUser._id;
  const thread = useCircleStore((s) => s.threads[circle._id]) ?? idle;
  const openCircle = useCircleStore((s) => s.openCircle);
  const closeCircle = useCircleStore((s) => s.closeCircle);
  const markRead = useCircleStore((s) => s.markRead);
  const loadOlder = useCircleStore((s) => s.loadOlder);
  const loadLatest = useCircleStore((s) => s.loadLatest);
  const retry = useCircleStore((s) => s.retry);
  const sendMessage = useCircleStore((s) => s.sendMessage);
  const nudge = useCircleStore((s) => s.nudge);
  const typing = usePresenceStore((s) => s.typing);
  const [lightbox, setLightbox] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [nudging, setNudging] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const dragDepth = useRef(0);

  const people = useMemo(() => new Map(circle.members.map((m) => [m._id, m])), [circle.members]);
  const typingUsers = useMemo(
    () => circle.members.filter((m) => m._id !== me && typing.has(typingKey(m._id, circle._id))),
    [circle.members, circle._id, typing, me]
  );
  const latest = [...thread.items].reverse().find((m) => !m.status);
  const onLoadOlder = useCallback(() => loadOlder(circle._id), [loadOlder, circle._id]);
  const onDropTaken = useCallback(() => setDroppedFile(null), []);

  useEffect(() => {
    openCircle(circle._id);
    return () => closeCircle(circle._id);
  }, [circle._id, openCircle, closeCircle]);

  useEffect(() => {
    if (thread.status !== "ready") return;
    const read = () => document.visibilityState === "visible" && markRead(circle._id);
    read();
    document.addEventListener("visibilitychange", read);
    window.addEventListener("focus", read);
    return () => {
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("focus", read);
    };
  }, [thread.status, circle._id, circle.unread, markRead]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape" || lightbox || sheet) return;
      if (isTextField(event.target) && event.target.value) return;
      if (document.querySelector("[role='dialog'], [role='alertdialog']")) return;
      navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, sheet, navigate]);

  const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes("Files");

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => hasFiles(e) && e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        setDroppedFile(e.dataTransfer.files[0] ?? null);
      }}
    >
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-tile-edge bg-board px-3 sm:px-5">
        <Link to="/" className="icon-btn -ml-1 lg:hidden" aria-label="Back to board">
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="board-name truncate text-[22px] leading-6">{circle.name}</h1>
            <GlassBadge />
          </div>
          <p className="label truncate text-[12px] normal-case tracking-normal">
            {circle.members.map((m) => (m._id === me ? "You" : firstName(m))).join(", ")}
          </p>
        </div>
        <CircleMenu circle={circle} />
      </header>

      <MemberStrip
        members={circle.members}
        me={me}
        latest={latest}
        nudging={nudging}
        onNudge={async (member) => {
          setNudging(member._id);
          await nudge(circle._id, member);
          setNudging(null);
        }}
      />

      <MessageList
        conversation={thread}
        people={people}
        showNames
        receipts={false}
        typingUsers={typingUsers}
        events={thread.nudges}
        renderEvent={(event) => <NudgeRow nudge={event} people={people} me={me} />}
        after={latest && <AttentionLine members={circle.members} me={me} latest={latest} onOpen={() => setSheet(true)} />}
        onOpenImage={setLightbox}
        onLoadOlder={onLoadOlder}
        onReload={() => loadLatest(circle._id)}
        onRetry={(clientId) => retry(circle._id, clientId)}
        beginning={<p className="label mb-6 text-center text-[11px] text-ink-faint">Circle started {fullDate(circle.createdAt)}</p>}
        empty={
          <div className="my-auto flex flex-col items-center py-14 text-center">
            <FlapText text={circle.name.slice(0, 14)} reveal className="text-[clamp(22px,3.4vw,34px)]" />
            <p className="mt-6 max-w-[36ch] text-ink-muted">
              Say something. In a Glass circle you’ll see who read it, who swiped it away, and who’s around but quiet.
            </p>
          </div>
        }
      />

      <Composer
        draftKey={`circle-${circle._id}`}
        name={circle.name}
        onSend={(message) => sendMessage(circle._id, message)}
        onTyping={(on) => emitTyping(null, on, circle._id)}
        droppedFile={droppedFile}
        onDropTaken={onDropTaken}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-[18px] border-2 border-dashed border-signal bg-board-deep/85">
          <p className="flex items-center gap-3 font-board text-[22px] font-bold uppercase tracking-[0.06em] text-signal">
            <ImageIcon className="size-6" /> Drop to send to {circle.name}
          </p>
        </div>
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {sheet && latest && <AttentionSheet members={circle.members} me={me} latest={latest} onClose={() => setSheet(false)} />}
    </div>
  );
}

export default function CirclePage() {
  const { id } = useParams();
  const status = useCircleStore((s) => s.status);
  const circle = useCircleStore((s) => s.circles.find((c) => c._id === id));

  if (!circle && status !== "ready") {
    return (
      <div className="grid flex-1 place-items-center">
        <LoaderIcon className="size-6 animate-spin text-ink-faint" />
      </div>
    );
  }
  if (!circle) {
    return (
      <>
        <PageHeader title="Circle" />
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <p className="text-ink-muted">This circle is gone, or you’re not in it.</p>
            <Link to="/" className="btn-quiet mt-6">
              Back to the board
            </Link>
          </div>
        </div>
      </>
    );
  }
  if (circle.myStatus !== "joined") return <GlassConsent circle={circle} />;
  return <CircleChat key={circle._id} circle={circle} />;
}
