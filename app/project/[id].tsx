import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { shareReceiptImage } from "../../lib/shareReceiptImage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

import { AppAlert } from "../../components/AppAlert";
import { ProGate } from "../../components/ProGate";
import { ProjectReceiptCard } from "../../components/ProjectReceiptCard";
import { ShareReceiptButton } from "../../components/ShareReceiptButton";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useReceiptFooter } from "../../hooks/useReceiptFooter";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { useProStatus } from "../../hooks/useProStatus";
import type { ExpensePayment, Project, ProjectSettlement } from "../../hooks/useProjects";
import {
  computeParticipantBalances,
  computeSettlementTransfers,
  getExpensePayments,
  projectTotalSpent,
  roundMoney,
  sumExpensePayments,
  useProjects,
} from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatCurrency } from "../../lib/currency";
import { formatDateMedium } from "../../lib/i18n";
import {
  detectProjectReceiptContext,
  projectReceiptCopyKeys,
} from "../../lib/projectReceiptContext";
import { getReceiptCaptureExportWidth, getReceiptCaptureWidth } from "../../lib/receiptPreviewLayout";
import { isProjectFeatureLocked } from "../../lib/projectLimits";
import { rtlRow } from "../../lib/rtl";
import { safeRouterBack } from "../../lib/safeRouterBack";

type ReceiptMode = "overall" | "everyone" | "choose";

