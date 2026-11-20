import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { BookUserIcon, LoaderIcon, SearchIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { axiosInstance, errorMessage } from "../lib/axios";
import { canPickContacts, hashPhone, normalizePhone } from "../lib/phone";
import { useAuthStore } from "../store/useAuthStore";
import { normalizeUsername } from "../hooks/useUsernameCheck";
import Avatar from "../components/ui/Avatar";
import InviteCard from "../components/InviteCard";
import PageHeader from "../components/PageHeader";

function PersonRow({ user, children }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar user={user} size={42} />
      <div className="min-w-0 flex-1">
        <p className="board-name truncate text-[18px] leading-6">{user.fullName}</p>
        <p className="truncate text-[13px] text-ink-faint">@{user.username}</p>
      </div>
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  );
}

// Button that shows a spinner while its action runs.
function ActionButton({ onClick, className, children }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={`${className} h-9 px-3.5 text-[13px]`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await onClick();
        setBusy(false);
      }}
    >
      {busy ? <LoaderIcon className="size-4 animate-spin" /> : children}
    </button>
  );
}

function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [found, setFound] = useState({ q: "", users: [], error: "" });
  const searchUsers = useChatStore((s) => s.searchUsers);
  const requestFriend = useChatStore((s) => s.requestFriend);
  const acceptFriend = useChatStore((s) => s.acceptFriend);
  const incoming = useChatStore((s) => s.incoming);
  const q = normalizeUsername(query);

  useEffect(() => {
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(q);
        if (!cancelled) setFound({ q, users, error: "" });
      } catch (error) {
        if (!cancelled) setFound({ q, users: [], error: errorMessage(error) });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, searchUsers]);

  const setRelation = (id, relation) =>
    setFound((f) => ({ ...f, users: f.users.map((u) => (u._id === id ? { ...u, relation } : u)) }));

  const searching = q.length >= 2 && found.q !== q;
  const results = q.length >= 2 && found.q === q ? found.users : [];

  return (
    <section>
      <h2 className="label">Find by username</h2>
      <label className="relative mt-3 block">
        <span className="sr-only">Username</span>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setParams(e.target.value ? { q: e.target.value } : {}, { replace: true });
          }}
          autoFocus
          autoCapitalize="none"
          spellCheck={false}
          placeholder="@username"
          className="field pl-11"
        />
        {searching && <LoaderIcon className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint" />}
      </label>

      {found.error && found.q === q && <p className="mt-3 text-[14px] text-stop">{found.error}</p>}
      {q.length >= 2 && found.q === q && !found.error && results.length === 0 && (
        <p className="mt-4 text-[14px] text-ink-muted">No one is @{q}. Send them your invite link instead.</p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-tile-edge">
          {results.map((user) => (
            <PersonRow key={user._id} user={user}>
              {user.relation === "friend" && (
                <Link to={`/c/${user.username}`} className="btn-quiet h-9 px-3.5 text-[13px]">
                  Message
                </Link>
              )}
              {user.relation === "outgoing" && <span className="label self-center text-[12px]">Requested</span>}
              {user.relation === "incoming" && (
                <ActionButton
                  className="btn-primary"
                  onClick={async () => {
                    const request = incoming.find((u) => u._id === user._id) ?? user;
                    if (await acceptFriend(request)) setRelation(user._id, "friend");
                  }}
                >
                  Accept
                </ActionButton>
              )}
              {user.relation === "none" && (
                <ActionButton
                  className="btn-primary"
                  onClick={async () => {
                    const status = await requestFriend(user.username);
                    if (status) setRelation(user._id, status);
                  }}
                >
                  Add
                </ActionButton>
              )}
            </PersonRow>
          ))}
        </ul>
      )}
    </section>
  );
}

// Android Chrome only: pick contacts, and see which of them are on Chatify. Numbers are hashed
// in the browser; only the hashes are sent.
function FromContacts() {
  const dialCode = useAuthStore((s) => s.authUser?.phoneDialCode) ?? "91";
  const requestFriend = useChatStore((s) => s.requestFriend);
  const [found, setFound] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!canPickContacts()) return null;

  const pick = async () => {
    setBusy(true);
    try {
      const contacts = await navigator.contacts.select(["tel"], { multiple: true });
      const numbers = [...new Set(contacts.flatMap((c) => c.tel ?? []).map((t) => normalizePhone(t, dialCode)).filter(Boolean))];
      const hashes = await Promise.all(numbers.map(hashPhone));
      const { data } = await axiosInstance.post("/friends/match", { hashes });
      setFound(data);
    } catch (error) {
      toast.error(error?.response ? errorMessage(error) : "Couldn't read your contacts.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <button type="button" className="btn-quiet w-full" onClick={pick} disabled={busy}>
        {busy ? <LoaderIcon className="size-4 animate-spin" /> : <BookUserIcon className="size-4" />}
        Find friends from contacts
      </button>
      {found && found.length === 0 && (
        <p className="mt-3 text-[14px] text-ink-muted">None of them are on Chatify yet. Send them your link below.</p>
      )}
      {found && found.length > 0 && (
        <ul className="mt-2 divide-y divide-tile-edge">
          {found.map((user) => (
            <PersonRow key={user._id} user={user}>
              {user.relation === "none" ? (
                <ActionButton
                  className="btn-primary"
                  onClick={async () => {
                    const status = await requestFriend(user.username);
                    if (status) setFound((list) => list.map((u) => (u._id === user._id ? { ...u, relation: status } : u)));
                  }}
                >
                  Add
                </ActionButton>
              ) : (
                <span className="label self-center text-[12px]">{user.relation === "friend" ? "Friends" : "Requested"}</span>
              )}
            </PersonRow>
          ))}
        </ul>
      )}
    </section>
  );
}

function Requests() {
  const incoming = useChatStore((s) => s.incoming);
  const outgoing = useChatStore((s) => s.outgoing);
  const acceptFriend = useChatStore((s) => s.acceptFriend);
  const removeFriend = useChatStore((s) => s.removeFriend);
  if (!incoming.length && !outgoing.length) return null;

  return (
    <section className="space-y-8">
      {incoming.length > 0 && (
        <div>
          <h2 className="label text-signal">Waiting for you · {incoming.length}</h2>
          <ul className="mt-2 divide-y divide-tile-edge">
            {incoming.map((user) => (
              <PersonRow key={user._id} user={user}>
                <ActionButton className="btn-primary" onClick={() => acceptFriend(user)}>
                  Accept
                </ActionButton>
                <ActionButton className="btn-quiet" onClick={() => removeFriend(user)}>
                  Decline
                </ActionButton>
              </PersonRow>
            ))}
          </ul>
        </div>
      )}
      {outgoing.length > 0 && (
        <div>
          <h2 className="label">Sent · {outgoing.length}</h2>
          <ul className="mt-2 divide-y divide-tile-edge">
            {outgoing.map((user) => (
              <PersonRow key={user._id} user={user}>
                <ActionButton className="btn-quiet" onClick={() => removeFriend(user)}>
                  Cancel
                </ActionButton>
              </PersonRow>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function AddFriendsPage() {
  return (
    <>
      <PageHeader title="Add friends" />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[620px] space-y-10 px-5 py-8 pb-[max(32px,env(safe-area-inset-bottom))]">
          <Search />
          <FromContacts />
          <Requests />
          <section>
            <h2 className="label mb-3">Or share your link</h2>
            <InviteCard />
          </section>
        </div>
      </div>
    </>
  );
}
