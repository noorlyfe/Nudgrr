import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { fonts, getReceiptColors, typography } from "../constants/theme";
import {
  computeParticipantBalances,
  computeSettlementTransfers,
  getExpensePayments,
  type ProjectExpense,
  type ProjectParticipant,
  type ProjectSettlement,
  type ProjectTransfer,
} from "../hooks/useProjects";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type ProjectReceiptCardProps = {
  width: number;
  projectName: string;
  dateRangeLabel: string;
  currencyCode: string;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter?: string;
  participants: ProjectParticipant[];
  expenses: ProjectExpense[];
  settlements: ProjectSettlement[];
  transfers?: ProjectTransfer[];
  /** Emphasizes one person's balance (individual share receipt). */
  focusParticipantId?: string;
};

type ReceiptColors = {
  background: string;
  text: string;
  accent: string;
  divider: string;
  muted: string;
  surface: string;
};

function receiptColorsForTheme(isDark: boolean): ReceiptColors {
  return getReceiptColors(isDark);
}

function DashedRule({ color }: { color: string }) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: color,
        borderStyle: "dashed",
        marginVertical: 10,
        width: "100%",
      }}
    />
  );
}

function PerforationEdge({ width, color, position }: { width: number; color: string; position: "top" | "bottom" }) {
  const circles = Math.floor(width / 12);
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 6,
        marginTop: position === "bottom" ? 12 : 0,
        marginBottom: position === "top" ? 12 : 0,
      }}
    >
      {Array.from({ length: circles }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: 0.4,
          }}
        />
      ))}
    </View>
  );
}

