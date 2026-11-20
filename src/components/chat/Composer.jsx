import { useEffect, useLayoutEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowUpIcon, ImagePlusIcon, LoaderIcon, XIcon } from "lucide-react";
import { toSendableImage } from "../../lib/image";
import { clack } from "../../lib/sound";

const MAX_TEXT = 2000;
const TYPING_IDLE_MS = 2500;
// Unsent text survives switching chats for the rest of the visit.
const drafts = new Map();
const touchScreen = () => window.matchMedia?.("(pointer: coarse)").matches;

// The message box for a chat or a circle.
//   draftKey: where unsent text is kept; name: who it's for ("Ravi", "Hostel gang")
//   onSend({ text, image }); onTyping(on) tells the others you're typing
export default function Composer({ draftKey, name, onSend, onTyping, droppedFile, onDropTaken }) {
  const [text, setText] = useState(() => drafts.get(draftKey) ?? "");
  const [image, setImage] = useState(null);
  const [preparing, setPreparing] = useState(false);
  const textarea = useRef(null);
  const fileInput = useRef(null);
  const typing = useRef({ on: false, timer: null });

  const stopTyping = () => {
    clearTimeout(typing.current.timer);
    if (typing.current.on) onTyping(false);
    typing.current.on = false;
  };

  const noteTyping = () => {
    if (!typing.current.on) onTyping(true);
    typing.current.on = true;
    clearTimeout(typing.current.timer);
    typing.current.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  // Stop the typing signal when leaving the chat.
  const typingRef = useRef(onTyping);
  typingRef.current = onTyping;
  useEffect(() => {
    const state = typing.current;
    return () => {
      clearTimeout(state.timer);
      if (state.on) typingRef.current(false);
    };
  }, []);

  // The box grows with the text, up to about six lines.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  const attach = async (file) => {
    if (!file) return;
    setPreparing(true);
    try {
      setImage(await toSendableImage(file));
      textarea.current?.focus();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPreparing(false);
    }
  };

  useEffect(() => {
    if (!droppedFile) return;
    attach(droppedFile);
    onDropTaken();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per dropped file
  }, [droppedFile]);

  const canSend = (text.trim() || image) && !preparing && text.length <= MAX_TEXT;

  const submit = (event) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend({ text: text.trim(), image });
    setText("");
    setImage(null);
    drafts.delete(draftKey);
    stopTyping();
    clack(0.04);
    textarea.current?.focus();
  };

  const onKeyDown = (event) => {
    // Enter sends on a keyboard; on a phone it makes a new line and the button sends.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !touchScreen()) {
      event.preventDefault();
      submit();
    }
  };

  const onPaste = (event) => {
    const file = [...(event.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    attach(file);
  };

  return (
    <div className="shrink-0 border-t border-tile-edge bg-board px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      <div className="mx-auto max-w-[860px]">
        {(image || preparing) && (
          <div className="mb-3 flex items-center gap-3">
            <div className="relative size-20 overflow-hidden rounded-[10px] bg-tile">
              {preparing ? (
                <LoaderIcon className="absolute inset-0 m-auto size-5 animate-spin text-ink-muted" />
              ) : (
                <img src={image} alt="Photo to send" className="size-full object-cover" />
              )}
            </div>
            {image && (
              <button type="button" className="btn-quiet h-9 px-3 text-[13px]" onClick={() => setImage(null)}>
                <XIcon className="size-4" /> Remove
              </button>
            )}
          </div>
        )}

        <form onSubmit={submit} className="flex items-end gap-2">
          <button
            type="button"
            className="icon-btn mb-0.5 size-11"
            onClick={() => fileInput.current?.click()}
            aria-label="Add a photo"
          >
            <ImagePlusIcon className="size-5" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              attach(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="min-w-0 flex-1 rounded-[22px] border border-transparent bg-tile px-4 py-[11px] transition-colors duration-150 focus-within:border-tile-line">
            <textarea
              ref={textarea}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                drafts.set(draftKey, e.target.value);
                if (e.target.value) noteTyping();
                else stopTyping();
              }}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onBlur={stopTyping}
              placeholder={`Message ${name}`}
              aria-label={`Message ${name}`}
              className="block max-h-[168px] w-full resize-none text-[16px] leading-[1.4] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="mb-0.5 grid size-11 shrink-0 place-items-center rounded-full bg-signal text-signal-ink transition-[transform,opacity] duration-150 ease-out active:scale-[0.94] disabled:bg-tile disabled:text-ink-faint"
          >
            <ArrowUpIcon className="size-5" strokeWidth={2.5} />
          </button>
        </form>

        {text.length > MAX_TEXT - 200 && (
          <p className={`label mt-2 text-right text-[11px] tabular ${text.length > MAX_TEXT ? "text-stop" : ""}`}>
            {text.length} / {MAX_TEXT}
          </p>
        )}
      </div>
    </div>
  );
}
