import React, { useEffect, useState, useRef } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  listPayments,
  payDemo,
  listNotificationTypes,
  ApiError,
  type DemoPayment,
  type NotificationType,
} from "./api";
import type { Connection } from "./storage";

const labels: Record<string, string> = {
  pending: "بانتظار إرسال الإشعار",
  sending: "جارٍ طلب الإرسال",
  accepted: "قبل Firebase الإشعار",
  failed: "فشل إرسال الإشعار",
  unknown: "قبول الإشعار غير معروف",
};
export default function PaymentScreen({
  connection,
  selectedId,
  preview,
}: {
  connection: Connection | null;
  selectedId: string | null;
  preview: boolean;
}) {
  const [items, setItems] = useState<DemoPayment[]>([]),
    [detail, setDetail] = useState<DemoPayment | null>(null);
  const [amount, setAmount] = useState("20000"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [types, setTypes] = useState<NotificationType[]>([]);
  const [eventType, setEventType] = useState("invoice_paid");
  useEffect(() => {
    if (!connection || preview) return;
    let active = true;
    void listNotificationTypes(connection)
      .then((values) => {
        if (!active) return;
        setTypes(values);
        setEventType((current) =>
          values.some((value) => value.key === current)
            ? current
            : values[0]?.key || "",
        );
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [connection, preview]);
  const refresh = async (id?: string) => {
    if (!connection || preview) return;
    const records = await listPayments(connection);
    setItems(records);
    if (id) {
      const own = await listPayments(connection, id);
      setDetail(own[0] || null);
      if (!own.length) setMessage("لم تُوجد العملية في حساب هذا الجهاز.");
    }
  };
  useEffect(() => {
    setDetail(null);
    void refresh(selectedId || undefined).catch((e) => setMessage(e.message));
  }, [connection, selectedId]);
  const running = useRef(false);
  const run = async (fn: () => Promise<void>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "تعذر إكمال التجربة.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const pay = (delayed: boolean) =>
    void run(async () => {
      if (!connection || preview)
        throw new Error("اربط نسخة Android باللوحة أولًا.");
      const key = `cash-mobile-payment-attempt:${connection.url}:${connection.deviceId}:${connection.account?.id || "legacy"}`;
      const saved = await AsyncStorage.getItem(key);
      const attempt = saved
        ? JSON.parse(saved)
        : {
            requestId: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            amount: Number(amount),
            delayed,
            eventType,
          };
      if (
        !Number.isSafeInteger(attempt.amount) ||
        attempt.amount < 1 ||
        attempt.amount > 10000000
      )
        throw new Error("أدخل مبلغًا صحيحًا بين 1 و10,000,000 ل.س.");
      await AsyncStorage.setItem(key, JSON.stringify(attempt));
      let payment: DemoPayment;
      try {
        payment = await payDemo(
          connection,
          attempt.requestId,
          attempt.amount,
          attempt.delayed,
          attempt.eventType || "invoice_paid",
        );
      } catch (error) {
        // A rejected request was not created; a timeout keeps its stable ID.
        if (error instanceof ApiError && error.status === 400)
          await AsyncStorage.removeItem(key);
        throw error;
      }
      await AsyncStorage.removeItem(key);
      setDetail(payment);
      await refresh(payment.id);
      setMessage(
        attempt.delayed
          ? "سُجل الحدث التجريبي. ضع التطبيق في الخلفية؛ يُرسل الإشعار بعد 15 ثانية عند الدورة التالية للعامل، عادةً خلال نحو دقيقة."
          : "سُجل الحدث التجريبي وبدأ طلب الإشعار إلى هذا الجهاز.",
      );
    });
  const button = (label: string, fn: () => void, disabled = busy) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={fn}
      style={[s.button, disabled && { opacity: 0.45 }]}
    >
      <Text style={s.buttonText}>{label}</Text>
    </Pressable>
  );
  return (
    <View>
      <Text style={s.title}>تجارب الإشعارات الآلية</Text>
      <Text style={s.text}>
        اختر نوع الحدث وجرب إشعاره على هذا الجهاز. لا يُخصم مال حقيقي، ولا تُربط
        هذه التجربة بنظام فواتيرك الفعلي.
      </Text>
      {preview && (
        <Text style={s.text}>
          هذه معاينة للواجهة. الإرسال الحقيقي متاح في نسخة Android المرتبطة.
        </Text>
      )}
      {!!message && (
        <Text accessibilityRole="alert" style={s.message}>
          {message}
        </Text>
      )}
      <View style={s.card}>
        <Text style={s.heading}>نوع الإشعار</Text>
        {types.map((type) => (
          <Pressable
            key={type.key}
            accessibilityRole="radio"
            accessibilityState={{
              checked: type.key === eventType,
              disabled: busy,
            }}
            disabled={busy}
            onPress={() => setEventType(type.key)}
            style={[s.typeOption, type.key === eventType && s.typeSelected]}
          >
            <Text style={s.text}>
              {type.key === eventType ? "◉" : "○"} {type.name}
            </Text>
          </Pressable>
        ))}
        {!types.length && (
          <Text style={s.text}>
            تظهر الأنواع المفعّلة بعد الربط. يمكنك إضافتها أو تعديلها من قسم
            أنواع الإشعارات في اللوحة.
          </Text>
        )}
        <Text style={s.text}>المبلغ — ليرة سورية</Text>
        <TextInput
          accessibilityLabel="مبلغ الفاتورة التجريبية"
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
          editable={!busy}
          style={s.input}
        />
        {button(
          "تجربة الحدث وإشعار فوري",
          () => pay(false),
          busy || !connection || preview || !eventType || !types.length,
        )}
        {button(
          "تجربة الحدث وإشعار في الخلفية",
          () => pay(true),
          busy || !connection || preview || !eventType || !types.length,
        )}
        <Text style={s.text}>
          إذا انقطع الاتصال، أعد الضغط؛ تُستخدم العملية المعلّقة نفسها لمنع
          التكرار.
        </Text>
      </View>
      {detail && (
        <View style={s.card}>
          <Text style={s.heading}>تفاصيل العملية التجريبية</Text>
          <Text style={s.text}>
            النوع: {detail.event_name || "تسديد فاتورة"} · حدث تجريبي
          </Text>
          <Text style={s.text}>
            المبلغ: {detail.amount.toLocaleString("ar")} ل.س
          </Text>
          <Text style={s.text}>
            التاريخ: {new Date(detail.paid_at).toLocaleString("ar")}
          </Text>
          <Text selectable style={s.text}>
            رقم العملية: {detail.id}
          </Text>
          <Text style={s.text}>
            {labels[detail.notification_status] || detail.notification_status}
          </Text>
          {!!detail.error && <Text style={s.message}>{detail.error}</Text>}
          {button(
            "اختبار منع التكرار: إعادة طلب العملية نفسها",
            () =>
              void run(async () => {
                if (!connection) return;
                const same = await payDemo(
                  connection,
                  detail.request_id,
                  detail.amount,
                  false,
                  detail.event_type || "invoice_paid",
                );
                setDetail(same);
                await refresh(same.id);
                setMessage(
                  "أُعيدت العملية نفسها دون إنشاء تسديد أو طلب إشعار إضافي.",
                );
              }),
            busy || !connection || preview,
          )}
        </View>
      )}
      {button(
        "تحديث سجل العمليات",
        () => void run(() => refresh(detail?.id)),
        busy || !connection || preview,
      )}
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => setDetail(item)}
          style={s.card}
          accessibilityRole="button"
        >
          <Text style={s.heading}>
            {item.event_name || "تسديد فاتورة"} ·{" "}
            {item.amount.toLocaleString("ar")} ل.س
          </Text>
          <Text style={s.text}>{labels[item.notification_status]}</Text>
          <Text style={s.text}>
            {new Date(item.paid_at).toLocaleString("ar")}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  typeOption: {
    borderWidth: 1,
    borderColor: "#dce5d0",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  typeSelected: { borderColor: "#365e42", backgroundColor: "#eff5e6" },
  title: {
    fontSize: 27,
    fontWeight: "700",
    color: "#29352c",
    textAlign: "right",
    marginBottom: 14,
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "right",
    color: "#365e42",
  },
  text: {
    fontSize: 12,
    lineHeight: 24,
    textAlign: "right",
    color: "#637360",
    marginVertical: 6,
  },
  message: {
    textAlign: "right",
    color: "#365e42",
    backgroundColor: "#eff5e6",
    padding: 14,
    lineHeight: 24,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 13,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dce5d0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#365e42",
    borderRadius: 9,
    padding: 14,
    marginBottom: 10,
  },
  buttonText: { color: "white", textAlign: "center", fontSize: 12 },
});
