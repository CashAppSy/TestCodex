import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  loadInbox,
  saveIncoming,
  subscribeInbox,
  clearInbox,
} from "./src/inbox";
import {
  getFcmToken,
  isWebPreview,
  startNotifications,
} from "./src/notifications";
import {
  normalizeNotification,
  notificationDestination,
  type Incoming,
} from "./src/model";
import {
  loadConnection,
  saveConnection,
  clearConnection,
  type Connection,
} from "./src/storage";
import { pair, refreshDevice, disconnectDevice } from "./src/api";

type Tab = "inbox" | "connect" | "about";
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.disabled,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[styles.buttonText, secondary && styles.buttonTextSecondary]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export default function App() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState<Incoming[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Incoming | null>(null);
  const [campaignPage, setCampaignPage] = useState<string | null>(null);
  const handleOpened = (incoming: Incoming) => {
    setTab("inbox");
    setSelected(incoming);
    const destination = notificationDestination(incoming.url);
    setCampaignPage(destination?.type === "campaign" ? destination.id : null);
  };
  useEffect(() => {
    let active = true;
    let stopNotifications: (() => void) | undefined;
    const refresh = () => {
      void loadInbox()
        .then((items) => {
          if (active) setInbox(items);
        })
        .catch(() => {
          if (active) setError("تعذر قراءة سجل الإشعارات.");
        });
    };
    refresh();
    const stopInbox = subscribeInbox(refresh);
    void loadConnection()
      .then((value) => {
        if (active) {
          setConnection(value);
          if (value) setUrl(value.url);
        }
      })
      .catch(() => {
        if (active) setError("تعذر قراءة إعداد الربط.");
      });
    void startNotifications(
      (incoming) => {
        if (active) handleOpened(incoming);
      },
      (message) => {
        if (active) setError(message);
      },
    )
      .then((stop) => {
        if (active) stopNotifications = stop;
        else stop();
      })
      .catch(() => {
        if (active)
          setError(
            "تعذر تهيئة Firebase. تأكد من تثبيت نسخة Android بإعدادات مشروعك.",
          );
      });
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") refresh();
    });
    const openUrl = (value: string) => {
      const destination = notificationDestination(value);
      if (destination?.type === "campaign") {
        setCampaignPage(destination.id);
        setTab("inbox");
      }
    };
    const links = Linking.addEventListener("url", (event) =>
      openUrl(event.url),
    );
    void Linking.getInitialURL().then((value) => {
      if (value && active) openUrl(value);
    });
    return () => {
      active = false;
      stopInbox();
      stopNotifications?.();
      state.remove();
      links.remove();
    };
  }, []);
  const execute = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "تعذر إكمال العملية.",
      );
    } finally {
      setBusy(false);
    }
  };
  const connect = () =>
    void execute(async () => {
      if (isWebPreview)
        throw new Error(
          "هذه معاينة للواجهة فقط. الربط واستقبال FCM يعملان في نسخة Android.",
        );
      if (connection)
        throw new Error("افصل الجهاز الحالي قبل الربط بلوحة أخرى.");
      const token = await getFcmToken();
      const value = await pair(url, code, token, __DEV__);
      await saveConnection(value);
      setConnection(value);
      setCode("");
      setNotice(
        "تم ربط الجهاز ضمن شريحة test. يمكنك إرسال حملة إليه من اللوحة.",
      );
    });
  const sync = () =>
    void execute(async () => {
      if (!connection) return;
      await refreshDevice(connection, await getFcmToken());
      setNotice("تم تحديث تسجيل الجهاز.");
    });
  const disconnect = () =>
    void execute(async () => {
      if (!connection) return;
      await disconnectDevice(connection);
      await clearConnection();
      setConnection(null);
      setNotice("تم إلغاء اشتراك هذا الجهاز.");
    });
  const renewPairing = () =>
    void execute(async () => {
      await clearConnection();
      setConnection(null);
      setCode("");
      setNotice(
        "أدخل رمزًا جديدًا من اللوحة لإعادة الربط. مسح جلسة الربط محليًا لا يلغي اشتراك الجهاز على الخادم.",
      );
    });
  const demo = () =>
    void execute(async () => {
      const incoming = normalizeNotification(
        {
          messageId: `demo-${Date.now()}`,
          notification: {
            title: "شيء جديد ينتظرك ✨",
            body: "هذا إشعار محاكاة داخل التطبيق لتجربة الواجهة. لم يُرسل من Firebase.",
          },
          data: { url: "nabdh://campaign/demo", campaignId: "demo" },
        },
        "foreground",
        "demo",
      );
      await saveIncoming(incoming);
      setTab("inbox");
      setSelected(null);
      setCampaignPage(null);
      setNotice("أُضيفت محاكاة محلية إلى الصندوق. لا تثبت اتصال Firebase.");
    });
  const select = async (item: Incoming) => {
    const opened = {
      ...item,
      openedAt: new Date().toISOString(),
      state: "opened" as const,
    };
    await saveIncoming(opened);
    setSelected(opened);
    setCampaignPage(null);
  };
  const followLink = () =>
    void execute(async () => {
      if (!selected) return;
      const destination = notificationDestination(selected.url);
      if (!destination)
        throw new Error(
          "الرابط غير مدعوم. استخدم nabdh://campaign/id أو رابط HTTPS.",
        );
      if (destination.type === "campaign") setCampaignPage(destination.id);
      else await Linking.openURL(destination.url);
    });
  const clear = () => {
    if (Platform.OS === "web") {
      if (window.confirm("مسح سجل الإشعارات من هذا الجهاز؟"))
        void execute(async () => {
          await clearInbox();
          setSelected(null);
        });
    } else
      Alert.alert("مسح السجل", "سيُحذف سجل هذا الجهاز فقط.", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "مسح",
          style: "destructive",
          onPress: () =>
            void execute(async () => {
              await clearInbox();
              setSelected(null);
            }),
        },
      ]);
  };
  const fcmCount = inbox.filter((item) => item.source === "fcm").length;
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image
              source={require("./assets/cash-mobile.png")}
              accessibilityLabel="شعار Cash Mobile"
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandName}>Cash Mobile</Text>
              <Text style={styles.brandCaption}>تطبيق الاختبار</Text>
            </View>
          </View>
          <View style={styles.environment}>
            <View
              style={[
                styles.dot,
                { backgroundColor: connection ? "#7f9d62" : "#baa06b" },
              ]}
            />
            <Text style={styles.environmentText}>
              {isWebPreview
                ? "معاينة الواجهة"
                : connection
                  ? "جهاز متصل"
                  : "غير مرتبط"}
            </Text>
          </View>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {error !== "" && (
            <View accessibilityRole="alert" style={styles.error}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          {notice !== "" && (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          )}
          {busy && (
            <ActivityIndicator color="#365e42" style={{ marginBottom: 16 }} />
          )}
          {tab === "inbox" && campaignPage !== null ? (
            <View style={styles.detailCard}>
              <Text style={styles.eyebrow}>تم فتح الرابط داخل التطبيق</Text>
              <Text accessibilityRole="header" style={styles.title}>
                صفحة الحملة التجريبية
              </Text>
              <View style={styles.campaignSymbol}>
                <Text style={styles.campaignSymbolText}>✦</Text>
              </View>
              <Text style={styles.paragraph}>
                وصلت إلى هذه الشاشة من رابط الإشعار. يمكنك لاحقًا استبدالها
                بصفحة العرض أو المنتج داخل تطبيقك.
              </Text>
              <View style={styles.keyRow}>
                <Text style={styles.monospace}>{campaignPage}</Text>
                <Text style={styles.label}>معرّف الحملة</Text>
              </View>
              <Button
                secondary
                title="العودة إلى الإشعارات"
                onPress={() => {
                  setCampaignPage(null);
                  setSelected(null);
                }}
              />
            </View>
          ) : tab === "inbox" && selected ? (
            <View style={styles.detailCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected(null)}
              >
                <Text style={styles.back}>→ كل الإشعارات</Text>
              </Pressable>
              <Text style={styles.eyebrow}>
                {selected.source === "demo"
                  ? "محاكاة محلية"
                  : "إشعار من Firebase"}
              </Text>
              <Text accessibilityRole="header" style={styles.title}>
                {selected.title}
              </Text>
              <Text style={styles.paragraph}>{selected.body}</Text>
              <View style={styles.detailMetadata}>
                <Text style={styles.mutedText}>
                  وقت الاستلام:{" "}
                  {new Date(selected.receivedAt).toLocaleString("ar")}
                </Text>
                <Text style={styles.mutedText}>
                  الحالة:{" "}
                  {selected.openedAt ? "تم فتحه على هذا الجهاز" : "مستلم"}
                </Text>
                {selected.campaignId !== "" && (
                  <Text style={styles.mutedText}>
                    معرّف الحملة: {selected.campaignId}
                  </Text>
                )}
              </View>
              {selected.url !== "" && (
                <>
                  <Text style={styles.label}>الرابط المرفق</Text>
                  <Text selectable style={styles.url}>
                    {selected.url}
                  </Text>
                  <Button
                    title={
                      notificationDestination(selected.url)?.type === "https"
                        ? "فتح الرابط الخارجي"
                        : "فتح رابط الحملة"
                    }
                    onPress={followLink}
                  />
                </>
              )}
            </View>
          ) : tab === "inbox" ? (
            <>
              <Text style={styles.eyebrow}>رسائلك، من الطرف الآخر</Text>
              <Text accessibilityRole="header" style={styles.title}>
                أهلًا بك في Cash Mobile.
              </Text>
              <Text style={styles.subtitle}>
                جرّب كيف تصل رسالتك، وكيف يراها مستخدم تطبيقك.
              </Text>
              <View style={styles.hero}>
                <View style={styles.heroTop}>
                  <View style={styles.heroIcon}>
                    <Text style={styles.heroIconText}>✳</Text>
                  </View>
                  <View style={styles.heroTag}>
                    <Text style={styles.heroTagText}>
                      {isWebPreview ? "واجهة تجريبية" : "ANDROID · FCM"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.heroTitle}>
                  رسالة صغيرة.<Text>{"\n"}</Text>تجربة أقرب.
                </Text>
                <Text style={styles.heroBody}>
                  {isWebPreview
                    ? "استكشف الواجهة بمحاكاة محلية. استقبال الإشعارات الفعلية يتطلب نسخة Android المربوطة بـ Firebase."
                    : "اربط هذا الجهاز باللوحة، أرسل أول حملة، وشاهد إشعارك يصل إلى هنا."}
                </Text>
                <Button
                  title="تجربة إشعار محلي"
                  secondary
                  onPress={demo}
                  disabled={busy}
                />
              </View>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>إشعارات Firebase</Text>
                  <Text style={styles.statValue}>
                    {fcmCount.toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.statHint}>مسجلة على هذا الجهاز</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>محاكاة محلية</Text>
                  <Text style={styles.statValue}>
                    {(inbox.length - fcmCount).toString().padStart(2, "0")}
                  </Text>
                  <Text style={styles.statHint}>لتجربة الواجهة فقط</Text>
                </View>
              </View>
              <View style={styles.sectionHeader}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  صندوق الإشعارات
                </Text>
                {inbox.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="مسح السجل"
                    onPress={clear}
                  >
                    <Text style={styles.clear}>مسح السجل</Text>
                  </Pressable>
                )}
              </View>
              {inbox.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyLogo}>
                    <Text style={styles.emptyLogoText}>◉</Text>
                  </View>
                  <Text style={styles.emptyTitle}>أول إشعار، أول تواصل.</Text>
                  <Text style={styles.emptyBody}>
                    ابدأ بمحاكاة محلية، أو اربط جهاز Android{"\n"}لتجربة إرسال
                    حقيقي من اللوحة.
                  </Text>
                </View>
              ) : (
                inbox.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityLabel={`فتح إشعار ${item.title}`}
                    onPress={() => void execute(() => select(item))}
                    style={({ pressed }) => [
                      styles.notification,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View style={styles.notificationTop}>
                      <Text
                        style={[
                          styles.badge,
                          item.source === "demo" && styles.demoBadge,
                        ]}
                      >
                        {item.source === "demo"
                          ? "محاكاة محلية"
                          : "Firebase FCM"}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {new Date(item.receivedAt).toLocaleTimeString("ar", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text numberOfLines={2} style={styles.notificationBody}>
                      {item.body}
                    </Text>
                    <Text style={styles.notificationFooter}>
                      {item.openedAt ? "تم فتحه" : "اضغط لفتح الإشعار"} ←
                    </Text>
                  </Pressable>
                ))
              )}
              <View style={styles.bottomNote}>
                <Text style={styles.bottomNoteText}>
                  ✦ جهاز الاختبار مرتبط بشريحة test فقط عند إقرانه.
                </Text>
              </View>
            </>
          ) : null}
          {tab === "connect" && (
            <>
              <Text style={styles.eyebrow}>من لوحتك إلى جهازك</Text>
              <Text accessibilityRole="header" style={styles.title}>
                ربط اللوحة.
              </Text>
              <Text style={styles.subtitle}>
                رمز مؤقت بدلًا من وضع مفتاح الخادم في التطبيق.
              </Text>
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.sectionTitle}>
                    {connection ? "الجهاز مرتبط" : "جهّز أول اتصال"}
                  </Text>
                  <Text style={styles.badge}>
                    {connection ? "شريحة test" : "خطوتان فقط"}
                  </Text>
                </View>
                <Text style={styles.label}>عنوان اللوحة</Text>
                <TextInput
                  accessibilityLabel="عنوان اللوحة"
                  style={styles.input}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://cms.example.com"
                  placeholderTextColor="#a5ad9f"
                  editable={!connection && !busy}
                />
                {!connection && (
                  <>
                    <Text style={styles.label}>رمز الربط</Text>
                    <TextInput
                      accessibilityLabel="رمز الربط"
                      style={styles.input}
                      value={code}
                      onChangeText={setCode}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      maxLength={32}
                      placeholder="ABCD-1234-EF56-7890"
                      placeholderTextColor="#a5ad9f"
                    />
                    <Text style={styles.hint}>
                      من اللوحة: الأجهزة والجمهور ← إنشاء رمز ربط. صالح 10 دقائق
                      ولمرة واحدة.
                    </Text>
                    <Button
                      title={
                        isWebPreview
                          ? "الربط متاح في نسخة Android"
                          : "طلب الإذن وربط الجهاز"
                      }
                      onPress={connect}
                      disabled={busy || isWebPreview}
                    />
                  </>
                )}
                {connection && (
                  <>
                    <View style={styles.keyRow}>
                      <Text style={styles.monospace}>
                        #{connection.deviceId}
                      </Text>
                      <Text style={styles.label}>معرّف الجهاز في اللوحة</Text>
                    </View>
                    <Button
                      title="تحديث تسجيل الجهاز"
                      onPress={sync}
                      disabled={busy}
                    />
                    <View style={{ height: 12 }} />
                    <Button
                      title="إلغاء الاشتراك وفصل الجهاز"
                      secondary
                      onPress={disconnect}
                      disabled={busy}
                    />
                    <View style={{ height: 12 }} />
                    <Button
                      title="إعادة الربط برمز جديد"
                      secondary
                      onPress={renewPairing}
                      disabled={busy}
                    />
                  </>
                )}
              </View>
              <View style={styles.stepsCard}>
                <Text style={styles.sectionTitle}>
                  تجربتك الأولى، خطوة بخطوة
                </Text>
                {[
                  [
                    "01",
                    "ثبّت نسخة Android",
                    "يلزم ملف إعداد Firebase وبناء أصلي؛ Expo Go لا يدعم هذا الربط.",
                  ],
                  [
                    "02",
                    "اربط الجهاز باللوحة",
                    "امنح إذن الإشعارات، وأدخل عنوان اللوحة ورمز الربط.",
                  ],
                  [
                    "03",
                    "أرسل حملة اختبار",
                    "اختر Android وشريحة test، ثم جرّب الاستقبال والتطبيق مفتوح وفي الخلفية.",
                  ],
                ].map(([number, title, text]) => (
                  <View style={styles.step} key={number}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{number}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>{title}</Text>
                      <Text style={styles.stepBody}>{text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
          {tab === "about" && (
            <>
              <Text style={styles.eyebrow}>مساحة آمنة للتجربة</Text>
              <Text accessibilityRole="header" style={styles.title}>
                عن التطبيق.
              </Text>
              <View style={styles.formCard}>
                <Text style={styles.sectionTitle}>نسخة الاختبار · 0.1</Text>
                <Text style={styles.paragraph}>
                  هذه واجهة اختبار Android لاستقبال رسائل Firebase Cloud
                  Messaging المرسلة من لوحة Cash Mobile.
                </Text>
                <Text style={styles.paragraph}>
                  عندما يكون التطبيق مفتوحًا: يُحفظ الإشعار في الصندوق ويظهر
                  إشعار محلي في النظام. في الخلفية: يعرض Android إشعار FCM،
                  ويؤدي الضغط عليه إلى فتح التطبيق.
                </Text>
                <Text style={styles.paragraph}>
                  سجل الصندوق محلي ويحتفظ بآخر 100 رسالة. لا يرسل إحصائيات
                  الوصول أو الفتح إلى اللوحة، وقد لا يسجل كل رسائل الخلفية إذا
                  منع Android تنفيذ التطبيق.
                </Text>
                <Text style={styles.paragraph}>
                  لا يتم تخزين مفتاح حساب خدمة Firebase أو مفتاح API العام للوحة
                  في التطبيق. جلسة هذا الجهاز فقط محفوظة في Android SecureStore.
                </Text>
                {isWebPreview && (
                  <Text style={styles.previewNote}>
                    أنت في معاينة الويب: لا اتصال بـ FCM، ولا ربط أجهزة، ولا
                    إثبات وصول فعلي.
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
        <View style={styles.tabs}>
          {(
            [
              { key: "inbox", title: "الإشعارات", symbol: "◉" },
              { key: "connect", title: "ربط اللوحة", symbol: "⟷" },
              { key: "about", title: "عن التطبيق", symbol: "i" },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: tab === item.key }}
              onPress={() => {
                setTab(item.key);
                setSelected(null);
                setCampaignPage(null);
                setError("");
                setNotice("");
              }}
              style={[styles.tab, tab === item.key && styles.activeTab]}
            >
              <Text
                style={[
                  styles.tabSymbol,
                  tab === item.key && styles.activeTabText,
                ]}
              >
                {item.symbol}
              </Text>
              <Text
                style={[
                  styles.tabText,
                  tab === item.key && styles.activeTabText,
                ]}
              >
                {item.title}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f6ef",
    paddingTop: Platform.OS === "android" ? 34 : 0,
  },
  shell: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    backgroundColor: "#fafbf7",
    ...(Platform.OS === "web" ? { height: "100vh" as any } : {}),
  },
  header: {
    paddingHorizontal: 23,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: "#fff",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e8ece2",
  },
  brand: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    textAlign: "right",
    fontSize: 20,
    fontWeight: "700",
    color: "#29352c",
  },
  brandCaption: {
    textAlign: "right",
    fontSize: 10,
    color: "#909a86",
    marginTop: 1,
  },
  environment: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e7ecdf",
    borderRadius: 7,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  environmentText: { fontSize: 10, color: "#859175" },
  scroll: { flex: 1 },
  content: { padding: 23, paddingBottom: 28 },
  eyebrow: {
    textAlign: "right",
    fontSize: 11,
    color: "#8c9b7b",
    marginBottom: 8,
  },
  title: {
    textAlign: "right",
    fontSize: 30,
    fontWeight: "700",
    color: "#29352c",
    lineHeight: 45,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "right",
    fontSize: 12,
    color: "#91998a",
    lineHeight: 22,
    marginBottom: 24,
  },
  hero: {
    backgroundColor: "#eaf0df",
    borderWidth: 1,
    borderColor: "#dfe8d1",
    borderRadius: 18,
    padding: 23,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#dce6ca",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconText: { fontSize: 33, color: "#7f9862" },
  heroTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f4f7ee",
    borderRadius: 5,
  },
  heroTagText: { color: "#8e9d7d", fontSize: 9, letterSpacing: 0.5 },
  heroTitle: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "right",
    color: "#425a38",
    lineHeight: 45,
    marginBottom: 10,
  },
  heroBody: {
    fontSize: 12,
    color: "#88957a",
    lineHeight: 23,
    textAlign: "right",
    marginBottom: 19,
  },
  button: {
    backgroundColor: "#365e42",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#365e42",
  },
  buttonSecondary: { backgroundColor: "#fff", borderColor: "#dce5d0" },
  buttonText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  buttonTextSecondary: { color: "#527243" },
  disabled: { opacity: 0.45 },
  stats: { flexDirection: "row-reverse", gap: 12, marginBottom: 28 },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e6ebdf",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 17,
  },
  statLabel: { textAlign: "right", fontSize: 11, color: "#7d8b71" },
  statValue: {
    fontSize: 32,
    fontWeight: "500",
    color: "#33422e",
    textAlign: "right",
    marginVertical: 9,
  },
  statHint: { fontSize: 9, color: "#a0aa93", textAlign: "right" },
  sectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "right",
    color: "#33422e",
  },
  clear: { fontSize: 10, color: "#ab9985" },
  empty: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6ebdf",
    borderRadius: 13,
    padding: 32,
    alignItems: "center",
  },
  emptyLogo: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4e9",
    marginBottom: 16,
  },
  emptyLogoText: { fontSize: 27, color: "#89a075" },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#697e59",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 21,
    color: "#a0aa94",
  },
  bottomNote: { marginTop: 22, alignItems: "center" },
  bottomNoteText: {
    fontSize: 10,
    color: "#a4ae97",
    textAlign: "center",
    lineHeight: 19,
  },
  notification: {
    padding: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6ebdf",
    borderRadius: 13,
    marginBottom: 12,
  },
  notificationTop: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badge: {
    backgroundColor: "#edf3e4",
    color: "#789662",
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  demoBadge: { backgroundColor: "#f6efe1", color: "#ac925f" },
  notificationTime: { fontSize: 10, color: "#a5af99" },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "right",
    color: "#3d5133",
    marginBottom: 7,
  },
  notificationBody: {
    fontSize: 12,
    color: "#909d82",
    textAlign: "right",
    lineHeight: 22,
  },
  notificationFooter: {
    marginTop: 12,
    fontSize: 10,
    textAlign: "right",
    color: "#99aa87",
  },
  tabs: {
    flexDirection: "row-reverse",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e6ebdf",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: Platform.OS === "web" ? 14 : 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 9,
    gap: 4,
  },
  activeTab: { backgroundColor: "#edf3e5" },
  tabSymbol: { fontSize: 21, color: "#b3bca8" },
  tabText: { fontSize: 10, color: "#a3ad97" },
  activeTabText: { color: "#5c7c4a" },
  formCard: {
    padding: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6ebdf",
    borderRadius: 13,
    marginBottom: 20,
  },
  formHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 23,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
    color: "#6c7e5d",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e9d9",
    borderRadius: 8,
    padding: 13,
    backgroundColor: "#fafcf7",
    fontSize: 13,
    color: "#43593a",
    textAlign: "left",
    marginBottom: 20,
  },
  hint: {
    fontSize: 10,
    textAlign: "right",
    lineHeight: 20,
    color: "#a0ac91",
    marginTop: -5,
    marginBottom: 20,
  },
  stepsCard: { backgroundColor: "#f4f6ed", borderRadius: 13, padding: 22 },
  step: { flexDirection: "row-reverse", gap: 12, marginTop: 23 },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: "#e5edd7",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { fontSize: 11, color: "#8c9e77" },
  stepContent: { flex: 1 },
  stepTitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    color: "#6c8059",
    marginBottom: 5,
  },
  stepBody: {
    fontSize: 10,
    textAlign: "right",
    lineHeight: 20,
    color: "#a0ac91",
  },
  keyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#e8ede1",
  },
  monospace: {
    fontSize: 13,
    fontFamily: Platform.OS === "android" ? "monospace" : "monospace",
    color: "#789661",
  },
  paragraph: {
    fontSize: 13,
    textAlign: "right",
    lineHeight: 26,
    color: "#8b9a7c",
    marginVertical: 14,
  },
  previewNote: {
    textAlign: "right",
    fontSize: 11,
    color: "#a69469",
    padding: 16,
    backgroundColor: "#f6f0e1",
    borderRadius: 8,
    lineHeight: 22,
    marginTop: 15,
  },
  detailCard: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e6ebdf",
  },
  back: {
    fontSize: 11,
    textAlign: "right",
    color: "#93a780",
    marginBottom: 26,
  },
  detailMetadata: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#eef1e7",
    borderBottomWidth: 1,
    borderBottomColor: "#eef1e7",
    marginVertical: 16,
  },
  mutedText: {
    textAlign: "right",
    fontSize: 10,
    color: "#a1ae93",
    lineHeight: 22,
  },
  url: { fontSize: 11, color: "#829d6c", marginBottom: 20, textAlign: "left" },
  campaignSymbol: {
    width: 85,
    height: 85,
    backgroundColor: "#eaf1de",
    borderRadius: 25,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 18,
  },
  campaignSymbolText: { fontSize: 47, color: "#89a66a" },
  error: {
    backgroundColor: "#fcf0e9",
    borderWidth: 1,
    borderColor: "#f0dbcc",
    borderRadius: 9,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#ad7c67",
    fontSize: 11,
    textAlign: "right",
    lineHeight: 21,
  },
  notice: {
    backgroundColor: "#eff5e6",
    borderWidth: 1,
    borderColor: "#deebce",
    borderRadius: 9,
    padding: 14,
    marginBottom: 16,
  },
  noticeText: {
    color: "#7c9964",
    fontSize: 11,
    textAlign: "right",
    lineHeight: 21,
  },
});
