"use client";
import { useActionState } from "react";
import { mobilePairingAction } from "@/app/actions";
export default function MobilePairing() {
  const [state, action, pending] = useActionState(mobilePairingAction, {
    code: "",
    expiresAt: 0,
    error: "",
  });
  return (
    <section className="panel settings-panel">
      <h2>ربط تطبيق Android التجريبي</h2>
      <p>
        في تطبيق نبض، افتح «ربط اللوحة»، أدخل عنوان هذه اللوحة ورمز الربط. يُسجل
        الجهاز تلقائيًا ضمن شريحة <code>test</code> دون وضع مفتاح API الخاص
        بالخادم في التطبيق.
      </p>
      <form action={action}>
        <button className="button secondary" disabled={pending}>
          {pending ? "جارٍ الإنشاء…" : "إنشاء رمز ربط"}
        </button>
      </form>
      {state.code && (
        <div className="notice success" style={{ marginTop: 16 }}>
          <strong>رمز الربط</strong>
          <p
            data-testid="pairing-code"
            dir="ltr"
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              letterSpacing: 2,
              userSelect: "all",
            }}
          >
            {state.code.match(/.{1,4}/g)?.join("-")}
          </p>
          <p>صالح لمدة 10 دقائق ولمرة واحدة. إنشاء رمز جديد يلغي السابق.</p>
        </div>
      )}
      <p>
        للتجربة، أنشئ حملة تستهدف Android والشريحة <code>test</code>، وأضف
        رابطًا مثل <code>nabdh://campaign/hello</code>.
      </p>
    </section>
  );
}
