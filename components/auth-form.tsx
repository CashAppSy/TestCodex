"use client";
import { useActionState, useState } from "react";
import { loginAction, setupAction } from "@/app/actions";
export default function AuthForm({ setup = false }: { setup?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState(
    setup ? setupAction : loginAction,
    { error: "" },
  );
  return (
    <form action={action} className="auth-form">
      {setup && (
        <label>
          الاسم
          <input
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            placeholder="أحمد خالد"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      )}
      <label>
        البريد الإلكتروني
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label>
        كلمة المرور
        <input
          name="password"
          type="password"
          required
          minLength={setup ? 12 : 1}
          maxLength={256}
          autoComplete={setup ? "new-password" : "current-password"}
        />
      </label>
      {setup && (
        <p className="muted small">
          استخدم 12 حرفًا على الأقل. سيكون هذا حساب المدير.
        </p>
      )}
      {state.error && (
        <p className="notice error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "لحظة…" : setup ? "إنشاء حساب المدير ←" : "تسجيل الدخول ←"}
      </button>
    </form>
  );
}
