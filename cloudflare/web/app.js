const $ = (id) => document.getElementById(id);
let setup = false,
  state = { campaigns: [], devices: [], deliveries: [] };
const labels = {
  draft: "مسودة",
  scheduled: "مجدولة",
  sending: "جارٍ الإرسال",
  sent: "اكتمل الطلب",
  pending: "بانتظار الإرسال",
  inflight: "طلب قيد التنفيذ",
  accepted: "قبله Firebase",
  failed: "فشل",
  unknown: "غير معروف",
};
function notice(message, error = false) {
  $("notice").textContent = message;
  $("notice").classList.toggle("error", error);
  $("notice").hidden = false;
}
async function api(path, method = "GET", body) {
  const response = await fetch("/api" + path, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "تعذر تنفيذ الطلب.");
  return result;
}
async function run(button, action) {
  button.disabled = true;
  try {
    await action();
  } catch (error) {
    notice(error.message, true);
  } finally {
    button.disabled = false;
  }
}
function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function action(label, handler, className = "quiet") {
  const node = element("button", label, className);
  node.type = "button";
  node.addEventListener("click", () => run(node, handler));
  return node;
}
function when(value) {
  return value ? new Date(value).toLocaleString("ar") : "غير محدد";
}
function row(parent, title, description, badge) {
  const node = element("article", undefined, "list-row"),
    info = element("div");
  info.append(element("strong", title), element("p", description));
  if (badge)
    info.append(
      element(
        "span",
        labels[badge] || badge,
        "badge" + (["failed", "unknown"].includes(badge) ? " error" : ""),
      ),
    );
  const buttons = element("div", undefined, "actions");
  node.append(info, buttons);
  parent.append(node);
  return buttons;
}
function edit(campaign) {
  const form = $("campaign-form");
  form.reset();
  for (const name of [
    "id",
    "name",
    "title",
    "body",
    "platform",
    "segment",
    "link",
  ])
    form.elements.namedItem(name).value = campaign[name] ?? "";
  if (campaign.scheduled_at) {
    const date = new Date(campaign.scheduled_at);
    form.elements.scheduled_at.value = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000,
    )
      .toISOString()
      .slice(0, 16);
  }
  $("editor-title").textContent = "تعديل الحملة";
  preview();
  form.scrollIntoView({ behavior: "smooth" });
}
function preview() {
  const form = $("campaign-form");
  $("preview-title").textContent =
    form.elements.title.value || "عنوان رسالتك هنا";
  $("preview-body").textContent =
    form.elements.body.value || "كلمات قليلة، تواصل أفضل.";
}
function render() {
  $("campaign-count").textContent = state.campaigns.length;
  $("device-count").textContent = state.devices.filter((x) => x.active).length;
  $("accepted-count").textContent = state.campaigns.reduce(
    (sum, x) => sum + x.accepted,
    0,
  );
  $("user-name").textContent = state.user.name;
  $("firebase-status").textContent = state.firebaseConfigured
    ? "سر Firebase مضاف. استخدم الفحص للتحقق من المصادقة وصلاحية API دون إرسال."
    : "سر Firebase لم يُضف بعد؛ لن تعمل الإشعارات قبل إضافته.";
  for (const name of ["campaign-list", "device-list", "delivery-list"])
    $(name).replaceChildren();
  if (!state.campaigns.length)
    $("campaign-list").append(element("p", "ابدأ بحملة موجهة إلى شريحة test."));
  for (const c of state.campaigns) {
    const buttons = row(
      $("campaign-list"),
      c.name,
      `${c.platform} · ${c.segment} · قبول ${c.accepted} · فشل/غير معروف ${c.failed}${c.scheduled_at ? " · الموعد " + when(c.scheduled_at) : ""}`,
      c.status,
    );
    if (c.error) buttons.parentElement.append(element("small", c.error));
    if (c.status === "sent") {
      buttons.append(
        action("إعادة إرسال", async () => {
          const copy = await api(`/campaigns/${c.id}/duplicate`, "POST", {});
          await refresh();
          edit(copy);
          notice(
            "جُهّزت نسخة جديدة بنفس المحتوى والجمهور. راجعها ثم اضغط إرسال الآن؛ سجل الحملة السابقة محفوظ.",
          );
        }),
      );
    }
    if (["draft", "scheduled"].includes(c.status)) {
      buttons.append(action("تعديل", () => edit(c)));
      buttons.append(
        action("إرسال الآن", async () => {
          if (
            !confirm(
              `إرسال «${c.name}» إلى ${c.platform} وشريحة ${c.segment} الآن؟`,
            )
          )
            return;
          await api(`/campaigns/${c.id}/send`, "POST", {});
          await refresh();
          notice("بدأ طلب الإرسال. حدّث النتائج لمتابعة الدفعات.");
        }),
      );
      buttons.append(
        action(
          "حذف",
          async () => {
            if (!confirm(`حذف الحملة «${c.name}»؟`)) return;
            await api(`/campaigns/${c.id}`, "DELETE");
            await refresh();
          },
          "danger",
        ),
      );
    }
  }
  if (!state.devices.length)
    $("device-list").append(element("p", "لم يُربط جهاز بعد."));
  for (const d of state.devices) {
    const buttons = row(
      $("device-list"),
      `الجهاز #${d.id}`,
      `${d.platform} · ${d.segment} · ${d.active ? "نشط" : "غير نشط"} · ${when(d.created_at)}`,
    );
    if (d.active)
      buttons.append(
        action(
          "إلغاء ربط الجهاز",
          async () => {
            if (!confirm("إلغاء ربط هذا الجهاز وإيقاف الإشعارات إليه؟")) return;
            await api(`/devices/${d.id}`, "DELETE");
            await refresh();
          },
          "danger",
        ),
      );
  }
  if (!state.deliveries.length)
    $("delivery-list").append(element("p", "لا توجد طلبات إرسال بعد."));
  for (const d of state.deliveries)
    row(
      $("delivery-list"),
      `الحملة #${d.campaign_id} · الجهاز #${d.device_id}`,
      d.error || d.provider_id || "بانتظار نتيجة الطلب",
      d.status,
    );
}
async function refresh() {
  state = await api("/admin");
  render();
}
async function boot() {
  const status = await api("/status");
  setup = !status.hasAdmin;
  $("auth-title").textContent = setup ? "إنشاء حساب المدير" : "تسجيل الدخول";
  $("auth-submit").textContent = setup ? "إنشاء الحساب" : "تسجيل الدخول";
  $("auth-description").textContent = setup
    ? status.bootstrapConfigured
      ? "استخدم رمز التهيئة المضاف إلى إعدادات Worker لإنشاء حسابك."
      : "أضف سر BOOTSTRAP_TOKEN بطول 32 حرفًا على الأقل إلى Worker، ثم أعد تحميل الصفحة."
    : "أهلًا بك. حملاتك بانتظارك.";
  $("name-label").hidden = !setup;
  $("bootstrap-label").hidden = !setup;
  $("auth-form").elements.name.required = setup;
  $("auth-form").elements.bootstrapToken.required = setup;
  let loggedIn = false;
  if (!setup) {
    try {
      await refresh();
      loggedIn = true;
    } catch {
      /* login form */
    }
  }
  $("auth").hidden = loggedIn;
  $("dashboard").hidden = !loggedIn;
  $("account").hidden = !loggedIn;
}
$("auth-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run($("auth-submit"), async () => {
    const body = Object.fromEntries(new FormData(event.target));
    await api(setup ? "/setup" : "/login", "POST", body);
    event.target.reset();
    $("notice").hidden = true;
    await boot();
  });
});
$("logout").addEventListener("click", () =>
  run($("logout"), async () => {
    await api("/logout", "POST", {});
    $("notice").hidden = true;
    await boot();
  }),
);
$("refresh").addEventListener("click", () =>
  run($("refresh"), async () => {
    await refresh();
    notice("تم تحديث النتائج.");
  }),
);
$("campaign-form").addEventListener("input", preview);
$("campaign-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.target.querySelector("[type=submit]"), async () => {
    const body = Object.fromEntries(new FormData(event.target));
    if (body.id) body.id = Number(body.id);
    else delete body.id;
    body.scheduled_at = body.scheduled_at
      ? new Date(body.scheduled_at).toISOString()
      : null;
    await api("/campaigns", "POST", body);
    event.target.reset();
    $("editor-title").textContent = "حملة جديدة";
    preview();
    await refresh();
    notice("تم حفظ الحملة.");
  });
});
$("new-campaign").addEventListener("click", () => {
  $("campaign-form").reset();
  $("editor-title").textContent = "حملة جديدة";
  preview();
});
$("pairing-code").addEventListener("click", () =>
  run($("pairing-code"), async () => {
    const result = await api("/pairing-code", "POST", {});
    $("pairing-value").value = result.code.match(/.{1,4}/g).join(" ");
    $("pairing-expiry").textContent =
      "صالح حتى " +
      when(result.expiresAt) +
      "، ولمرة واحدة. إصدار رمز جديد يلغي السابق.";
    $("pairing-result").hidden = false;
  }),
);
$("check-firebase").addEventListener("click", () =>
  run($("check-firebase"), async () => {
    await api("/firebase/check", "POST", {});
    notice("نجح فحص مصادقة Firebase وصلاحية FCM. لم يُرسل إشعار.");
  }),
);
for (const button of document.querySelectorAll("[data-tab]"))
  button.addEventListener("click", () => {
    document
      .querySelectorAll("[data-tab]")
      .forEach((x) => x.classList.toggle("selected", x === button));
    document
      .querySelectorAll("[data-panel]")
      .forEach((x) => (x.hidden = x.dataset.panel !== button.dataset.tab));
  });
$("cms-url").value = location.origin;
$("timezone").textContent =
  "الموعد بحسب المنطقة الزمنية لجهازك: " +
  Intl.DateTimeFormat().resolvedOptions().timeZone;
boot().catch((error) => notice(error.message, true));
