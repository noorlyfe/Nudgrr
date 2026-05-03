import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import ViewShot from "react-native-view-shot";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { BillInput } from "../components/BillInput";
import { PeopleStepper } from "../components/PeopleStepper";
import { ReceiptCard } from "../components/ReceiptCard";
import { ResultCard } from "../components/ResultCard";
import { NudgeSection } from "../components/NudgeSection";
import { ShareReceiptButton } from "../components/ShareReceiptButton";
import { SplitModeSelector, type SplitMode } from "../components/SplitModeSelector";
import { TipPills } from "../components/TipPills";
import type { NudgeTone } from "../constants/messages";
import { colors, spacing, touchTarget, typography } from "../constants/theme";
import { useProStatus } from "../hooks/useProStatus";
import { useAppPreferences } from "../hooks/useAppPreferences";
import { useReceiptFooter } from "../hooks/useReceiptFooter";
import { useSplitHistory } from "../hooks/useSplitHistory";
import { trackEvent } from "../lib/analytics";
import {
  billDigitsToAmount,
  clampTipPercent,
  computeTipFromFixed,
  computeTipSplit,
  type TipEntryMode,
  round2,
} from "../hooks/useTipCalculator";

function amountToBillDigits(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }
  return String(Math.round(amount * 100));
}

const ONBOARDING_KEY = "@nudgrr/onboarding_seen_v1";

