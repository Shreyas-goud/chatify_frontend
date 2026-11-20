// What happened to a message on one Glass-circle member's side, derived from their attention
// cursors (each holds the latest time it happened) and their live activity. Pure, so it's
// unit-tested (tests/attention.test.js) and recomputed live as receipts and presence arrive.

const time = (value) => (value ? new Date(value).getTime() : 0);

export const STATES = {
  seen: { label: "Seen", tone: "go" },
  ignored: { label: "Swiped away, still on Chatify", tone: "stop" },
  dismissed: { label: "Swiped away", tone: "stop" },
  active: { label: "On Chatify, not here", tone: "signal" },
  delivered: { label: "Delivered", tone: "muted" },
  sent: { label: "Not delivered yet", tone: "faint" },
};

export function attentionOf(member, message, now = Date.now()) {
  const sent = time(message.createdAt);
  const readAt = time(member.readAt);
  const deliveredAt = Math.max(time(member.deliveredAt), time(member.notifiedAt));
  const notifiedAt = time(member.notifiedAt);
  const dismissedAt = time(member.dismissedAt);
  const lastActiveAt = time(member.lastActiveAt);

  const read = readAt >= sent;
  const delivered = read || deliveredAt >= sent;
  const notified = notifiedAt >= sent;
  const dismissed = !read && dismissedAt >= sent;
  const activeSince = member.active || lastActiveAt >= sent;
  const activeAfterDismissal = dismissed && (member.active || lastActiveAt > dismissedAt);

  const timeline = [];
  if (delivered) timeline.push({ kind: "delivered", at: read && deliveredAt < sent ? readAt : deliveredAt });
  if (notified) timeline.push({ kind: "notified", at: notifiedAt });
  if (dismissed) timeline.push({ kind: "dismissed", at: dismissedAt });
  if (!read && activeSince) timeline.push({ kind: "active", at: member.active ? now : lastActiveAt });
  if (read) timeline.push({ kind: "seen", at: readAt });
  timeline.sort((a, b) => a.at - b.at);

  const state = read
    ? "seen"
    : activeAfterDismissal
      ? "ignored"
      : dismissed
        ? "dismissed"
        : activeSince
          ? "active"
          : delivered
            ? "delivered"
            : "sent";
  return { state, ...STATES[state], timeline, at: timeline.at(-1)?.at ?? null };
}

// A nudge's outcome, including the case the circle cares most about: dismissed, then kept using
// Chatify anyway.
export function nudgeStatusOf(nudge, member) {
  if (nudge.outcome === "replied") return { label: "Replied", tone: "go" };
  if (nudge.outcome === "opened") return { label: "Opened", tone: "go" };
  if (nudge.outcome === "dismissed") {
    const stillActive = member && (member.active || time(member.lastActiveAt) > time(nudge.outcomeAt));
    return stillActive
      ? { label: "Dismissed, still on Chatify", tone: "stop" }
      : { label: "Dismissed", tone: "stop" };
  }
  if (nudge.channel === "popup") return { label: "On their screen now", tone: "signal" };
  if (nudge.channel === "push") return { label: "Sent to their phone", tone: "muted" };
  return { label: "Waiting · notifications off", tone: "faint" };
}

// Right now, in a word: on Chatify, connected in the background, or gone since a time.
export function liveStateOf(member) {
  if (member.active) return { label: "On Chatify", tone: "go", lamp: "bg-go" };
  if (member.online) return { label: "Away", tone: "signal", lamp: "bg-signal" };
  return { label: member.lastActiveAt ? "Last on" : "Offline", tone: "faint", lamp: null, at: member.lastActiveAt };
}
