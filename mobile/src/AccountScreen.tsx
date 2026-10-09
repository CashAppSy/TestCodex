import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Connection } from "./storage";
import { authenticateAccount } from "./api";
import { getFcmToken } from "./notifications";

export default function AccountScreen({
  connection,
  onAuthenticated,
  onLogout,
  onSync,
  onLegacyPairing,
  preview = false,
}: {
  connection: Connection | null;
  onAuthenticated: (value: Connection) => Promise<void>;
  onLogout: () => void;
  onSync: () => void;
  onLegacyPairing: () => void;
  preview?: boolean;
}) {
  const [registering, setRegistering] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const submit = async () => {
    if (running.current || preview) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      if (registering && !name.trim()) throw new Error("أدخل اسمك.");
      if (password.length < 8 || password.length > 128)
        throw new Error("استخدم كلمة مرور من 8 إلى 128 حرفًا.");
      if (registering && password !== confirm)
        throw new Error("تأكيد كلمة المرور غير مطابق.");
      const value = await authenticateAccount(
        phone,
        password,
        await getFcmToken(),
        registering ? name : undefined,
      );
      await onAuthenticated(value);
      setPassword("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const button = (title: string, fn: () => void, secondary = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={fn}
      disabled={busy || (preview && !secondary)}
      style={[s.button, secondary && s.secondary, busy && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
  return (
    <View>
      <Text accessibilityRole="header" style={s.title}>
        {connection
          ? "حسابي"
          : registering
            ? "إنشاء حساب جديد"
            : "تسجيل الدخول"}
      </Text>
      <Text style={s.text}>Cash Mobile · حسابك وإشعاراتك في مكان واحد</Text>
      {preview && (
        <Text style={s.text}>
          هذه معاينة للواجهة؛ الدخول الحقيقي متاح في نسخة Android.
        </Text>
      )}
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <View style={s.card}>
        {connection ? (
          <>
            <Text style={s.heading}>
              {connection.account?.name || "جهاز اختبار مرتبط"}
            </Text>
            {!!connection.account && (
              <Text style={s.phone}>{connection.account.phone}</Text>
            )}
            <Text style={s.text}>
              {connection.account
                ? "جهازك مرتبط بحسابك تلقائيًا لاستقبال حملاتك وإشعاراتك."
                : "هذا ربط تجريبي سابق. سجّل الخروج لإنشاء حساب أو الدخول برقم الهاتف."}
            </Text>
            {button("تحديث تسجيل الإشعارات", onSync)}
            {button("تسجيل الخروج", onLogout, true)}
          </>
        ) : (
          <>
            {registering && (
              <>
                <Text style={s.label}>الاسم</Text>
                <TextInput
                  accessibilityLabel="الاسم"
                  value={name}
                  onChangeText={setName}
                  style={s.input}
                  maxLength={100}
                  editable={!busy}
                  autoComplete="name"
                />
              </>
            )}
            <Text style={s.label}>رقم الهاتف</Text>
            <TextInput
              accessibilityLabel="رقم الهاتف"
              value={phone}
              onChangeText={setPhone}
              style={[s.input, s.phone]}
              keyboardType="phone-pad"
              placeholder="+963 9XX XXX XXX"
              autoComplete="tel"
              maxLength={40}
              editable={!busy}
            />
            <Text style={s.hint}>
              استخدم رمز البلد؛ يمكنك بدء الرقم بـ + أو 00.
            </Text>
            <Text style={s.label}>كلمة المرور</Text>
            <TextInput
              accessibilityLabel="كلمة المرور"
              value={password}
              onChangeText={setPassword}
              style={s.input}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={registering ? "new-password" : "current-password"}
              maxLength={128}
              editable={!busy}
            />
            {registering && (
              <>
                <Text style={s.label}>تأكيد كلمة المرور</Text>
                <TextInput
                  accessibilityLabel="تأكيد كلمة المرور"
                  value={confirm}
                  onChangeText={setConfirm}
                  style={s.input}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={128}
                  editable={!busy}
                />
              </>
            )}
            {busy && <ActivityIndicator color="#365e42" />}
            {button(registering ? "إنشاء الحساب وتسجيل الدخول" : "دخول", () => {
              void submit();
            })}
            {button(
              registering
                ? "لدي حساب — تسجيل الدخول"
                : "مستخدم جديد؟ إنشاء حساب",
              () => {
                setRegistering(!registering);
                setError("");
                setPassword("");
                setConfirm("");
              },
              true,
            )}
            <Text style={s.hint}>
              سيُربط هذا الجهاز بحسابك لاستقبال الإشعارات. التسجيل بكلمة مرور،
              دون تحقق SMS من الرقم.
            </Text>
            {button("ربط تجريبي برمز من اللوحة", onLegacyPairing, true)}
          </>
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#203629",
    textAlign: "right",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: "#758170",
    textAlign: "right",
    lineHeight: 27,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e4e8dd",
    padding: 24,
    gap: 12,
  },
  heading: {
    fontSize: 23,
    fontWeight: "700",
    color: "#203629",
    textAlign: "right",
  },
  label: { fontSize: 16, color: "#445640", textAlign: "right" },
  hint: { fontSize: 13, color: "#758170", textAlign: "right", lineHeight: 23 },
  input: {
    borderWidth: 1,
    borderColor: "#dce2d5",
    backgroundColor: "#fafbf7",
    borderRadius: 15,
    padding: 16,
    fontSize: 18,
    textAlign: "right",
    color: "#203629",
  },
  phone: {
    textAlign: "left",
    writingDirection: "ltr",
    fontSize: 18,
    color: "#203629",
  },
  button: {
    backgroundColor: "#365e42",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondary: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dce2d5",
  },
  secondaryText: { color: "#365e42" },
  error: {
    backgroundColor: "#fae9e3",
    padding: 16,
    color: "#a83927",
    borderRadius: 12,
    textAlign: "right",
    marginBottom: 16,
  },
});
