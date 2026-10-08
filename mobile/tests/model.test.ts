import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mergeInbox,
  normalizeNotification,
  notificationDestination,
  validateCmsUrl,
} from "../src/model.ts";
test("FCM payload normalization retains content, campaign id, and destination", () => {
  const message = normalizeNotification(
    {
      messageId: "fcm-1",
      notification: { title: "عرض جديد", body: "نص الإشعار" },
      data: { campaignId: "12", url: "nabdh://campaign/12" },
    },
    "foreground",
    "fcm",
    "2026-10-08T10:00:00Z",
  );
  assert.equal(message.title, "عرض جديد");
  assert.equal(message.source, "fcm");
  assert.equal(message.campaignId, "12");
  assert.equal(message.openedAt, undefined);
  assert.deepEqual(notificationDestination(message.url), {
    type: "campaign",
    id: "12",
  });
});
test("duplicate foreground/background/open events merge and retain receipt time", () => {
  const first = normalizeNotification(
    { messageId: "same", notification: { title: "Title" } },
    "background",
    "fcm",
    "2026-10-08T10:00:00Z",
  );
  const opened = normalizeNotification(
    { messageId: "same", notification: { title: "Title" } },
    "opened",
    "fcm",
    "2026-10-08T11:00:00Z",
  );
  const inbox = mergeInbox([first], opened);
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].receivedAt, first.receivedAt);
  assert.equal(inbox[0].openedAt, opened.openedAt);
  assert.equal(mergeInbox(inbox, first)[0].openedAt, opened.openedAt);
});
test("inbox is bounded and local simulations remain distinguishable", () => {
  let inbox = [] as ReturnType<typeof normalizeNotification>[];
  for (let i = 0; i < 110; i++)
    inbox = mergeInbox(
      inbox,
      normalizeNotification({ messageId: String(i) }, "foreground", "demo"),
    );
  assert.equal(inbox.length, 100);
  assert.equal(inbox[0].id, "109");
  assert.equal(
    inbox.every((item) => item.source === "demo"),
    true,
  );
});
test("notification deep links reject executable, insecure, and unrelated schemes", () => {
  assert.equal(notificationDestination("javascript:alert(1)"), null);
  assert.equal(notificationDestination("file:///etc/passwd"), null);
  assert.equal(notificationDestination("http://example.com"), null);
  assert.equal(notificationDestination("other://campaign/1"), null);
  assert.equal(notificationDestination("https://user:pass@example.com"), null);
  assert.deepEqual(notificationDestination("https://example.com/offers"), {
    type: "https",
    url: "https://example.com/offers",
  });
});
test("CMS URL validation requires secure origin, with explicit development LAN exception", () => {
  assert.equal(
    validateCmsUrl("https://cms.example.com/"),
    "https://cms.example.com",
  );
  assert.throws(() => validateCmsUrl("http://cms.example.com", true));
  assert.throws(() => validateCmsUrl("https://user:pass@example.com"));
  assert.throws(() => validateCmsUrl("https://example.com/api"));
  assert.throws(() => validateCmsUrl("http://10.0.2.2:3000"));
  assert.equal(
    validateCmsUrl("http://10.0.2.2:3000", true),
    "http://10.0.2.2:3000",
  );
});
