import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { CheckIcon, EyeIcon, LoaderIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useCircleStore } from "../store/useCircleStore";
import Avatar from "../components/ui/Avatar";
import Field from "../components/ui/Field";
import PageHeader from "../components/PageHeader";

const MAX_OTHERS = 7;

export default function CreateCirclePage() {
  const friends = useChatStore((s) => s.friends);
  const createCircle = useCircleStore((s) => s.createCircle);
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_OTHERS) next.add(id);
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim() || picked.size === 0) return;
    setBusy(true);
    const circle = await createCircle({ name: name.trim(), memberIds: [...picked] });
    setBusy(false);
    if (circle) navigate(`/g/${circle._id}`, { replace: true });
  };

  return (
    <>
      <PageHeader title="New Glass circle" />
      <form onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[560px] space-y-8 px-5 py-8 pb-[max(32px,env(safe-area-inset-bottom))]">
          <div className="rounded-[14px] border border-signal/40 bg-board-rail p-4">
            <p className="label flex items-center gap-1.5 text-signal">
              <EyeIcon className="size-3.5" /> How Glass works
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
              For your closest people. Everyone in the circle sees when messages reach each other, get read, or get
              swiped away, who’s on Chatify right now, and what happens to nudges. Each person you add has to agree
              before they’re in.
            </p>
          </div>

          <Field label="Circle name" placeholder="Hostel gang" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />

          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="label">Who’s in</h2>
              <span className="label text-[11px] tabular">
                {picked.size} / {MAX_OTHERS}
              </span>
            </div>
            {friends.length === 0 ? (
              <p className="mt-3 text-[14px] text-ink-muted">
                Circles are made of friends. <Link to="/add" className="text-signal">Add some first.</Link>
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-tile-edge">
                {friends.map((friend) => {
                  const on = picked.has(friend._id);
                  return (
                    <li key={friend._id}>
                      <button
                        type="button"
                        onClick={() => toggle(friend._id)}
                        aria-pressed={on}
                        className="flex w-full items-center gap-3 py-2.5 text-left"
                      >
                        <Avatar user={friend} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="board-name block truncate text-[17px]">{friend.fullName}</span>
                          <span className="block truncate text-[13px] text-ink-faint">@{friend.username}</span>
                        </span>
                        <span
                          className={`grid size-6 place-items-center rounded-[7px] border transition-colors duration-150 ${
                            on ? "border-signal bg-signal text-signal-ink" : "border-tile-line"
                          }`}
                        >
                          {on && <CheckIcon className="size-4" strokeWidth={3} />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <button type="submit" className="btn-primary w-full" disabled={busy || !name.trim() || picked.size === 0}>
            {busy ? <LoaderIcon className="size-5 animate-spin" /> : "Create circle and invite"}
          </button>
        </div>
      </form>
    </>
  );
}