export default function ProjectDetailScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const receiptWidth = getReceiptCaptureWidth(windowWidth);
  const offscreenTop = Dimensions.get("window").height + 120;
  const sheetScrollMaxHeight = Math.max(240, windowHeight * 0.62);

  const { t, isRTL, locale } = useLocale();
  const { isPro, loading: proLoading } = useProStatus();
  const { currency, hideReceiptBranding } = useAppPreferences();
  const { footer } = useReceiptFooter();
  const { projects, getById, addExpense, updateExpense, closeProject, reload } = useProjects();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [closing, setClosing] = useState(false);

  const [receiptSheetVisible, setReceiptSheetVisible] = useState(false);
  const [receiptMode, setReceiptMode] = useState<ReceiptMode | null>(null);
  const [chooseConfirmed, setChooseConfirmed] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [activeSettlementIndex, setActiveSettlementIndex] = useState(0);
  const [captureSettlement, setCaptureSettlement] = useState<ProjectSettlement | null>(null);
  const [captureOverall, setCaptureOverall] = useState(false);
  const shotRef = useRef<ViewShot | null>(null);
  const [showWebAlert, setShowWebAlert] = useState(false);
  const [shareError, setShareError] = useState(false);

  const loadProject = useCallback(async () => {
    if (!id) {
      setProject(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    await reload();
    const row = await getById(id);
    setProject(row);
    setLoading(false);
  }, [getById, id, reload]);

  const accessLocked = isProjectFeatureLocked(isPro);

  const resetExpenseForm = useCallback(() => {
    setExpenseDesc("");
    setExpenseAmount("");
    setPaymentInputs({});
    setEditingExpenseId(null);
  }, []);

  const loadExpenseIntoForm = useCallback((expense: Project["expenses"][number]) => {
    if (!project) {
      return;
    }
    const payments = getExpensePayments(expense, project.participants.map((p) => p.id));
    const inputs: Record<string, string> = {};
    for (const p of project.participants) {
      const row = payments.find((pay) => pay.participantId === p.id);
      inputs[p.id] = row && row.amount > 0 ? String(row.amount) : "";
    }
    setEditingExpenseId(expense.id);
    setExpenseDesc(expense.description);
    setExpenseAmount(String(expense.amount));
    setPaymentInputs(inputs);
  }, [project]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  const isClosed = project?.status === "closed";
  const settlements = project?.settlements ?? [];
  const storedTransfers = project?.transfers ?? [];

  const liveTransfers = useMemo(() => {
    if (!project) {
      return [];
    }
    if (storedTransfers.length > 0) {
      return storedTransfers;
    }
    const balances = computeParticipantBalances(project.participants, project.expenses);
    return computeSettlementTransfers(project.participants, balances);
  }, [project, storedTransfers]);

  const receiptContext = useMemo(
    () => (project ? detectProjectReceiptContext(project.name) : "default"),
    [project]
  );
  const receiptCopyKeys = useMemo(() => projectReceiptCopyKeys(receiptContext), [receiptContext]);

  const dateRangeLabel = useMemo(() => {
    if (!project) {
      return "";
    }
    const start = formatDateMedium(project.createdAt, locale);
    const end = project.closedAt ? formatDateMedium(project.closedAt, locale) : start;
    return start === end ? start : `${start} – ${end}`;
  }, [locale, project]);

  const receiptSettlements = useMemo(() => {
    if (!receiptMode || !project) {
      return [];
    }
    if (receiptMode === "overall") {
      return [];
    }
    if (receiptMode === "everyone") {
      const debtorIds = new Set(liveTransfers.map((tr) => tr.fromParticipantId));
      return settlements.filter((s) => debtorIds.has(s.participantId) && s.totalOwed > 0);
    }
    if (!chooseConfirmed) {
      return [];
    }
    return settlements.filter(
      (s) => selectedParticipantIds.includes(s.participantId) && s.totalOwed > 0
    );
  }, [chooseConfirmed, liveTransfers, project, receiptMode, selectedParticipantIds, settlements]);

  const activeSettlement = receiptSettlements[activeSettlementIndex] ?? null;
  const showOverallPreview = receiptMode === "overall";
  const showParticipantPreview =
    receiptMode !== null && receiptMode !== "overall" && activeSettlement !== null;

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const dismissReceiptSheet = useCallback(() => {
    setReceiptSheetVisible(false);
    setReceiptMode(null);
    setChooseConfirmed(false);
    void reload();
  }, [reload]);

  const parsedAmount = useMemo(() => {
    const n = parseFloat(expenseAmount.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [expenseAmount]);

  const builtPayments = useMemo((): ExpensePayment[] => {
    if (!project || parsedAmount === null) {
      return [];
    }
    return project.participants
      .map((p) => {
        const raw = paymentInputs[p.id]?.replace(",", ".").trim() ?? "";
        const amount = parseFloat(raw);
        if (!Number.isFinite(amount) || amount <= 0) {
          return null;
        }
        return { participantId: p.id, amount: roundMoney(amount) };
      })
      .filter((p): p is ExpensePayment => p !== null);
  }, [parsedAmount, paymentInputs, project]);

  const allocatedTotal = useMemo(() => sumExpensePayments(builtPayments), [builtPayments]);

  const paymentRemaining = useMemo(() => {
    if (parsedAmount === null) {
      return null;
    }
    return roundMoney(parsedAmount - allocatedTotal);
  }, [allocatedTotal, parsedAmount]);

  const paymentsMatchTotal =
    parsedAmount !== null &&
    builtPayments.length > 0 &&
    paymentRemaining !== null &&
    Math.abs(paymentRemaining) <= 0.02;

  const canSaveExpense =
    !isClosed &&
    expenseDesc.trim().length > 0 &&
    parsedAmount !== null &&
    paymentsMatchTotal &&
    !savingExpense;

  const handleSplitEvenly = useCallback(() => {
    if (!project || parsedAmount === null || project.participants.length === 0) {
      return;
    }
    const each = roundMoney(parsedAmount / project.participants.length);
    const next: Record<string, string> = {};
    for (const p of project.participants) {
      next[p.id] = String(each);
    }
    setPaymentInputs(next);
  }, [parsedAmount, project]);

  const handleSaveExpense = useCallback(async () => {
    if (!id || !canSaveExpense || parsedAmount === null) {
      return;
    }
    setSavingExpense(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const payload = {
        description: expenseDesc.trim(),
        amount: parsedAmount,
        payments: builtPayments,
      };
      const updated = editingExpenseId
        ? await updateExpense(id, editingExpenseId, payload)
        : await addExpense(id, payload);
      if (updated) {
        setProject(updated);
        resetExpenseForm();
      }
    } finally {
      setSavingExpense(false);
    }
  }, [
    addExpense,
    builtPayments,
    canSaveExpense,
    editingExpenseId,
    expenseDesc,
    id,
    parsedAmount,
    resetExpenseForm,
    updateExpense,
  ]);

  const handleCloseProject = useCallback(async () => {
    if (!id || !project || project.expenses.length === 0) {
      return;
    }
    setClosing(true);
    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updated = await closeProject(id);
      if (updated) {
        setProject(updated);
        setReceiptSheetVisible(true);
        setReceiptMode(null);
        setSelectedParticipantIds([]);
        setActiveSettlementIndex(0);
      }
    } finally {
      setClosing(false);
    }
  }, [closeProject, id, project]);

  const toggleParticipantSelect = useCallback((participantId: string) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((x) => x !== participantId)
        : [...prev, participantId]
    );
  }, []);

  const confirmReceiptMode = useCallback((mode: ReceiptMode) => {
    setReceiptMode(mode);
    setChooseConfirmed(false);
    setActiveSettlementIndex(0);
    setSelectedParticipantIds([]);
  }, []);

  const startShareFlow = useCallback(() => {
    if (Platform.OS === "web") {
      setShowWebAlert(true);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (receiptMode === "overall") {
      setCaptureOverall(true);
      return;
    }
    if (!activeSettlement) {
      return;
    }
    setCaptureSettlement(activeSettlement);
  }, [activeSettlement, receiptMode]);

  useEffect(() => {
    if ((!captureSettlement && !captureOverall) || !project) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        const uri = await captureRef(shotRef, {
          format: "png",
          quality: 1,
          width: getReceiptCaptureExportWidth(receiptWidth),
        });
        if (cancelled || !uri) {
          if (!cancelled) {
            setShareError(true);
          }
          return;
        }
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          setShareError(true);
          return;
        }
        await shareReceiptImage(uri, {
          dialogTitle: t("projectShareReceipt"),
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (captureSettlement && activeSettlementIndex < receiptSettlements.length - 1) {
          setActiveSettlementIndex((i) => i + 1);
        }
      } catch {
        if (!cancelled) {
          setShareError(true);
        }
      } finally {
        if (!cancelled) {
          setCaptureSettlement(null);
          setCaptureOverall(false);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeSettlementIndex,
    captureOverall,
    captureSettlement,
    project,
    receiptSettlements.length,
    receiptWidth,
    t,
  ]);

  const renderExpense = useCallback(
    ({ item }: { item: Project["expenses"][number] }) => {
      const participantIds = project?.participants.map((p) => p.id) ?? [];
      const payments = getExpensePayments(item, participantIds).filter((p) => p.amount > 0);
      const nameById = new Map(project?.participants.map((p) => [p.id, p.name]) ?? []);
      const row = (
        <View style={styles.expenseCard}>
          <View style={styles.expenseMain}>
            <Text style={styles.expenseTitle} numberOfLines={2}>
              {item.description}
            </Text>
            {payments.map((payment) => (
              <View key={payment.participantId} style={styles.expenseMetaRow}>
                <Text style={styles.expenseMeta}>
                  {t("projectExpensePaidLine", {
                    name: nameById.get(payment.participantId) ?? "—",
                    amount: formatCurrency(payment.amount, currency),
                  })}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.expenseAmount}>{formatCurrency(item.amount, currency)}</Text>
        </View>
      );
      if (isClosed || !project) {
        return row;
      }
      return (
        <Pressable
          onPress={() => loadExpenseIntoForm(item)}
          style={({ pressed }) => [pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("projectEditExpense")}
        >
          {row}
        </Pressable>
      );
    },
    [currency, isClosed, loadExpenseIntoForm, project, styles, t]
  );

  if (loading || proLoading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>{t("projectNotFound")}</Text>
        <Pressable onPress={handleBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const total = projectTotalSpent(project);
  const canClose = !isClosed && project.expenses.length > 0 && project.participants.length >= 2;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable onPress={handleBack} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={styles.back} />
      </View>

      <ProGate locked={accessLocked} messageKey="projectProGateBody">
      <ScrollView
        style={styles.gatedScroll}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={[styles.heroRow, rtlRow(isRTL)]}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{project.participants.length}</Text>
              <Text style={styles.heroStatLabel}>{t("projectParticipantsLabel")}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{project.expenses.length}</Text>
              <Text style={styles.heroStatLabel}>{t("projectExpensesTitle")}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, styles.heroAmount]}>{formatCurrency(total, currency)}</Text>
              <Text style={styles.heroStatLabel}>{t("theLackTotal")}</Text>
            </View>
          </View>
          <View style={[styles.statusRow, rtlRow(isRTL)]}>
            <View style={[styles.statusPill, isClosed && styles.statusPillClosed]}>
              <Text style={[styles.statusPillText, isClosed && styles.statusPillTextClosed]}>
                {isClosed ? t("projectStatusClosed") : t("projectStatusOpen")}
              </Text>
            </View>
            {isClosed && liveTransfers.some((tr) => tr.amount > 0 && !tr.paidAt) ? (
              <Text style={styles.waitingHint}>{t("projectClosedWaitingHint")}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>{t("projectExpensesTitle")}</Text>
          </View>
          {project.expenses.length === 0 ? (
            <Text style={styles.muted}>{t("projectNoExpenses")}</Text>
          ) : (
            <FlatList
              data={project.expenses}
              keyExtractor={(e) => e.id}
              renderItem={renderExpense}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.expenseSeparator} />}
            />
          )}
        </View>

        {!isClosed ? (
          <View style={styles.formCard}>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>
                {editingExpenseId ? t("projectEditExpenseTitle") : t("projectAddExpenseTitle")}
              </Text>
            </View>
            <TextInput
              value={expenseDesc}
              onChangeText={setExpenseDesc}
              placeholder={t("projectExpenseDescPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />
            <TextInput
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder={t("billAmount")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              keyboardType="decimal-pad"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
            />
            <Text style={styles.paidByLabel}>{t("projectPaymentsTitle")}</Text>
            <View style={styles.paymentsCard}>
            {project.participants.map((p) => (
              <View key={p.id} style={[styles.paymentRow, rtlRow(isRTL)]}>
                <View style={styles.paymentNameWrap}>
                  <Text style={styles.paymentName} numberOfLines={1}>
                    {p.name}
                  </Text>
                </View>
                <TextInput
                  value={paymentInputs[p.id] ?? ""}
                  onChangeText={(text) =>
                    setPaymentInputs((prev) => ({ ...prev, [p.id]: text }))
                  }
                  placeholder={formatCurrency(0, currency)}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.paymentInput}
                  keyboardType="decimal-pad"
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  accessibilityLabel={p.name}
                />
              </View>
            ))}
            </View>
            {parsedAmount !== null ? (
              <View style={styles.paymentSummary}>
                <Text style={styles.paymentSummaryText}>
                  {t("projectPaymentAllocated", {
                    amount: formatCurrency(allocatedTotal, currency),
                  })}
                </Text>
                <Text
                  style={[
                    styles.paymentSummaryText,
                    paymentRemaining !== null && Math.abs(paymentRemaining) > 0.02
                      ? styles.paymentSummaryWarn
                      : styles.paymentSummaryOk,
                  ]}
                >
                  {t("projectPaymentRemaining", {
                    amount: formatCurrency(paymentRemaining ?? 0, currency),
                  })}
                </Text>
                {!paymentsMatchTotal && builtPayments.length > 0 ? (
                  <Text style={styles.paymentHint}>{t("projectPaymentMustMatch")}</Text>
                ) : null}
              </View>
            ) : null}
            <Pressable
              onPress={handleSplitEvenly}
              disabled={parsedAmount === null}
              style={({ pressed }) => [
                styles.splitEvenlyBtn,
                parsedAmount === null && styles.btnDisabled,
                pressed && parsedAmount !== null && styles.pressed,
              ]}
            >
              <Text style={styles.splitEvenlyText}>⚖️ {t("projectSplitEvenly")}</Text>
            </Pressable>
            <View style={[styles.formActions, rtlRow(isRTL)]}>
              {editingExpenseId ? (
                <Pressable
                  onPress={resetExpenseForm}
                  style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.cancelBtnText}>{t("projectCancelEdit")}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => void handleSaveExpense()}
                disabled={!canSaveExpense}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  editingExpenseId ? styles.secondaryBtnFlex : null,
                  !canSaveExpense && styles.btnDisabled,
                  pressed && canSaveExpense && styles.pressed,
                ]}
              >
                {savingExpense ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.primaryBtnText}>
                    {editingExpenseId ? t("projectSaveExpense") : t("projectAddExpenseButton")}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {!isClosed ? (
          <Pressable
            onPress={() => void handleCloseProject()}
            disabled={!canClose || closing}
            style={({ pressed }) => [
              styles.closeBtn,
              (!canClose || closing) && styles.btnDisabled,
              pressed && canClose && styles.pressed,
            ]}
          >
            {closing ? (
              <ActivityIndicator color={colors.pillActiveText} />
            ) : (
              <Text style={styles.closeBtnText}>{t("projectCloseButton")}</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              setReceiptSheetVisible(true);
              setReceiptMode(null);
            }}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <Text style={styles.closeBtnText}>{t("projectViewReceipts")}</Text>
          </Pressable>
        )}
      </ScrollView>
      </ProGate>

      {(captureSettlement || captureOverall) && project ? (
        <View
          pointerEvents="none"
          style={[styles.offscreenShot, { top: offscreenTop, width: receiptWidth }]}
          collapsable={false}
        >
          <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }} style={{ width: receiptWidth }}>
            {captureOverall || captureSettlement ? (
              <ProjectReceiptCard
                width={receiptWidth}
                projectName={project.name}
                dateRangeLabel={dateRangeLabel}
                currencyCode={currency}
                isPro={isPro}
                hideReceiptBranding={hideReceiptBranding}
                customFooter={footer}
                participants={project.participants}
                expenses={project.expenses}
                settlements={settlements}
                transfers={liveTransfers}
                focusParticipantId={captureSettlement?.participantId}
              />
            ) : null}
          </ViewShot>
        </View>
      ) : null}

      <Modal
        visible={receiptSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={dismissReceiptSheet}
      >
        <View style={styles.sheetRoot}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <View style={[styles.sheetHeader, rtlRow(isRTL)]}>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>{t("projectReceiptOptionsTitle")}</Text>
                {project ? (
                  <Text style={styles.sheetContextHint}>{t(receiptCopyKeys.contextBadge)}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={dismissReceiptSheet}
                hitSlop={12}
                style={({ pressed }) => [styles.sheetCloseBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={t("close")}
              >
                <Text style={styles.sheetCloseText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView
              style={[styles.sheetScroll, { maxHeight: sheetScrollMaxHeight }]}
              contentContainerStyle={styles.sheetScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces
            >
            {!receiptMode ? (
              <View style={styles.sheetOptions}>
                <Pressable
                  onPress={() => confirmReceiptMode("overall")}
                  style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
                >
                  <Text style={styles.sheetOptionText}>{t("projectReceiptOverall")}</Text>
                  <Text style={styles.sheetOptionSub}>{t("projectReceiptOverallSub")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmReceiptMode("everyone")}
                  style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
                >
                  <Text style={styles.sheetOptionText}>{t("projectReceiptEveryone")}</Text>
                  <Text style={styles.sheetOptionSub}>{t("projectReceiptEveryoneSub")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmReceiptMode("choose")}
                  style={({ pressed }) => [styles.sheetOption, pressed && styles.pressed]}
                >
                  <Text style={styles.sheetOptionText}>{t("projectReceiptChoose")}</Text>
                  <Text style={styles.sheetOptionSub}>{t("projectReceiptChooseSub")}</Text>
                </Pressable>
              </View>
            ) : receiptMode === "choose" && !chooseConfirmed ? (
              <View style={styles.chooseBlock}>
                {settlements
                  .filter((s) => s.totalOwed > 0)
                  .map((s) => {
                    const selected = selectedParticipantIds.includes(s.participantId);
                    return (
                      <Pressable
                        key={s.participantId}
                        onPress={() => toggleParticipantSelect(s.participantId)}
                        style={({ pressed }) => [
                          styles.chooseRow,
                          selected && styles.chooseRowSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.chooseRowText}>
                          {selected ? "✓ " : ""}
                          {s.participantName} · {formatCurrency(s.totalOwed, currency)}
                        </Text>
                      </Pressable>
                    );
                  })}
                <Pressable
                  onPress={() => {
                    setChooseConfirmed(true);
                    setActiveSettlementIndex(0);
                  }}
                  disabled={selectedParticipantIds.length === 0}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    selectedParticipantIds.length === 0 && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.closeBtnText}>{t("projectReceiptContinue")}</Text>
                </Pressable>
              </View>
            ) : showOverallPreview && project ? (
              <View style={styles.previewBlock}>
                <ProjectReceiptCard
                  width={Math.min(receiptWidth, windowWidth - spacing.lg * 2)}
                  projectName={project.name}
                  dateRangeLabel={dateRangeLabel}
                  currencyCode={currency}
                  isPro={isPro}
                  hideReceiptBranding={hideReceiptBranding}
                  customFooter={footer}
                  participants={project.participants}
                  expenses={project.expenses}
                  settlements={settlements}
                  transfers={liveTransfers}
                />
                <ShareReceiptButton
                  ready={!captureOverall}
                  disabled={captureOverall}
                  onPress={startShareFlow}
                />
              </View>
            ) : showParticipantPreview && activeSettlement && project ? (
              <View style={styles.previewBlock}>
                <ProjectReceiptCard
                  width={Math.min(receiptWidth, windowWidth - spacing.lg * 2)}
                  projectName={project.name}
                  dateRangeLabel={dateRangeLabel}
                  currencyCode={currency}
                  isPro={isPro}
                  hideReceiptBranding={hideReceiptBranding}
                  customFooter={footer}
                  participants={project.participants}
                  expenses={project.expenses}
                  settlements={settlements}
                  transfers={liveTransfers}
                  focusParticipantId={activeSettlement.participantId}
                />
                {receiptSettlements.length > 1 ? (
                  <Text style={styles.receiptProgress}>
                    {t("projectReceiptProgress", {
                      current: activeSettlementIndex + 1,
                      total: receiptSettlements.length,
                    })}
                  </Text>
                ) : null}
                <ShareReceiptButton
                  ready={!captureSettlement}
                  disabled={!!captureSettlement}
                  onPress={startShareFlow}
                />
              </View>
            ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AppAlert
        visible={showWebAlert}
        title={t("webPreview")}
        message={t("webPreviewSharingOverdue")}
        onRequestClose={() => setShowWebAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebAlert(false) }]}
      />
      <AppAlert
        visible={shareError}
        title={t("shareFailed")}
        message={t("somethingWentWrongShort")}
        onRequestClose={() => setShareError(false)}
        buttons={[{ text: t("ok"), onPress: () => setShareError(false) }]}
      />
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : colors.cardShadowOpacity,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    back: {
      minWidth: 64,
      minHeight: touchTarget.min,
      justifyContent: "center",
    },
    backText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
    },
    headerTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    gatedScroll: {
      flex: 1,
    },
    scroll: {
      gap: spacing.md,
    },
    heroCard: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.35)",
      backgroundColor: isDark ? colors.surface : colors.accentSoft,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow,
    },
    heroRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroStat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    heroStatValue: {
      ...typography.resultSecondary,
      fontSize: 20,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    heroAmount: {
      color: colors.accent,
      fontSize: 18,
    },
    heroStatLabel: {
      ...typography.badge,
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
    },
    heroDivider: {
      width: 1,
      height: 36,
      backgroundColor: colors.border,
      opacity: 0.85,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flexWrap: "wrap",
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    statusPill: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.accent,
    },
    statusPillClosed: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusPillText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    statusPillTextClosed: {
      color: colors.textSecondary,
    },
    waitingHint: {
      ...typography.badge,
      color: colors.accent,
      flex: 1,
    },
    sectionCard: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow,
    },
    formCard: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow,
    },
    sectionPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.accentSoft,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.25)",
      paddingVertical: 5,
      paddingHorizontal: spacing.sm,
    },
    sectionPillText: {
      ...typography.label,
      fontSize: 11,
      color: colors.textPrimary,
    },
    muted: {
      ...typography.body,
      color: colors.textSecondary,
    },
    expenseCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.background : "#FFFDF8",
      borderWidth: 1,
      borderColor: colors.border,
    },
    expenseMain: {
      flex: 1,
      gap: 4,
    },
    expenseTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    expenseMetaRow: {
      paddingLeft: 2,
    },
    expenseMeta: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    expenseAmount: {
      ...typography.resultSecondary,
      fontSize: 18,
      color: colors.accent,
      fontFamily: fonts.bodyBold,
    },
    expenseSeparator: {
      height: spacing.xs,
    },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.background : "#FFFDF8",
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      minHeight: touchTarget.inputHeight - 8,
    },
    paidByLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    paymentsCard: {
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.background : "#FFFDF8",
      padding: spacing.sm,
      gap: spacing.xs,
    },
    paymentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    paymentNameWrap: {
      flex: 1,
      minWidth: 72,
    },
    paymentName: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    paymentInput: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: touchTarget.inputHeight - 12,
      flex: 1,
      minWidth: 100,
      textAlign: "right",
    },
    paymentSummary: {
      gap: 4,
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: isDark ? colors.background : colors.accentSoft,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.2)",
    },
    paymentSummaryText: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    paymentSummaryWarn: {
      color: colors.destructive,
      fontFamily: fonts.bodySemiBold,
    },
    paymentSummaryOk: {
      color: colors.textPrimary,
    },
    paymentHint: {
      ...typography.badge,
      color: colors.accent,
      marginTop: 2,
    },
    splitEvenlyBtn: {
      alignSelf: "flex-start",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      minHeight: touchTarget.min - 8,
      justifyContent: "center",
    },
    splitEvenlyText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
    },
    formActions: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "center",
      marginTop: spacing.xs,
    },
    cancelBtn: {
      flex: 1,
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
    },
    cancelBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    primaryBtn: {
      flex: 1,
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...cardShadow,
    },
    secondaryBtn: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.sm,
      flex: 1,
      backgroundColor: colors.surface,
    },
    secondaryBtnFlex: {
      flex: 1,
    },
    secondaryBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    primaryBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    closeBtn: {
      marginTop: spacing.md,
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...cardShadow,
    },
    closeBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    btnDisabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.88,
    },
    backLink: {
      marginTop: spacing.lg,
    },
    backLinkText: {
      ...typography.body,
      color: colors.accent,
    },
    offscreenShot: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      opacity: 1,
      zIndex: -2,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      maxHeight: "92%",
      flexShrink: 1,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    sheetHeaderText: {
      flex: 1,
      gap: spacing.xs,
    },
    sheetCloseBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetCloseText: {
      ...typography.body,
      fontSize: 22,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    sheetScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    sheetScrollContent: {
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    sheetTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      textAlign: "left",
    },
    sheetContextHint: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "left",
    },
    sheetOptions: {
      gap: spacing.sm,
    },
    sheetOption: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: 4,
      ...cardShadow,
    },
    sheetOptionText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    sheetOptionSub: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    chooseBlock: {
      gap: spacing.sm,
    },
    chooseRow: {
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      padding: spacing.md,
      backgroundColor: colors.surface,
    },
    chooseRowSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chooseRowText: {
      ...typography.body,
      color: colors.textPrimary,
    },
    previewBlock: {
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    receiptProgress: {
      ...typography.badge,
      color: colors.textSecondary,
    },
  });
}
