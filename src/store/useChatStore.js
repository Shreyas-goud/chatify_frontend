import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance, errorMessage } from "../lib/axios";
import { chime } from "../lib/sound";
import { useAuthStore } from "./useAuthStore";
import { usePresenceStore } from "./usePresenceStore";

const myId = () => useAuthStore.getState().authUser?._id;
const isVisible = () => document.visibilityState === "visible";
const tempId = () => `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const byTime = (a, b) => new Date(a.createdAt) - new Date(b.createdAt);

const idle = { items: [], hasMore: false, status: "idle", loadingOlder: false };

// Adds or replaces a message. An optimistic copy is matched by clientId, so the server's copy
// takes its place whether the HTTP reply or the socket event arrives first.
function upsert(items, message) {
  const index = items.findIndex(
    (m) => m._id === message._id || (message.clientId && m.clientId === message.clientId)
  );
  if (index >= 0) {
    const next = items.slice();
    const { status: _status, error: _error, ...clean } = message;
    next[index] = { ...clean, clientId: message.clientId ?? items[index].clientId };
    return next;
  }
  const last = items.at(-1);
  if (!last || byTime(last, message) <= 0) return [...items, message];
  return [...items, message].sort(byTime);
}

const previewOf = (message, me) => ({
  _id: message._id,
  text: (message.text ?? "").slice(0, 140),
  hasImage: Boolean(message.image),
  fromMe: message.senderId === me,
  createdAt: message.createdAt,
  readAt: message.readAt ?? null,
});

// Puts a message on its friend's row and moves the row to the top when it's the latest.
function touchFriend(friends, partnerId, message, me, { countUnread = false } = {}) {
  const index = friends.findIndex((f) => f._id === partnerId);
  if (index < 0) return friends;
  const friend = friends[index];
  const current = friend.lastMessage;
  const isLatest =
    !current ||
    current._id === message._id ||
    (message.clientId && current._id === message.clientId) ||
    new Date(message.createdAt) >= new Date(current.createdAt);
  if (!isLatest && !countUnread) return friends;
  const row = {
    ...friend,
    lastMessage: isLatest ? previewOf(message, me) : current,
    lastActivityAt: isLatest ? message.createdAt : friend.lastActivityAt,
    unread: friend.unread + (countUnread ? 1 : 0),
  };
  return isLatest ? [row, ...friends.filter((_, i) => i !== index)] : friends.map((f, i) => (i === index ? row : f));
}

const patchConversation = (state, partnerId, patch) => ({
  conversations: {
    ...state.conversations,
    [partnerId]: { ...(state.conversations[partnerId] ?? idle), ...patch },
  },
});

const reading = new Set();

export const useChatStore = create((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  friendsStatus: "idle", // idle | loading | ready | error
  conversations: {}, // partnerId → { items, hasMore, status, loadingOlder }
  activeId: null,

  conversation: (partnerId) => get().conversations[partnerId] ?? idle,

  loadFriends: async () => {
    if (get().friendsStatus !== "ready") set({ friendsStatus: "loading" });
    try {
      const { data } = await axiosInstance.get("/friends");
      set({ friends: data.friends, incoming: data.incoming, outgoing: data.outgoing, friendsStatus: "ready" });
    } catch (error) {
      if (get().friendsStatus !== "ready") set({ friendsStatus: "error" });
      toast.error(errorMessage(error), { id: "friends-error" });
    }
  },

  openConversation: (partnerId) => {
    set({ activeId: partnerId });
    const { status } = get().conversation(partnerId);
    if (status === "idle" || status === "error") get().loadLatest(partnerId);
  },

  closeConversation: (partnerId) => {
    if (get().activeId === partnerId) set({ activeId: null });
  },

  // The newest page. Messages still sending or failed are kept, so a reload never loses them.
  loadLatest: async (partnerId) => {
    const before = get().conversation(partnerId);
    if (before.status !== "ready") set((state) => patchConversation(state, partnerId, { status: "loading" }));
    try {
      const { data } = await axiosInstance.get(`/messages/${partnerId}`);
      set((state) => {
        const pending = (state.conversations[partnerId]?.items ?? []).filter((m) => m.status);
        let items = data.messages;
        for (const message of pending) items = upsert(items, message);
        return patchConversation(state, partnerId, { items, hasMore: data.hasMore, status: "ready" });
      });
    } catch (error) {
      if (get().conversation(partnerId).status !== "ready") {
        set((state) => patchConversation(state, partnerId, { status: "error" }));
      }
      toast.error(errorMessage(error), { id: `messages-${partnerId}` });
    }
  },

  loadOlder: async (partnerId) => {
    const conversation = get().conversation(partnerId);
    const oldest = conversation.items.find((m) => !m.status);
    if (!conversation.hasMore || conversation.loadingOlder || !oldest) return;
    set((state) => patchConversation(state, partnerId, { loadingOlder: true }));
    try {
      const { data } = await axiosInstance.get(`/messages/${partnerId}`, {
        params: { before: oldest.createdAt },
      });
      set((state) => {
        const current = state.conversations[partnerId] ?? idle;
        return patchConversation(state, partnerId, {
          items: [...data.messages, ...current.items],
          hasMore: data.hasMore,
          loadingOlder: false,
        });
      });
    } catch (error) {
      set((state) => patchConversation(state, partnerId, { loadingOlder: false }));
      toast.error(errorMessage(error));
    }
  },

  sendMessage: async (partnerId, { text, image }) => {
    const me = myId();
    const clientId = tempId();
    const optimistic = {
      _id: clientId,
      clientId,
      senderId: me,
      receiverId: partnerId,
      text,
      image,
      readAt: null,
      createdAt: new Date().toISOString(),
      status: "sending",
      live: true, // arrived during this visit: animates in (history doesn't)
    };
    set((state) => ({
      ...patchConversation(state, partnerId, { items: upsert(state.conversation(partnerId).items, optimistic) }),
      friends: touchFriend(state.friends, partnerId, optimistic, me),
    }));
    await get().deliver(partnerId, clientId);
  },

  retry: (partnerId, clientId) => get().deliver(partnerId, clientId),

  deliver: async (partnerId, clientId) => {
    const me = myId();
    const pending = get().conversation(partnerId).items.find((m) => m.clientId === clientId);
    if (!pending) return;
    const mark = (status) =>
      set((state) =>
        patchConversation(state, partnerId, {
          items: state.conversation(partnerId).items.map((m) => (m.clientId === clientId ? { ...m, status } : m)),
        })
      );
    mark("sending");
    try {
      const { data } = await axiosInstance.post(`/messages/${partnerId}`, {
        text: pending.text,
        image: pending.image,
        clientId,
      });
      set((state) => ({
        ...patchConversation(state, partnerId, { items: upsert(state.conversation(partnerId).items, data) }),
        friends: touchFriend(state.friends, partnerId, data, me),
      }));
    } catch (error) {
      mark("failed");
      toast.error(errorMessage(error), { id: `send-${clientId}` });
    }
  },

  // Tells the server this friend's messages have been seen, once per batch.
  markRead: async (partnerId) => {
    const friend = get().friends.find((f) => f._id === partnerId);
    const unseen = get()
      .conversation(partnerId)
      .items.some((m) => m.senderId === partnerId && !m.readAt);
    if (!friend?.unread && !unseen) return;
    if (reading.has(partnerId)) return;
    reading.add(partnerId);
    set((state) => ({ friends: state.friends.map((f) => (f._id === partnerId ? { ...f, unread: 0 } : f)) }));
    try {
      const { data } = await axiosInstance.post(`/messages/${partnerId}/read`);
      set((state) =>
        patchConversation(state, partnerId, {
          items: state
            .conversation(partnerId)
            .items.map((m) => (m.senderId === partnerId && !m.readAt ? { ...m, readAt: data.at } : m)),
        })
      );
    } catch {
      // Not worth interrupting anyone: the next open or message tries again.
    } finally {
      reading.delete(partnerId);
    }
  },

  // ── Socket events ───────────────────────────────────────────────────────────

  receiveMessage: (message) => {
    const me = myId();
    if (!me) return;
    const partnerId = message.senderId === me ? message.receiverId : message.senderId;
    const fromThem = message.senderId === partnerId;
    const known = get().friends.some((f) => f._id === partnerId);
    const viewing = get().activeId === partnerId && isVisible();
    const conversation = get().conversation(partnerId);
    const duplicate = conversation.items.some((m) => m._id === message._id);

    if (fromThem) usePresenceStore.getState().setTyping(partnerId, false);
    set((state) => ({
      ...(conversation.status === "ready" &&
        patchConversation(state, partnerId, { items: upsert(conversation.items, { ...message, live: true }) })),
      friends: touchFriend(state.friends, partnerId, message, me, {
        countUnread: fromThem && !viewing && !duplicate,
      }),
    }));

    if (!known) get().loadFriends();
    if (fromThem && !duplicate) {
      if (viewing) get().markRead(partnerId);
      else chime();
    }
  },

  receiveRead: ({ readerId, partnerId, at }) => {
    const me = myId();
    if (readerId === me) {
      // Read in another of my tabs.
      set((state) => ({ friends: state.friends.map((f) => (f._id === partnerId ? { ...f, unread: 0 } : f)) }));
      return;
    }
    const seen = (m) => m.senderId === me && !m.readAt && !m.status && new Date(m.createdAt) <= new Date(at);
    set((state) => ({
      ...patchConversation(state, readerId, {
        items: state.conversation(readerId).items.map((m) => (seen(m) ? { ...m, readAt: at } : m)),
      }),
      friends: state.friends.map((f) =>
        f._id === readerId && f.lastMessage?.fromMe && !f.lastMessage.readAt
          ? { ...f, lastMessage: { ...f.lastMessage, readAt: at } }
          : f
      ),
    }));
  },

  updateFriend: (user) => {
    const merge = (list) => list.map((f) => (f._id === user._id ? { ...f, ...user } : f));
    set((state) => ({ friends: merge(state.friends), incoming: merge(state.incoming), outgoing: merge(state.outgoing) }));
  },

  // After a reconnect: anything sent while the socket was down only exists on the server.
  resync: () => {
    get().loadFriends();
    const { activeId } = get();
    if (activeId) get().loadLatest(activeId);
  },

  // ── Friends ─────────────────────────────────────────────────────────────────

  searchUsers: async (q) => {
    const { data } = await axiosInstance.get("/friends/search", { params: { q } });
    return data;
  },

  requestFriend: async (username) => {
    try {
      const { data } = await axiosInstance.post("/friends/request", { username });
      await get().loadFriends();
      toast.success(data.status === "friend" ? `You and @${username} are friends now.` : `Request sent to @${username}.`);
      return data.status;
    } catch (error) {
      toast.error(errorMessage(error));
      return null;
    }
  },

  acceptFriend: async (user) => {
    try {
      await axiosInstance.post(`/friends/${user._id}/accept`);
      await get().loadFriends();
      toast.success(`You and ${user.fullName} are friends now.`);
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  },

  removeFriend: async (user) => {
    try {
      await axiosInstance.delete(`/friends/${user._id}`);
      set((state) => {
        const conversations = { ...state.conversations };
        delete conversations[user._id];
        return { conversations };
      });
      await get().loadFriends();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  },

  acceptInvite: async (code) => {
    try {
      const { data } = await axiosInstance.post(`/friends/invite/${code}`);
      await get().loadFriends();
      return data.friend;
    } catch (error) {
      toast.error(errorMessage(error));
      return null;
    }
  },

  reset: () =>
    set({ friends: [], incoming: [], outgoing: [], friendsStatus: "idle", conversations: {}, activeId: null }),
}));