export const ProjectReceiptCard = memo(function ProjectReceiptCard({
  width,
  projectName,
  dateRangeLabel,
  currencyCode,
  isPro,
  hideReceiptBranding = false,
  customFooter = "",
  participants,
  expenses,
  settlements,
  transfers: transfersProp,
  focusParticipantId,
}: ProjectReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);
  const showBranding = !(isPro && hideReceiptBranding);
  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );

  const title = projectName.trim() || t("projectDefaultName");
  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0),
    [expenses]
  );

  const participantIds = useMemo(() => participants.map((p) => p.id), [participants]);

  const balances = useMemo(
    () => computeParticipantBalances(participants, expenses),
    [expenses, participants]
  );

  const transfers = useMemo(() => {
    if (transfersProp && transfersProp.length > 0) {
      return transfersProp;
    }
    return computeSettlementTransfers(participants, balances);
  }, [balances, participants, transfersProp]);

  const focusTransfer = useMemo(
    () => transfers.find((tr) => tr.fromParticipantId === focusParticipantId),
    [focusParticipantId, transfers]
  );

  const settlementByParticipant = useMemo(() => {
    const map = new Map<string, ProjectSettlement>();
    for (const s of settlements) {
      map.set(s.participantId, s);
    }
    return map;
  }, [settlements]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) {
      map.set(p.id, p.name);
    }
    return map;
  }, [participants]);

  return (
    <View
      style={[
        styles.root,
        {
          width,
          backgroundColor: colors.background,
          borderColor: colors.divider,
        },
      ]}
    >
      <PerforationEdge width={width} color={colors.muted} position="top" />

      <View style={styles.inner}>
        <Text style={[styles.titleMain, { color: colors.text }]} numberOfLines={3}>
          {title}
        </Text>
        <Text style={[styles.date, { color: colors.muted }]}>{dateRangeLabel}</Text>

        <DashedRule color={colors.divider} />

        <View style={styles.block}>
          {expenses.length === 0 ? (
            <Text style={[styles.mutedLine, { color: colors.muted }]}>{t("projectNoExpenses")}</Text>
          ) : (
            expenses.map((expense) => {
              const payments = getExpensePayments(expense, participantIds).filter((p) => p.amount > 0);
              return (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={[styles.row, rtlRow(isRTL)]}>
                    <Text style={[styles.lineLabel, { color: colors.text }]} numberOfLines={2}>
                      {expense.description}
                    </Text>
                    <Text style={[styles.lineVal, { color: colors.text }]}>
                      {formatCurrency(expense.amount, currencyCode)}
                    </Text>
                  </View>
                  {payments.map((payment) => (
                    <Text
                      key={`${expense.id}-${payment.participantId}`}
                      style={[styles.paidByLine, { color: colors.muted }]}
                    >
                      {t("projectExpensePaidLine", {
                        name: nameById.get(payment.participantId) ?? "—",
                        amount: formatCurrency(payment.amount, currencyCode),
                      })}
                    </Text>
                  ))}
                </View>
              );
            })
          )}
        </View>

        <DashedRule color={colors.divider} />

        <View style={[styles.row, rtlRow(isRTL)]}>
          <Text style={[styles.lineLabelBold, { color: colors.text }]}>{t("projectReceiptTotalLabel")}</Text>
          <Text style={[styles.lineValBold, { color: colors.text }]}>
            {formatCurrency(total, currencyCode)}
          </Text>
        </View>

        <DashedRule color={colors.divider} />

        {focusTransfer ? (
          <View style={[styles.focusBox, { borderColor: colors.divider, backgroundColor: colors.surface }]}>
            <Text style={[styles.focusAmount, { color: colors.accent }]}>
              {t("projectReceiptTransferLine", {
                from: focusTransfer.fromParticipantName,
                to: focusTransfer.toParticipantName,
                amount: formatCurrency(focusTransfer.amount, currencyCode),
              })}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionHeading, { color: colors.muted }]}>{t("projectReceiptWhoPaidTitle")}</Text>
        <View style={styles.block}>
          {balances.map((row) => (
            <View key={`paid-${row.participantId}`} style={[styles.row, rtlRow(isRTL)]}>
              <Text style={[styles.lineLabel, { color: colors.text }]} numberOfLines={1}>
                {row.participantName}
              </Text>
              <Text style={[styles.lineVal, { color: colors.text }]}>
                {formatCurrency(row.paid, currencyCode)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeading, { color: colors.muted }]}>{t("projectReceiptBalancesTitle")}</Text>
        <View style={styles.block}>
          {balances.map((row) => {
            const isFocus = row.participantId === focusParticipantId;
            const statusText =
              row.netBalance > 0.005
                ? t("projectReceiptCredit", { amount: formatCurrency(row.netBalance, currencyCode) })
                : row.netBalance < -0.005
                  ? t("projectReceiptNetOwes", { amount: formatCurrency(-row.netBalance, currencyCode) })
                  : t("projectReceiptSettled");
            return (
              <View
                key={`bal-${row.participantId}`}
                style={[
                  styles.row,
                  rtlRow(isRTL),
                  isFocus && styles.rowFocus,
                  isFocus && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[styles.lineLabel, isFocus && styles.lineLabelFocus, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {row.participantName}
                </Text>
                <Text
                  style={[
                    styles.lineVal,
                    row.netBalance < -0.005 && styles.lineValOwed,
                    {
                      color:
                        row.netBalance < -0.005
                          ? colors.accent
                          : row.netBalance > 0.005
                            ? colors.muted
                            : colors.muted,
                    },
                  ]}
                >
                  {statusText}
                </Text>
              </View>
            );
          })}
        </View>

        {transfers.length > 0 ? (
          <>
            <Text style={[styles.sectionHeading, { color: colors.muted }]}>
              {t("projectReceiptSettlementTitle")}
            </Text>
            <View style={styles.block}>
              {transfers.map((transfer) => (
                <Text
                  key={transfer.id}
                  style={[styles.transferLine, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {t("projectReceiptTransferLine", {
                    from: transfer.fromParticipantName,
                    to: transfer.toParticipantName,
                    amount: formatCurrency(transfer.amount, currencyCode),
                  })}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.block}>
            {balances.map((row) => {
              const owed = settlementByParticipant.get(row.participantId)?.totalOwed ?? 0;
              if (owed <= 0.005) {
                return null;
              }
              return (
                <View key={`legacy-${row.participantId}`} style={[styles.row, rtlRow(isRTL)]}>
                  <Text style={[styles.lineLabel, { color: colors.text }]} numberOfLines={1}>
                    {row.participantName}
                  </Text>
                  <Text style={[styles.lineVal, styles.lineValOwed, { color: colors.accent }]}>
                    {t("projectReceiptOwes", { amount: formatCurrency(owed, currencyCode) })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <ReceiptCustomFooter text={footerText} color={colors.muted} />
        {showBranding ? (
          <Text style={[styles.madeWith, { color: colors.muted }]}>{t("projectReceiptMadeWith")}</Text>
        ) : null}
      </View>

      <PerforationEdge width={width} color={colors.muted} position="bottom" />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    flexShrink: 0,
    borderWidth: 0.5,
    borderRadius: 4,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  inner: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  titleMain: {
    fontFamily: fonts.mono,
    fontSize: 18,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 8,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  block: {
    gap: 8,
    width: "100%",
  },
  expenseItem: {
    gap: 2,
  },
  paidByLine: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.2,
    paddingLeft: 4,
  },
  transferLine: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  mutedLine: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  sectionHeading: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  rowFocus: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  lineLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    flex: 1,
    paddingRight: 8,
  },
  lineLabelFocus: {
    fontWeight: "500",
  },
  lineVal: {
    fontFamily: fonts.mono,
    fontSize: 10,
    flexShrink: 0,
  },
  lineValOwed: {
    fontWeight: "500",
  },
  lineLabelBold: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },
  lineValBold: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "500",
  },
  focusBox: {
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 12,
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  focusAmount: {
    fontFamily: fonts.mono,
    fontSize: typography.resultPrimary.fontSize,
    fontWeight: "500",
    letterSpacing: typography.resultPrimary.letterSpacing,
    textAlign: "center",
  },
  madeWith: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
});
