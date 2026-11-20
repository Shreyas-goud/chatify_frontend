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
const idle = { items: [], nudges: [], hasMore: false, status: "idle", loadingOlder: false };

function upsert(items, message) {
  const index = items.findIndex(
    (m) => m._id === message._id || (message.clientId && m.clientId === message.clientId)
  );
  if (index >= 0) {
    const next = items.slice();
    const { status: _status, ...clean } = message;
    next[index] = { ...clean, clientId: message.clientId ?? items[index].clientId };
    return next;
  }
  const last = items.at(-1);
  if (!last || byTime(last, message) <= 0) return [...items, message];
  return [...items, message].sort(byTime);
}

const upsertNudge = (nudges, nudge) => {
  const index = nudges.findIndex((n) => n._id === nudge._id);
  if (index < 0) return [...nudges, nudge].sort(byTime);
  return nudges.map((n, i) => (i === index ? { ...n, ...nudge } : n));
};

const preview = (message, me) => ({
  _id: message._id,
  senderId: message.senderId,
  text: (message.text ?? "").slice(0, 140),
  hasImage: Boolean(message.image),
  fromMe: message.senderId === me,
  createdAt: message.createdAt,
});

const patchThread = (state, circleId, patch) => ({
  threads: { ...state.threads, [circleId]: { ...(state.threads[circleId] ?? idle), ...patch } },
});

const patchCircle = (state, circleId, patch) => ({
  circles: state.circles.map((c) => (c._id === circleId ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)),
});

const reading = new Set();

