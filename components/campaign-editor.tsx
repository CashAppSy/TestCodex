"use client";
import Link from "next/link";
import { useActionState, useState, useEffect } from "react";
import {
  saveCampaignAction,
  sendCampaignAction,
  deleteCampaignAction,
} from "@/app/actions";
import type { Campaign } from "@/lib/store";
import { labels } from "./campaign-labels";
export default function CampaignEditor({
  campaign,
  saved,
  audienceCount,
  ready,
}: {
  campaign?: Campaign;
  saved?: boolean;
  audienceCount: number;
  ready: boolean;
}) {
  const [state, action, pending] = useActionState(saveCampaignAction, {
    error: "",
  });
  const [sendState, sendAction, sending] = useActionState(sendCampaignAction, {
    error: "",
  });
  const [title, setTitle] = useState(campaign?.title || "");
  const [body, setBody] = useState(campaign?.body || "");
  const [name, setName] = useState(campaign?.name || "");
  const [platform, setPlatform] = useState(campaign?.platform || "all");
  const [segment, setSegment] = useState(campaign?.segment || "all");
  const [link, setLink] = useState(campaign?.link || "");
  const editable =
    !campaign || ["draft", "scheduled"].includes(campaign.status);
  const [date, setDate] = useState("");
  useEffect(() => {
    if (!campaign?.scheduled_at) return;
    const scheduled = new Date(campaign.scheduled_at);
    setDate(
      new Date(scheduled.getTime() - scheduled.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
    );
  }, [campaign?.scheduled_at]);
  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="back-link" href="/admin/campaigns">
            → كل الحملات
          </Link>
          <h1>{campaign ? campaign.name : "رسالتك القادمة."}</h1>
          <p className="muted">رسالة واضحة، لجمهور مهتم، في الوقت المناسب.</p>
        </div>
        {campaign && (
          <span className={`badge ${campaign.status}`}>
            {labels[campaign.status]}
          </span>
        )}
      </div>
      {saved && (
        <p className="notice success" role="status">
          تم حفظ الحملة.
        </p>
      )}
      <form action={action} className="editor-grid">
        <section className="panel editor-main">
          <input type="hidden" name="id" value={campaign?.id || ""} />
          <fieldset disabled={!editable || pending}>
            <label>
              اسم الحملة
              <input
                name="name"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="مثلًا: إطلاق الميزة الجديدة"
              />
              <span className="field-hint">
                اسم داخلي، لن يظهر لمستخدمي التطبيق.
              </span>
            </label>
            <label>
              عنوان الإشعار
              <input
                name="title"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="شيء جديد ينتظرك ✨"
              />
              <span className="field-hint">{title.length} / 100</span>
            </label>
            <label>
              نص الإشعار
              <textarea
                name="body"
                required
                maxLength={500}
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="أخبر جمهورك بما يهمّه…"
              />
              <span className="field-hint">{body.length} / 500</span>
            </label>
            <div className="form-columns">
              <label>
                النظام
                <select
                  name="platform"
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                >
                  <option value="all">Android و iOS</option>
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </label>
              <label>
                شريحة الجمهور
                <input
                  name="segment"
                  pattern="[a-zA-Z0-9_-]{1,64}"
                  maxLength={64}
                  value={segment}
                  onChange={(event) => setSegment(event.target.value)}
                  required
                  dir="ltr"
                />
                <span className="field-hint">
                  all لكل الأجهزة، أو اسم الشريحة عند تسجيلها.
                </span>
              </label>
            </div>
            <label>
              رابط عند فتح الإشعار <span className="muted">(اختياري)</span>
              <input
                name="link"
                maxLength={1000}
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="myapp://offers أو https://…"
                dir="ltr"
              />
              <span className="field-hint">
                يجب أن يعالج التطبيق قيمة data.url عند فتح الإشعار.
              </span>
            </label>
            <label>
              موعد الإرسال <span className="muted">(اختياري)</span>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="hidden"
                name="scheduled_at"
                value={
                  date && Number.isFinite(new Date(date).getTime())
                    ? new Date(date).toISOString()
                    : ""
                }
              />
              <span className="field-hint">
                بتوقيت جهازك. اتركه فارغًا للحفظ كمسودة. تتطلب الجدولة تشغيل
                العامل.
              </span>
            </label>
          </fieldset>
          {state.error && (
            <p role="alert" className="notice error">
              {state.error}
            </p>
          )}
          {editable && (
            <button className="button" disabled={pending}>
              {pending
                ? "جارٍ الحفظ…"
                : date
                  ? "حفظ وجدولة ←"
                  : "حفظ المسودة ←"}
            </button>
          )}
        </section>
        <aside className="editor-side">
          <section className="panel settings-panel">
            <span className="eyebrow">معاينة تقريبية</span>
            <h2>هكذا تبدو رسالتك</h2>
            <div className="notification-preview">
              <div>
                <span className="preview-app">◉</span>
                <strong>تطبيقك</strong>
                <small>الآن</small>
              </div>
              <h3>{title || "عنوان الإشعار"}</h3>
              <p>{body || "نص رسالتك سيظهر هنا. اجعله بسيطًا ومفيدًا."}</p>
            </div>
            <p className="small muted">
              قد يختلف العرض الفعلي حسب نظام الجهاز.
            </p>
          </section>
          {campaign && (
            <section className="panel settings-panel">
              <h2>تفاصيل الإرسال</h2>
              <div className="detail-row">
                <span>أجهزة الجمهور النشطة</span>
                <strong>{audienceCount}</strong>
              </div>
              <div className="detail-row">
                <span>طلبات مقبولة</span>
                <strong>{campaign.accepted}</strong>
              </div>
              <div className="detail-row">
                <span>طلبات فاشلة</span>
                <strong>{campaign.failed}</strong>
              </div>
              <p className="small muted">
                الطلب المقبول لا يعني وصول الإشعار أو فتحه.
              </p>
              {campaign.error && (
                <p className="notice error">{campaign.error}</p>
              )}
            </section>
          )}
        </aside>
      </form>
      {campaign && editable && (
        <section className="panel send-panel">
          <div>
            <h2>جاهز للإرسال؟</h2>
            <p className="muted">
              سيُرسل المحتوى المحفوظ إلى {audienceCount} جهاز. احفظ تعديلاتك
              أولًا.
            </p>
            {!ready && (
              <Link className="text-link" href="/admin/settings">
                أكمل ربط المزوّد قبل الإرسال ←
              </Link>
            )}
            {sendState.error && (
              <p className="notice error" role="alert">
                {sendState.error}
              </p>
            )}
          </div>
          <form
            action={sendAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `إرسال هذه الحملة الآن إلى ${audienceCount} جهاز؟`,
                )
              )
                e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={campaign.id} />
            <button
              className="button"
              disabled={!ready || !audienceCount || sending}
            >
              {sending ? "جارٍ الإرسال…" : "إرسال الآن ↗"}
            </button>
          </form>
        </section>
      )}
      {campaign && editable && (
        <form
          action={deleteCampaignAction}
          className="delete-form"
          onSubmit={(e) => {
            if (!window.confirm("حذف الحملة نهائيًا؟")) e.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={campaign.id} />
          <button className="delete-button">حذف الحملة</button>
        </form>
      )}
    </>
  );
}
