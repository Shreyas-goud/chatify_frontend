import { test } from "node:test";
import assert from "node:assert/strict";
import { attentionOf, liveStateOf, nudgeStatusOf } from "../src/lib/attention.js";

const T = "2026-11-20T21:00:00Z";
const at = (minutes) => new Date(Date.parse(T) + minutes * 60_000).toISOString();
const message = { createdAt: T };

test("not delivered until a socket or a push reaches them", () => {
  assert.equal(attentionOf({}, message).state, "sent");
  assert.equal(attentionOf({ deliveredAt: at(-5) }, message).state, "sent"); // that was an older message
  assert.equal(attentionOf({ deliveredAt: at(1) }, message).state, "delivered");
  assert.equal(attentionOf({ notifiedAt: at(1) }, message).state, "delivered");
});

test("swiping the notification away is visible", () => {
  const swiped = attentionOf({ notifiedAt: at(1), dismissedAt: at(2), lastActiveAt: at(-30) }, message);
  assert.equal(swiped.state, "dismissed");
  assert.deepEqual(swiped.timeline.map((e) => e.kind), ["delivered", "notified", "dismissed"]);
});

test("swiped away and then used Chatify anyway is 'ignored'", () => {
  assert.equal(attentionOf({ notifiedAt: at(1), dismissedAt: at(2), lastActiveAt: at(5) }, message).state, "ignored");
  assert.equal(attentionOf({ notifiedAt: at(1), dismissedAt: at(2), active: true }, message).state, "ignored");
});

test("on Chatify since the message, but not in this circle", () => {
  const result = attentionOf({ deliveredAt: at(0), lastActiveAt: at(3) }, message);
  assert.equal(result.state, "active");
  assert.equal(result.timeline.at(-1).kind, "active");
});

test("reading wins over everything", () => {
  const result = attentionOf({ notifiedAt: at(1), dismissedAt: at(2), readAt: at(9), active: true }, message);
  assert.equal(result.state, "seen");
  assert.ok(!result.timeline.some((e) => e.kind === "dismissed"));
});

test("nudge outcomes, including dismissed-but-still-around", () => {
  const nudge = { outcome: "dismissed", outcomeAt: at(4), channel: "popup" };
  assert.equal(nudgeStatusOf(nudge, { lastActiveAt: at(2) }).label, "Dismissed");
  assert.equal(nudgeStatusOf(nudge, { lastActiveAt: at(6) }).label, "Dismissed, still on Chatify");
  assert.equal(nudgeStatusOf({ outcome: "pending", channel: "none" }, {}).label, "Waiting · notifications off");
  assert.equal(nudgeStatusOf({ outcome: "replied" }, {}).label, "Replied");
});

test("live state", () => {
  assert.equal(liveStateOf({ active: true, online: true }).label, "On Chatify");
  assert.equal(liveStateOf({ online: true }).label, "Away");
  assert.equal(liveStateOf({ lastActiveAt: at(0) }).label, "Last on");
});