export default function Index() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const { isPro, loading: proLoading } = useProStatus();
  const { loaded: prefsLoaded, defaultTone, setDefaultTone } = useAppPreferences();
  const { footer, loaded: footerLoaded, saveFooter } = useReceiptFooter();
  const { addSplit, getById } = useSplitHistory();

  const [restaurant, setRestaurant] = useState("");
  const [billDigits, setBillDigits] = useState("");
  const [people, setPeople] = useState(2);
  const [tipPercent, setTipPercent] = useState<number>(18);
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [customTipDraft, setCustomTipDraft] = useState("18");
  const [tipMode, setTipMode] = useState<TipEntryMode>("percent");
  const [totalTipDigits, setTotalTipDigits] = useState("");
  const [perPersonTipDigits, setPerPersonTipDigits] = useState("");
  const [sharing, setSharing] = useState(false);
  const [nudgeTone, setNudgeTone] = useState<NudgeTone>("funny");
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [customSplitDraft, setCustomSplitDraft] = useState("100");

  const shotRef = useRef<ViewShot | null>(null);
  const restoredId = useRef<string | null>(null);

  const billAmount = useMemo(() => billDigitsToAmount(billDigits), [billDigits]);

  const resolvedTipPercent = useMemo(() => {
    if (!isCustomTip) {
      return tipPercent;
    }
    const parsed = parseFloat(customTipDraft);
    if (!Number.isFinite(parsed)) {
      return clampTipPercent(0);
    }
    return clampTipPercent(parsed);
  }, [customTipDraft, isCustomTip, tipPercent]);

  const split = useMemo(() => {
    if (tipMode === "percent") {
      return computeTipSplit(billAmount, resolvedTipPercent, people);
    }
    if (billAmount === null || !Number.isFinite(billAmount) || billAmount <= 0) {
      return computeTipSplit(null, 0, people);
    }
    if (tipMode === "total") {
      const d = billDigitsToAmount(totalTipDigits) ?? 0;
      return computeTipFromFixed(billAmount, people, "total", d);
    }
    const d = billDigitsToAmount(perPersonTipDigits) ?? 0;
    return computeTipFromFixed(billAmount, people, "per_person", d);
  }, [billAmount, people, perPersonTipDigits, resolvedTipPercent, tipMode, totalTipDigits]);

  const splitMultiplier = useMemo(() => {
    if (splitMode === "less") {
      return 0.9;
    }
    if (splitMode === "more") {
      return 1.1;
    }
    if (splitMode === "custom") {
      const parsed = parseFloat(customSplitDraft);
      if (!Number.isFinite(parsed)) {
        return 1;
      }
      return Math.min(3, Math.max(0.1, parsed / 100));
    }
    return 1;
  }, [customSplitDraft, splitMode]);

  const adjustedTipPerPerson = useMemo(
    () => round2(split.tipPerPerson * splitMultiplier),
    [split.tipPerPerson, splitMultiplier]
  );
  const adjustedTotalPerPerson = useMemo(
    () => round2(split.totalPerPerson * splitMultiplier),
    [split.totalPerPerson, splitMultiplier]
  );

  const splitLabel = useMemo(() => {
    if (splitMode === "less") {
      return "I ate less";
    }
    if (splitMode === "more") {
      return "I ate more";
    }
    if (splitMode === "custom") {
      return `Custom split (${Math.round(splitMultiplier * 100)}%)`;
    }
    return "Split evenly";
  }, [splitMode, splitMultiplier]);

  const receiptWidth = Math.min(340, windowWidth - 32);

  const dateLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date());

  const rawId = params.id;
  const historyId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }
    setNudgeTone(defaultTone);
  }, [defaultTone, prefsLoaded]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (!active || seen === "1") {
          return;
        }
        Alert.alert(
          "Quick start",
          "Enter bill + people, then send reminders. Free plan includes 2 nudges per month.",
          [{ text: "Got it" }]
        );
        await AsyncStorage.setItem(ONBOARDING_KEY, "1");
      } catch {
        // ignore onboarding persistence issues
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!historyId) {
      restoredId.current = null;
      return;
    }
    if (restoredId.current === historyId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const row = await getById(historyId);
      if (cancelled || !row) {
        return;
      }
      restoredId.current = historyId;
      setRestaurant(row.restaurant);
      setBillDigits(amountToBillDigits(row.billAmount));
      setPeople(row.people);
      setTipMode("percent");
      setIsCustomTip(true);
      setCustomTipDraft(String(row.tipPercent));
      setTipPercent(row.tipPercent);
      setTotalTipDigits("");
      setPerPersonTipDigits("");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.setParams({ id: undefined });
    })();
    return () => {
      cancelled = true;
    };
  }, [getById, historyId, router]);

  const handleSelectPreset = (value: number) => {
    setIsCustomTip(false);
    setTipPercent(value);
    setCustomTipDraft(String(value));
  };

  const handleSelectCustom = () => {
    setIsCustomTip(true);
    setCustomTipDraft(String(tipPercent));
  };

  const handleCustomDraftChange = (value: string) => {
    setCustomTipDraft(value);
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      setTipPercent(clampTipPercent(parsed));
    }
  };

  const handleTipModeChange = useCallback(
    (newMode: TipEntryMode) => {
      if (newMode === tipMode) {
        return;
      }
      if (billAmount !== null && Number.isFinite(billAmount) && billAmount > 0) {
        let current = computeTipSplit(billAmount, resolvedTipPercent, people);
        if (tipMode === "total") {
          current = computeTipFromFixed(
            billAmount,
            people,
            "total",
            billDigitsToAmount(totalTipDigits) ?? 0
          );
        } else if (tipMode === "per_person") {
          current = computeTipFromFixed(
            billAmount,
            people,
            "per_person",
            billDigitsToAmount(perPersonTipDigits) ?? 0
          );
        }
        if (newMode === "total") {
          setTotalTipDigits(amountToBillDigits(current.tipAmount));
        } else if (newMode === "per_person") {
          setPerPersonTipDigits(amountToBillDigits(current.tipPerPerson));
        } else {
          const p = current.tipPercent;
          setTipPercent(clampTipPercent(p));
          setCustomTipDraft(String(round2(p)));
          setIsCustomTip(true);
        }
      }
      setTipMode(newMode);
    },
    [billAmount, people, perPersonTipDigits, resolvedTipPercent, tipMode, totalTipDigits]
  );

  const handleHistoryPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (proLoading) {
      return;
    }
    if (!isPro) {
      router.push("/paywall");
      return;
    }
    router.push("/history");
  };

  const handleSettingsPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/settings");
  };

  const handleToneChange = useCallback(
    (tone: NudgeTone) => {
      setNudgeTone(tone);
      void setDefaultTone(tone);
    },
    [setDefaultTone]
  );

  const handleShareReceipt = useCallback(async () => {
    if (!split.hasBill) {
      return;
    }
    setSharing(true);
    try {
      try {
        await addSplit({
          restaurant: restaurant.trim(),
          billAmount: billAmount ?? 0,
          tipPercent: split.tipPercent,
          people: split.people,
          tipPerPerson: adjustedTipPerPerson,
          totalPerPerson: adjustedTotalPerPerson,
          tipAmount: split.tipAmount,
          totalAmount: split.totalAmount,
        });
      } catch {
        // History is best-effort; still share the receipt.
      }

      if (Platform.OS === "web") {
        Alert.alert(
          "Web preview limitation",
          "Receipt sharing is available in the iOS/Android app. On web, use this preview to test layout and calculations."
        );
        return;
      }

      const uri = await shotRef.current?.capture?.();
      if (!uri) {
        throw new Error("Could not capture receipt.");
      }
      if (__DEV__) {
        console.log("[Nudgrr] Receipt PNG path:", uri);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Sharing unavailable", "Save a screenshot manually from this screen.");
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share receipt",
      });
      void trackEvent("receipt_share");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = e instanceof Error ? e.message : "Something went wrong.";
      Alert.alert("Share failed", message);
    } finally {
      setSharing(false);
    }
  }, [
    addSplit,
    billAmount,
    restaurant,
    split.hasBill,
    split.people,
    split.tipAmount,
    split.tipPercent,
    adjustedTipPerPerson,
    split.totalAmount,
    adjustedTotalPerPerson,
  ]);

  const offscreenTop = Dimensions.get("window").height + 120;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(insets.top, spacing.lg) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="auto"
        >
            <View style={styles.topRow}>
              <Pressable
                onPress={handleSettingsPress}
                hitSlop={12}
                style={({ pressed }) => [styles.settingsBtn, pressed && styles.historyBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <Text style={styles.historyBtnText}>Settings</Text>
              </Pressable>
              <Text style={styles.wordmark}>Nudgrr</Text>
              <Pressable
                onPress={handleHistoryPress}
                hitSlop={12}
                style={({ pressed }) => [styles.historyBtn, pressed && styles.historyBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Open split history"
              >
                <Text style={styles.historyBtnText}>History</Text>
              </Pressable>
            </View>

            <TextInput
              value={restaurant}
              onChangeText={setRestaurant}
              placeholder="Where did you eat?"
              placeholderTextColor={colors.textSecondary}
              style={styles.restaurantInput}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              accessibilityLabel="Restaurant name"
              autoCorrect
            />

            <View style={styles.section}>
              <BillInput billDigits={billDigits} onBillDigitsChange={setBillDigits} />
            </View>

            <View style={styles.section}>
              <TipPills
                tipMode={tipMode}
                onTipModeChange={handleTipModeChange}
                totalTipDigits={totalTipDigits}
                onTotalTipDigitsChange={setTotalTipDigits}
                perPersonTipDigits={perPersonTipDigits}
                onPerPersonTipDigitsChange={setPerPersonTipDigits}
                selectedPreset={isCustomTip ? null : tipPercent}
                isCustom={isCustomTip}
                customTipDraft={customTipDraft}
                onSelectPreset={handleSelectPreset}
                onSelectCustom={handleSelectCustom}
                onCustomDraftChange={handleCustomDraftChange}
              />
            </View>

            <View style={styles.section}>
              <PeopleStepper people={people} onChange={setPeople} />
            </View>

            {split.hasBill ? (
              <Animated.View
                entering={FadeInDown.springify().damping(17).stiffness(210)}
                exiting={FadeOutDown.duration(200)}
                style={styles.previewBlock}
              >
                <ResultCard
                  hasBill={split.hasBill}
                  tipPerPerson={adjustedTipPerPerson}
                  totalPerPerson={adjustedTotalPerPerson}
                  totalTip={split.tipAmount}
                  people={split.people}
                  tipPercent={split.tipPercent}
                  splitLabel={splitLabel}
                  splitControls={
                    <SplitModeSelector
                      mode={splitMode}
                      customPercent={customSplitDraft}
                      onModeChange={setSplitMode}
                      onCustomPercentChange={setCustomSplitDraft}
                    />
                  }
                />

                <NudgeSection
                  hasBill={split.hasBill}
                  totalPerPerson={adjustedTotalPerPerson}
                  restaurant={restaurant}
                  isPro={isPro}
                  tone={nudgeTone}
                  onToneChange={handleToneChange}
                />

                <ShareReceiptButton
                  ready={split.hasBill}
                  onPress={handleShareReceipt}
                  disabled={sharing || !footerLoaded}
                />

                {isPro && footerLoaded ? (
                  <View style={styles.footerField}>
                    <Text style={styles.footerLabel}>Receipt footer</Text>
                    <TextInput
                      value={footer}
                      onChangeText={(t) => void saveFooter(t)}
                      placeholder="@you · Venmo @handle"
                      placeholderTextColor={colors.textSecondary}
                      style={styles.footerInput}
                      selectionColor={colors.accent}
                      cursorColor={colors.accent}
                      multiline
                      accessibilityLabel="Custom receipt footer for Pro"
                    />
                  </View>
                ) : null}
              </Animated.View>
            ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {split.hasBill ? (
        <View
          pointerEvents="none"
          style={[styles.offscreenShot, { top: offscreenTop, width: receiptWidth }]}
          collapsable={false}
        >
          <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }} style={styles.shotInner}>
            <ReceiptCard
              width={receiptWidth}
              restaurantLabel={restaurant}
              dateLabel={dateLabel}
              billAmount={billAmount ?? 0}
              tipPercent={split.tipPercent}
              tipAmount={split.tipAmount}
              totalAmount={split.totalAmount}
              totalPerPerson={adjustedTotalPerPerson}
              people={split.people}
              isPro={isPro}
              customFooter={footer}
              tone={nudgeTone}
            />
          </ViewShot>
        </View>
      ) : null}
      {!prefsLoaded ? (
        <View style={styles.loadingPrefs} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  topRow: {
    minHeight: touchTarget.min + 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  wordmark: {
    ...typography.wordmark,
    color: colors.textPrimary,
    textAlign: "center",
  },
  historyBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    minWidth: touchTarget.min,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  settingsBtn: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    minWidth: touchTarget.min,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  historyBtnPressed: {
    opacity: 0.7,
  },
  historyBtnText: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    color: colors.accent,
  },
  restaurantInput: {
    ...typography.body,
    fontSize: 17,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    minHeight: touchTarget.inputHeight - 8,
    paddingVertical: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  previewBlock: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  footerField: {
    gap: spacing.sm,
  },
  footerLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  footerInput: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 72,
    textAlignVertical: "top",
  },
  offscreenShot: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    opacity: 1,
    zIndex: -2,
  },
  shotInner: {
    backgroundColor: "transparent",
  },
  loadingPrefs: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
  },
});
