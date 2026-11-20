import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ImageIcon, LoaderIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { typingKey, usePresenceStore } from "../store/usePresenceStore";
import { fullDate } from "../lib/time";
import { emitTyping } from "../lib/socket";
import FlapText from "../components/ui/FlapText";
import ChatHeader from "../components/chat/ChatHeader";
import MessageList from "../components/chat/MessageList";
import Composer from "../components/chat/Composer";
import Lightbox from "../components/chat/Lightbox";
import PageHeader from "../components/PageHeader";

const idle = { items: [], hasMore: false, status: "idle", loadingOlder: false };
const isTextField = (el) => el?.closest?.("input, textarea");

// /c/<username> for someone who isn't a friend (yet).
function NotFriends({ username }) {
  const outgoing = useChatStore((s) => s.outgoing.find((u) => u.username === username));
  const incoming = useChatStore((s) => s.incoming.find((u) => u.username === username));
  const requestFriend = useChatStore((s) => s.requestFriend);
  const acceptFriend = useChatStore((s) => s.acceptFriend);
  const [busy, setBusy] = useState(false);

  const act = async (action) => {
    setBusy(true);
    await action();
    setBusy(false);
  };

  return (
    <>
      <PageHeader title={`@${username}`} />
      <div className="grid flex-1 place-items-center p-8 text-center">
        <div className="max-w-[360px]">
          {outgoing ? (
            <p className="text-ink-muted">Request sent. You can chat once {outgoing.fullName} accepts.</p>
          ) : incoming ? (
            <>
              <p className="text-ink-muted">{incoming.fullName} wants to be friends.</p>
              <button className="btn-primary mt-6" disabled={busy} onClick={() => act(() => acceptFriend(incoming))}>
                Accept
              </button>
            </>
          ) : (
            <>
              <p className="text-ink-muted">You and @{username} aren’t friends on Chatify yet.</p>
              <button className="btn-primary mt-6" disabled={busy} onClick={() => act(() => requestFriend(username))}>
                Add @{username}
              </button>
            </>
          )}
          <Link to="/" className="mt-4 block text-[14px] text-ink-muted hover:text-ink">
            Back to the board
          </Link>
        </div>
      </div>
    </>
  );
}

function Conversation({ friend }) {
  const navigate = useNavigate();
  const openConversation = useChatStore((s) => s.openConversation);
  const closeConversation = useChatStore((s) => s.closeConversation);
  const markRead = useChatStore((s) => s.markRead);
  const loadOlder = useChatStore((s) => s.loadOlder);
  const loadLatest = useChatStore((s) => s.loadLatest);
  const retry = useChatStore((s) => s.retry);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const authUser = useAuthStore((s) => s.authUser);
  const typing = usePresenceStore((s) => s.typing.has(typingKey(friend._id)));
  const conversation = useChatStore((s) => s.conversations[friend._id]) ?? idle;
  const people = useMemo(() => new Map([[friend._id, friend], [authUser._id, authUser]]), [friend, authUser]);
  const onLoadOlder = useCallback(() => loadOlder(friend._id), [loadOlder, friend._id]);
  const [lightbox, setLightbox] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [droppedFile, setDroppedFile] = useState(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    openConversation(friend._id);
    return () => closeConversation(friend._id);
  }, [friend._id, openConversation, closeConversation]);

  // Seen as soon as the messages are on screen, and again whenever the tab comes back.
  useEffect(() => {
    if (conversation.status !== "ready") return;
    const read = () => document.visibilityState === "visible" && markRead(friend._id);
    read();
    document.addEventListener("visibilitychange", read);
    window.addEventListener("focus", read);
    return () => {
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener("focus", read);
    };
  }, [conversation.status, friend._id, friend.unread, markRead]);

  // Esc closes the chat, unless it's busy closing something else or the draft has text.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape" || lightbox || event.defaultPrevented) return;
      if (isTextField(event.target) && event.target.value) return;
      if (document.querySelector("[role='dialog']")) return;
      navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, navigate]);

  const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes("Files");
  const onDropTaken = useCallback(() => setDroppedFile(null), []);

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
      <ChatHeader friend={friend} />
      <MessageList
        conversation={conversation}
        people={people}
        typingUsers={typing ? [friend] : undefined}
        onOpenImage={setLightbox}
        onLoadOlder={onLoadOlder}
        onReload={() => loadLatest(friend._id)}
        onRetry={(clientId) => retry(friend._id, clientId)}
        beginning={
          <p className="label mb-6 text-center text-[11px] text-ink-faint">Friends since {fullDate(friend.friendSince)}</p>
        }
        empty={
          <div className="my-auto flex flex-col items-center py-16 text-center">
            <FlapText text="SAY HELLO" reveal className="text-[clamp(26px,4vw,40px)]" />
            <p className="mt-6 max-w-[34ch] text-ink-muted">
              You and {friend.fullName.split(" ")[0]} became friends on {fullDate(friend.friendSince)}. The first
              message is the hardest; make it a small one.
            </p>
          </div>
        }
      />
      <Composer
        draftKey={friend._id}
        name={friend.fullName.split(" ")[0]}
        onSend={(message) => sendMessage(friend._id, message)}
        onTyping={(on) => emitTyping(friend._id, on)}
        droppedFile={droppedFile}
        onDropTaken={onDropTaken}
      />

      {dragging && (
        <div className="pointer-events-none absolute inset-3 z-30 grid place-items-center rounded-[18px] border-2 border-dashed border-signal bg-board-deep/85">
          <p className="flex items-center gap-3 font-board text-[22px] font-bold uppercase tracking-[0.06em] text-signal">
            <ImageIcon className="size-6" /> Drop to send to {friend.fullName.split(" ")[0]}
          </p>
        </div>
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

export default function ConversationPage() {
  const { username } = useParams();
  const status = useChatStore((s) => s.friendsStatus);
  const friend = useChatStore((s) => s.friends.find((f) => f.username === username?.toLowerCase()));

  if (!friend && status !== "ready") {
    return (
      <div className="grid flex-1 place-items-center">
        <LoaderIcon className="size-6 animate-spin text-ink-faint" />
      </div>
    );
  }
  if (!friend) return <NotFriends username={username.toLowerCase()} />;
  return <Conversation key={friend._id} friend={friend} />;
}