export const useCircleStore = create((set, get) => ({
  circles: [],
  status: "idle",
  threads: {},
  activeId: null,
  incomingNudges: [], // nudges waiting for an answer on this screen

  thread: (circleId) => get().threads[circleId] ?? idle,

  loadCircles: async () => {
    if (get().status !== "ready") set({ status: "loading" });
    try {
      const { data } = await axiosInstance.get("/circles");
      set({ circles: data, status: "ready" });
    } catch (error) {
      if (get().status !== "ready") set({ status: "error" });
      toast.error(errorMessage(error), { id: "circles-error" });
    }
  },

  createCircle: async ({ name, memberIds }) => {
    try {
      const { data } = await axiosInstance.post("/circles", { name, memberIds });
      set((state) => ({ circles: [data, ...state.circles.filter((c) => c._id !== data._id)] }));
      return data;
    } catch (error) {
      toast.error(errorMessage(error));
      return null;
    }
  },

  joinCircle: async (circleId) => {
    try {
      await axiosInstance.post(`/circles/${circleId}/join`);
      await get().loadCircles();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  },

  leaveCircle: async (circleId) => {
    try {
      await axiosInstance.delete(`/circles/${circleId}/membership`);
      set((state) => {
        const threads = { ...state.threads };
        delete threads[circleId];
        return { threads, circles: state.circles.filter((c) => c._id !== circleId) };
      });
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  },

  openCircle: (circleId) => {
    set({ activeId: circleId });
    const { status } = get().thread(circleId);
    if (status === "idle" || status === "error") get().loadLatest(circleId);
  },

  closeCircle: (circleId) => {
    if (get().activeId === circleId) set({ activeId: null });
  },

  loadLatest: async (circleId) => {
    if (get().thread(circleId).status !== "ready") set((state) => patchThread(state, circleId, { status: "loading" }));
    try {
      const { data } = await axiosInstance.get(`/circles/${circleId}/messages`);
      set((state) => {
        const pending = (state.threads[circleId]?.items ?? []).filter((m) => m.status);
        let items = data.messages;
        for (const message of pending) items = upsert(items, message);
        return patchThread(state, circleId, { items, nudges: data.nudges, hasMore: data.hasMore, status: "ready" });
      });
    } catch (error) {
      if (get().thread(circleId).status !== "ready") set((state) => patchThread(state, circleId, { status: "error" }));
      toast.error(errorMessage(error), { id: `circle-${circleId}` });
    }
  },

  loadOlder: async (circleId) => {
    const thread = get().thread(circleId);
    const oldest = thread.items.find((m) => !m.status);
    if (!thread.hasMore || thread.loadingOlder || !oldest) return;
    set((state) => patchThread(state, circleId, { loadingOlder: true }));
    try {
      const { data } = await axiosInstance.get(`/circles/${circleId}/messages`, { params: { before: oldest.createdAt } });
      set((state) =>
        patchThread(state, circleId, {
          items: [...data.messages, ...state.thread(circleId).items],
          hasMore: data.hasMore,
          loadingOlder: false,
        })
      );
    } catch (error) {
      set((state) => patchThread(state, circleId, { loadingOlder: false }));
      toast.error(errorMessage(error));
    }
  },

  sendMessage: async (circleId, { text, image }) => {
    const me = myId();
    const clientId = tempId();
    const optimistic = {
      _id: clientId,
      clientId,
      circleId,
      senderId: me,
      text,
      image,
      createdAt: new Date().toISOString(),
      status: "sending",
      live: true,
    };
    set((state) => ({
      ...patchThread(state, circleId, { items: upsert(state.thread(circleId).items, optimistic) }),
      ...patchCircle(state, circleId, { lastMessage: preview(optimistic, me), lastMessageAt: optimistic.createdAt }),
    }));
    await get().deliver(circleId, clientId);
  },

  retry: (circleId, clientId) => get().deliver(circleId, clientId),

  deliver: async (circleId, clientId) => {
    const pending = get().thread(circleId).items.find((m) => m.clientId === clientId);
    if (!pending) return;
    const mark = (status) =>
      set((state) =>
        patchThread(state, circleId, {
          items: state.thread(circleId).items.map((m) => (m.clientId === clientId ? { ...m, status } : m)),
        })
      );
    mark("sending");
    try {
      const { data } = await axiosInstance.post(`/circles/${circleId}/messages`, {
        text: pending.text,
        image: pending.image,
        clientId,
      });
      set((state) => patchThread(state, circleId, { items: upsert(state.thread(circleId).items, data) }));
    } catch (error) {
      mark("failed");
      toast.error(errorMessage(error), { id: `send-${clientId}` });
    }
  },

  // `force` when a message arrives while the circle is on screen: the unread count never rose,
  // but the others still need to see it was read.
  markRead: async (circleId, force = false) => {
    const circle = get().circles.find((c) => c._id === circleId);
    if ((!circle?.unread && !force) || reading.has(circleId)) return;
    reading.add(circleId);
    set((state) => patchCircle(state, circleId, { unread: 0 }));
    try {
      await axiosInstance.post(`/circles/${circleId}/read`);
    } catch {
      // the next open tries again
    } finally {
      reading.delete(circleId);
    }
  },

  nudge: async (circleId, member) => {
    try {
      const { data } = await axiosInstance.post(`/circles/${circleId}/nudges/${member._id}`);
      set((state) => patchThread(state, circleId, { nudges: upsertNudge(state.thread(circleId).nudges, data) }));
      toast.success(
        data.channel === "popup"
          ? `${member.fullName.split(" ")[0]} has it on screen now.`
          : data.channel === "push"
            ? `Sent to ${member.fullName.split(" ")[0]}'s phone.`
            : `${member.fullName.split(" ")[0]} has notifications off. They'll see it when they're back.`
      );
      return data;
    } catch (error) {
      toast.error(errorMessage(error));
      return null;
    }
  },

  answerNudge: async (nudge, outcome) => {
    set((state) => ({ incomingNudges: state.incomingNudges.filter((n) => n._id !== nudge._id) }));
    try {
      await axiosInstance.post(`/nudges/${nudge._id}/outcome`, { outcome });
    } catch {
      // the outcome is lost; the circle sees it as unanswered
    }
  },

  // ── Socket events ───────────────────────────────────────────────────────────

  receiveMessage: (message) => {
    const me = myId();
    const { circleId } = message;
    const circle = get().circles.find((c) => c._id === circleId);
    if (!circle) return get().loadCircles();
    const viewing = get().activeId === circleId && isVisible();
    const fromOther = message.senderId !== me;
    const thread = get().thread(circleId);
    const duplicate = thread.items.some((m) => m._id === message._id);
    if (fromOther) usePresenceStore.getState().setTyping(message.senderId, false, circleId);

    set((state) => ({
      ...(thread.status === "ready" && patchThread(state, circleId, { items: upsert(thread.items, { ...message, live: true }) })),
      circles: [
        {
          ...circle,
          lastMessage: preview(message, me),
          lastMessageAt: message.createdAt,
          unread: (circle.unread ?? 0) + (fromOther && !viewing && !duplicate ? 1 : 0),
        },
        ...state.circles.filter((c) => c._id !== circleId),
      ],
    }));
    if (fromOther && !duplicate) {
      if (viewing) get().markRead(circleId, true);
      else chime();
    }
  },

  receiveAttention: ({ circleId, updates }) =>
    set((state) =>
      patchCircle(state, circleId, (circle) => ({
        members: circle.members.map((m) => {
          const update = updates.find((u) => u.userId === m._id);
          if (!update) return m;
          const { userId: _userId, ...cursors } = update;
          return { ...m, ...cursors };
        }),
      }))
    ),

  receiveNudge: (nudge) => {
    set((state) => ({
      ...(state.threads[nudge.circleId] &&
        patchThread(state, nudge.circleId, { nudges: upsertNudge(state.thread(nudge.circleId).nudges, nudge) })),
    }));
  },

  // A nudge for me while Chatify is on screen: it pops up until answered.
  incomingNudge: (nudge) => {
    set((state) => ({ incomingNudges: [...state.incomingNudges.filter((n) => n._id !== nudge._id), nudge] }));
    get().receiveNudge(nudge);
    chime();
    navigator.vibrate?.([120, 80, 120]);
  },

  // Keeps members' live state and "last on Chatify" in step with presence events.
  applyPresence: ({ userId, online, active, at }) =>
    set((state) => ({
      circles: state.circles.map((circle) =>
        circle.myStatus !== "joined" || !circle.members.some((m) => m._id === userId)
          ? circle
          : {
              ...circle,
              members: circle.members.map((m) =>
                m._id === userId ? { ...m, online, active, lastActiveAt: at && (active || m.active) ? at : m.lastActiveAt } : m
              ),
            }
      ),
    })),

  resync: () => {
    get().loadCircles();
    const { activeId } = get();
    if (activeId) get().loadLatest(activeId);
  },

  reset: () => set({ circles: [], status: "idle", threads: {}, activeId: null, incomingNudges: [] }),
}));
