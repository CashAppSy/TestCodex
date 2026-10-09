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
        "badge " +
          badge +
          (["failed", "unknown"].includes(badge) ? " error" : ""),
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
    "audience_mode",
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
  navigate("campaigns");
  const chosen = new Set(JSON.parse(campaign.subscriber_ids || "[]"));
  for (const input of $("recipient-list").querySelectorAll("input"))
    input.checked = chosen.has(Number(input.value));
  $("editor-title").textContent = "تعديل الحملة";
  preview();
  form.scrollIntoView({ behavior: "smooth" });
}
function preview() {
  const form = $("campaign-form");
  $("recipient-picker").hidden = form.elements.audience_mode.value !== "users";
  $("preview-title").textContent =
    form.elements.title.value || "عنوان رسالتك هنا";
  $("preview-body").textContent =
    form.elements.body.value || "كلمات قليلة، تواصل أفضل.";
}
const pages = {
  overview: "لوحة التحكم",
  campaigns: "الحملات",
  notifications: "الإشعارات",
  subscribers: "المشتركون",
  types: "أنواع الإشعارات",
  analytics: "التحليلات",
  devices: "الأجهزة والربط",
  settings: "الإعدادات",
};
function navigate(name) {
  if (!pages[name]) return;
  for (const button of document.querySelectorAll("[data-tab]"))
    button.classList.toggle("selected", button.dataset.tab === name);
  for (const panel of document.querySelectorAll("[data-panel]"))
    panel.hidden = panel.dataset.panel !== name;
  $("page-title").textContent = pages[name];
  $("breadcrumb").textContent = `CMS / ${pages[name]}`;
}
function matches(value) {
  return String(value)
    .toLowerCase()
    .includes($("global-search").value.trim().toLowerCase());
}
function audienceDescription(c) {
  if (c.audience_mode !== "users") return "الجمهور حسب الشريحة";
  const ids = JSON.parse(c.subscriber_ids || "[]");
  return ids
    .map((id) => {
      const user = state.subscribers.find((user) => user.id === id);
      return user ? `${user.name} (${user.reference})` : `مشترك #${id}`;
    })
    .join("، ");
}
function badge(status) {
  return element(
    "span",
    labels[status] || status,
    `badge ${status}${["failed", "unknown"].includes(status) ? " error" : ""}`,
  );
}
function campaignRow(c) {
  const tr = element("tr", undefined, "list-row");
  tr.dataset.campaignId = c.id;
  const name = element("td");
  name.append(element("strong", c.name));
  const platform = element("td", c.platform),
    audience = element("td", audienceDescription(c));
  audience.append(element("small", `شريحة ${c.segment}`));
  const status = element("td");
  status.append(badge(c.status));
  const date = element(
    "td",
    c.scheduled_at ? when(c.scheduled_at) : "إرسال يدوي",
  );
  const controls = element("td"),
    buttons = element("div", undefined, "actions");
  controls.append(buttons);
  tr.append(name, platform, audience, status, date, controls);
  $("campaign-list").append(tr);
  return buttons;
}
function renderRecipients() {
  const selected = new Set(
    [...$("recipient-list").querySelectorAll("input:checked")].map((input) =>
      Number(input.value),
    ),
  );
  $("recipient-list").replaceChildren();
  for (const user of state.subscribers) {
    const label = element("label", undefined, "check-label"),
      input = element("input"),
      text = element("span", user.name);
    input.type = "checkbox";
    input.name = "subscriberIds";
    input.value = user.id;
    input.checked = selected.has(user.id);
    text.append(element("small", `رقم المشترك: ${user.reference}`));
    label.append(input, text);
    $("recipient-list").append(label);
  }
  $("recipient-picker").hidden =
    $("campaign-form").elements.audience_mode.value !== "users";
}
function renderSubscribers() {
  $("subscriber-list").replaceChildren();
  for (const user of state.subscribers) {
    if (!matches(`${user.name} ${user.reference}`)) continue;
    const buttons = row(
      $("subscriber-list"),
      user.name,
      `رقم المشترك: ${user.reference}`,
    );
    buttons.append(
      action("تعديل الاسم", () => {
        $("subscriber-form").elements.reference.value = user.reference;
        $("subscriber-form").elements.name.value = user.name;
        $("subscriber-form").scrollIntoView({ behavior: "smooth" });
      }),
      action("اختيار لحملة", () => {
        navigate("campaigns");
        $("campaign-form").elements.audience_mode.value = "users";
        for (const input of $("recipient-list").querySelectorAll("input"))
          if (Number(input.value) === user.id) input.checked = true;
        preview();
        $("campaign-form").scrollIntoView({ behavior: "smooth" });
      }),
    );
  }
  if (!state.subscribers.length)
    $("subscriber-list").append(
      element(
        "p",
        "أضف رقم المشترك واسمه، ثم اربط أجهزته من قسم الأجهزة والربط.",
      ),
    );
}
function renderTypes() {
  $("type-list").replaceChildren();
  for (const type of state.notificationTypes) {
    if (!matches(`${type.name} ${type.key} ${type.title} ${type.body}`))
      continue;
    const buttons = row(
      $("type-list"),
      type.name,
      `${type.key} · ${type.active ? "مفعّل" : "معطّل"}`,
    );
    buttons.parentElement.firstElementChild.append(
      element("p", type.title),
      element("div", type.body, "template-preview"),
    );
    buttons.append(
      action("تعديل", () => {
        for (const field of ["key", "name", "title", "body"])
          $("type-form").elements[field].value = type[field];
        $("type-form").elements.active.checked = !!type.active;
        $("type-form").elements.key.readOnly = true;
        $("type-editor-title").textContent = "تعديل نوع الإشعار";
        $("type-form").scrollIntoView({ behavior: "smooth" });
      }),
      action(type.active ? "تعطيل" : "تفعيل", async () => {
        await api("/notification-types", "POST", {
          ...type,
          active: !type.active,
        });
        await refresh();
        notice("تم تحديث حالة النوع للأحداث الجديدة.");
      }),
    );
  }
}
function drawChart(parent) {
  parent.replaceChildren();
  if (!state.daily.length) {
    parent.append(
      element("div", "لا توجد حملات خلال آخر سبعة أيام.", "empty-chart"),
    );
    return;
  }
  const ns = "http://www.w3.org/2000/svg";
  function svgNode(tag, attrs, text) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs))
      node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  const svg = svgNode("svg", {
    viewBox: "0 0 560 260",
    class: "chart",
    role: "img",
    "aria-label":
      "طلبات الحملات المقبولة والفاشلة بحسب تاريخ إنشاء الحملة خلال سبعة أيام",
  });
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
  );
  const records = days.map(
    (day) =>
      state.daily.find((record) => record.day === day) || {
        accepted: 0,
        failed: 0,
      },
  );
  const max = Math.max(
    1,
    ...records.flatMap((record) => [record.accepted, record.failed]),
  );
  for (let i = 0; i < 5; i++) {
    const y = 215 - i * 45;
    svg.append(
      svgNode("line", { x1: 45, x2: 540, y1: y, y2: y, stroke: "#e8eef6" }),
      svgNode(
        "text",
        { x: 38, y: y + 4, "text-anchor": "end" },
        Math.round((max * i) / 4),
      ),
    );
  }
  for (const [field, color] of [
    ["accepted", "#e9ae10"],
    ["failed", "#ef8934"],
  ]) {
    const points = records.map((record, i) => [
      45 + i * 82.5,
      215 - (180 * record[field]) / max,
    ]);
    svg.append(
      svgNode("polyline", {
        points: points.map((p) => p.join(",")).join(" "),
        fill: "none",
        stroke: color,
        "stroke-width": 2.5,
      }),
    );
    for (let i = 0; i < points.length; i++) {
      const circle = svgNode("circle", {
        cx: points[i][0],
        cy: points[i][1],
        r: 3.5,
        fill: color,
      });
      circle.append(
        svgNode(
          "title",
          {},
          `${days[i]} · ${field === "accepted" ? "قبول" : "فشل/غير معروف"}: ${records[i][field]}`,
        ),
      );
      svg.append(circle);
    }
  }
  days.forEach((day, i) =>
    svg.append(
      svgNode(
        "text",
        { x: 45 + i * 82.5, y: 245, "text-anchor": "middle" },
        new Date(day + "T00:00:00Z").toLocaleDateString("ar", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
      ),
    ),
  );
  parent.append(svg);
}
function renderOverview() {
  $("recent-campaigns").replaceChildren();
  for (const c of state.campaigns
    .filter((c) => matches(`${c.name} ${audienceDescription(c)}`))
    .slice(0, 6)) {
    const tr = element("tr"),
      status = element("td"),
      controls = element("td");
    status.append(badge(c.status));
    controls.append(
      action("عرض", () => {
        navigate("campaigns");
        document
          .querySelector(`[data-campaign-id="${c.id}"]`)
          ?.scrollIntoView({ behavior: "smooth" });
      }),
    );
    tr.append(
      element("td", c.name),
      element("td", audienceDescription(c)),
      status,
      controls,
    );
    $("recent-campaigns").append(tr);
  }
  if (!state.campaigns.length) {
    const tr = element("tr"),
      td = element("td", "لا توجد حملات بعد.");
    td.colSpan = 4;
    tr.append(td);
    $("recent-campaigns").append(tr);
  }
  drawChart($("performance-chart"));
  drawChart($("analytics-chart"));
  $("analytics-summary").replaceChildren();
  for (const [label, value] of [
    ["إجمالي الحملات", state.totals.campaigns],
    ["المشتركون المسجلون", state.totals.subscribers],
    ["الأجهزة النشطة", state.totals.devices],
    ["طلبات الحملات المقبولة", state.totals.accepted],
    ["فشل أو نتيجة غير معروفة", state.totals.failed],
  ]) {
    const row = element("div", undefined, "metric-row");
    row.append(
      element("span", label),
      element("strong", Number(value).toLocaleString("ar")),
    );
    $("analytics-summary").append(row);
  }
  const parts = [
    ["sent", "#13b887"],
    ["sending", "#ffc516"],
    ["scheduled", "#4f94f5"],
    ["draft", "#b0bccd"],
  ].map(([status, color]) => ({
    status,
    color,
    count: state.campaigns.filter((c) => c.status === status).length,
  }));
  $("campaign-distribution").replaceChildren();
  const total = state.campaigns.length;
  if (total) {
    const wrap = element("div", undefined, "donut-wrap"),
      donut = element("div", undefined, "donut"),
      center = element("div", total, "donut-center"),
      legend = element("div", undefined, "donut-legend");
    center.append(element("small", "حملة معروضة"));
    donut.append(center);
    let offset = 0;
    donut.style.background = `conic-gradient(${parts
      .map((part) => {
        const start = offset;
        offset += (100 * part.count) / total;
        return `${part.color} ${start}% ${offset}%`;
      })
      .join(",")})`;
    for (const part of parts) {
      const entry = element("div"),
        dot = element("i");
      dot.style.background = part.color;
      entry.append(
        dot,
        document.createTextNode(`${labels[part.status]} · ${part.count}`),
      );
      legend.append(entry);
    }
    wrap.append(donut, legend);
    $("campaign-distribution").append(wrap);
  } else
    $("campaign-distribution").append(element("p", "ابدأ بإنشاء أول حملة."));
  $("recent-activity").replaceChildren();
  const activity = [
    ...state.campaigns.map((c) => ({
      name: c.name,
      date: c.updated_at || c.created_at,
      status: c.status,
    })),
    ...(state.payments || []).map((p) => ({
      name: `تجربة ${p.event_name || "تسديد فاتورة"}`,
      date: p.paid_at,
      status: p.notification_status,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  for (const entry of activity) {
    const item = element("div", undefined, "activity-item");
    item.append(
      element("span", entry.name),
      element(
        "small",
        `${labels[entry.status] || entry.status} · ${when(entry.date)}`,
      ),
    );
    $("recent-activity").append(item);
  }
  if (!activity.length)
    $("recent-activity").append(
      element("p", "سيظهر نشاط الحملات والإشعارات هنا."),
    );
}
function render() {
  $("campaign-count").textContent = state.totals.campaigns;
  $("device-count").textContent = state.totals.devices;
  $("accepted-count").textContent = state.totals.accepted;
  $("subscriber-count").textContent = `${state.totals.subscribers} مشترك مسجل`;
  $("success-rate").textContent =
    state.totals.accepted + state.totals.failed
      ? `${((100 * state.totals.accepted) / (state.totals.accepted + state.totals.failed)).toFixed(1)}%`
      : "—";
  renderOverview();
  renderRecipients();
  renderSubscribers();
  renderTypes();
  $("user-name").textContent = state.user.name;
  $("firebase-status").textContent = state.firebaseConfigured
    ? "سر Firebase مضاف. استخدم الفحص للتحقق من المصادقة وصلاحية API دون إرسال."
    : "سر Firebase لم يُضف بعد؛ لن تعمل الإشعارات قبل إضافته.";
  for (const name of [
    "campaign-list",
    "device-list",
    "delivery-list",
    "payment-list",
  ])
    $(name).replaceChildren();
  if (!state.campaigns.length) {
    const tr = element("tr"),
      td = element("td", "ابدأ بحملة موجهة إلى شريحة test.");
    td.colSpan = 6;
    tr.append(td);
    $("campaign-list").append(tr);
  }
  for (const c of state.campaigns) {
    if (
      !matches(
        `${c.name} ${c.title} ${c.body} ${audienceDescription(c)} ${c.segment}`,
      )
    )
      continue;
    const buttons = campaignRow(c);
    if (c.error) buttons.parentElement.append(element("small", c.error));
    if (c.status === "sent") {
      buttons.append(
        action(
          "إعادة إرسال",
          async () => {
            if (
              !confirm(
                `إعادة إرسال «${c.name}» إلى ${audienceDescription(c)}، ${c.platform} وشريحة ${c.segment} الآن؟ ستُنشأ نسخة جديدة للإرسال إلى الأجهزة النشطة، مع حفظ سجل الحملة السابقة.`,
              )
            )
              return;
            const copy = await api(`/campaigns/${c.id}/duplicate`, "POST", {});
            try {
              await api(`/campaigns/${copy.id}/send`, "POST", {});
            } catch (error) {
              await refresh();
              const current = state.campaigns.find(
                (campaign) => campaign.id === copy.id,
              );
              if (current?.status === "draft") edit(current);
              throw new Error(
                `تعذر تأكيد بدء إعادة الإرسال: ${error.message} النسخة محفوظة في قائمة الحملات؛ راجع حالتها قبل المحاولة مجددًا.`,
              );
            }
            await refresh();
            notice(
              "بدأت إعادة إرسال الحملة في طلب جديد؛ سجل الحملة السابقة محفوظ.",
            );
          },
          "primary",
        ),
        action("نسخ للتعديل", async () => {
          const copy = await api(`/campaigns/${c.id}/duplicate`, "POST", {});
          await refresh();
          edit(copy);
          notice(
            "جُهّزت نسخة جديدة بنفس المحتوى والجمهور. راجعها ثم اضغط إرسال الآن؛ سجل الحملة السابقة محفوظ.",
          );
        }),
      );
    }
    if (c.status === "sending")
      buttons.parentElement.append(
        element(
          "small",
          "تتحدث النتائج تلقائيًا أثناء الإرسال. سيظهر زر إعادة الإرسال بعد اكتمال الطلب.",
        ),
      );
    if (["draft", "scheduled"].includes(c.status)) {
      buttons.append(action("تعديل", () => edit(c)));
      buttons.append(
        action("إرسال الآن", async () => {
          if (
            !confirm(
              `إرسال «${c.name}» إلى ${audienceDescription(c)}، ${c.platform} وشريحة ${c.segment} الآن؟`,
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
    const subscriber = state.subscribers.find((s) => s.id === d.subscriber_id);
    if (
      !matches(
        `${d.id} ${subscriber?.name || ""} ${subscriber?.reference || ""}`,
      )
    )
      continue;
    const buttons = row(
      $("device-list"),
      `الجهاز #${d.id}`,
      `${d.platform} · ${d.segment} · ${d.active ? "نشط" : "غير نشط"} · ${subscriber ? subscriber.name + " · رقم " + subscriber.reference : "غير مرتبط بمشترك"}`,
    );
    const select = element("select");
    select.setAttribute("aria-label", `مشترك الجهاز #${d.id}`);
    const none = element("option", "غير مرتبط بمشترك");
    none.value = "";
    select.append(none);
    for (const user of state.subscribers) {
      const option = element("option", `${user.name} · ${user.reference}`);
      option.value = user.id;
      select.append(option);
    }
    select.value = d.subscriber_id ?? "";
    buttons.append(
      select,
      action("حفظ ربط المشترك", async () => {
        await api(`/devices/${d.id}/subscriber`, "PUT", {
          subscriberId: select.value ? Number(select.value) : null,
        });
        await refresh();
        notice("تم تحديث ربط الجهاز بالمشترك.");
      }),
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
  if (!state.payments?.length)
    $("payment-list").append(
      element("p", "لم تُنفذ عمليات تسديد تجريبية بعد."),
    );
  for (const payment of state.payments || [])
    row(
      $("payment-list"),
      `${payment.event_name || "تسديد فاتورة"} · ${payment.amount.toLocaleString("ar")} ل.س`,
      `الجهاز #${payment.device_id} · ${when(payment.paid_at)} · ${payment.error || payment.id}`,
      payment.notification_status === "sending"
        ? "inflight"
        : payment.notification_status,
    );
}
async function refresh() {
  state = await api("/admin");
  render();
}
let autoRefreshing = false;
setInterval(async () => {
  if (
    document.hidden ||
    $("dashboard").hidden ||
    autoRefreshing ||
    (!state.campaigns.some((campaign) => campaign.status === "sending") &&
      !state.payments?.some((payment) =>
        ["pending", "sending"].includes(payment.notification_status),
      ))
  )
    return;
  autoRefreshing = true;
  try {
    await refresh();
  } catch {
    // Leave the current view available; manual refresh reports any error.
  } finally {
    autoRefreshing = false;
  }
}, 5000);
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
    const data = new FormData(event.target);
    const body = Object.fromEntries(data);
    body.subscriberIds =
      body.audience_mode === "users"
        ? data.getAll("subscriberIds").map(Number)
        : [];
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
  button.addEventListener("click", () => navigate(button.dataset.tab));
for (const button of document.querySelectorAll("[data-go]"))
  button.addEventListener("click", () => navigate(button.dataset.go));
$("create-campaign").addEventListener("click", () => {
  navigate("campaigns");
  $("new-campaign").click();
  $("campaign-form").scrollIntoView({ behavior: "smooth" });
});
$("global-search").addEventListener("input", () => {
  if (state.user) render();
});
$("subscriber-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.target.querySelector("[type=submit]"), async () => {
    await api(
      "/subscribers",
      "POST",
      Object.fromEntries(new FormData(event.target)),
    );
    event.target.reset();
    await refresh();
    notice("تم حفظ المشترك. اربط أجهزته به من قسم الأجهزة والربط.");
  });
});
$("type-form").addEventListener("submit", (event) => {
  event.preventDefault();
  run(event.target.querySelector("[type=submit]"), async () => {
    const body = Object.fromEntries(new FormData(event.target));
    body.active = event.target.elements.active.checked;
    await api("/notification-types", "POST", body);
    event.target.reset();
    event.target.elements.key.readOnly = false;
    $("type-editor-title").textContent = "نوع إشعار جديد";
    await refresh();
    notice("تم حفظ نوع الإشعار؛ ينطبق القالب على الأحداث الجديدة.");
  });
});
$("new-type").addEventListener("click", () => {
  $("type-form").reset();
  $("type-form").elements.key.readOnly = false;
  $("type-editor-title").textContent = "نوع إشعار جديد";
});
$("cms-url").value = location.origin;
$("timezone").textContent =
  "الموعد بحسب المنطقة الزمنية لجهازك: " +
  Intl.DateTimeFormat().resolvedOptions().timeZone;
boot().catch((error) => notice(error.message, true));
