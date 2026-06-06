import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NudgeTone } from "../constants/messages";

const STORAGE_KEY = "nudgrr_projects";

export type ProjectParticipant = {
  id: string;
  name: string;
};

export type ExpensePayment = {
  participantId: string;
  amount: number;
};

export type ProjectExpense = {
  id: string;
  description: string;
  amount: number;
  payments: ExpensePayment[];
  createdAt: string;
};

export type ProjectSettlementLine = {
  expenseId: string;
  description: string;
  expenseAmount: number;
  participantShare: number;
};

export type ProjectSettlement = {
  participantId: string;
  participantName: string;
  lines: ProjectSettlementLine[];
  totalOwed: number;
  paidAt?: string;
};

/** Identifies settlement debts surfaced in The Waiting Game. */
export type ProjectWaitingSource = "project";

export type ProjectTransfer = {
  id: string;
  fromParticipantId: string;
  fromParticipantName: string;
  toParticipantId: string;
  toParticipantName: string;
  amount: number;
  paidAt?: string;
  /** Always `project` for settlement transfers (Waiting Game / Lack). */
  waitingSource?: ProjectWaitingSource;
  nudgeTone?: NudgeTone;
  /** ISO 8601 when a reminder image was shared for this transfer. */
  nudgeSentAt?: string;
  nudgePreviewText?: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  closedAt: string | null;
  participants: ProjectParticipant[];
  expenses: ProjectExpense[];
  status: "open" | "closed";
  settlements?: ProjectSettlement[];
  transfers?: ProjectTransfer[];
};

export type ProjectWaitingEntry = {
  transferId: string;
  projectId: string;
  participantId: string;
  participantName: string;
  toParticipantId: string;
  toParticipantName: string;
  projectName: string;
  amount: number;
  closedAt: string;
  waitingSource: ProjectWaitingSource;
  nudgeTone?: NudgeTone;
  nudgeSentAt?: string;
  paidAt?: string;
};

export type ParticipantBalanceRow = {
  participantId: string;
  participantName: string;
  fairShare: number;
  paid: number;
  /** paid − fairShare (positive = others owe them). */
  netBalance: number;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function normalizeLegacyPaidBy(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((id): id is string => typeof id === "string" && id.length > 0);
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    return [raw];
  }
  return [];
}

function normalizeExpensePayments(
  expense: { amount: number; payments?: unknown; paidBy?: unknown },
  participantIds: string[]
): ExpensePayment[] {
  const amount = Number.isFinite(expense.amount) ? expense.amount : 0;
  const validIds = new Set(participantIds);

  if (Array.isArray(expense.payments)) {
    const parsed = expense.payments
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const r = row as { participantId?: unknown; amount?: unknown };
        const participantId = typeof r.participantId === "string" ? r.participantId : "";
        const payAmount = typeof r.amount === "number" ? r.amount : 0;
        if (!validIds.has(participantId) || payAmount <= 0) {
          return null;
        }
        return { participantId, amount: roundMoney(payAmount) };
      })
      .filter((p): p is ExpensePayment => p !== null);
    if (parsed.length > 0) {
      return parsed;
    }
  }

  const legacyPayers = normalizeLegacyPaidBy(expense.paidBy).filter((id) => validIds.has(id));
  if (legacyPayers.length > 0 && amount > 0) {
    const each = amount / legacyPayers.length;
    return legacyPayers.map((participantId) => ({
      participantId,
      amount: roundMoney(each),
    }));
  }

  return [];
}

function normalizeProject(project: Project): Project {
  const participantIds = project.participants.map((p) => p.id);
  return {
    ...project,
    expenses: project.expenses.map((expense) => ({
      ...expense,
      payments: normalizeExpensePayments(expense, participantIds),
    })),
    transfers: Array.isArray(project.transfers)
      ? project.transfers.map((t) => ({
          ...t,
          waitingSource: t.waitingSource ?? "project",
        }))
      : [],
  };
}

export function getExpensePayments(
  expense: ProjectExpense,
  participantIds: string[]
): ExpensePayment[] {
  return normalizeExpensePayments(expense, participantIds);
}

export function formatParticipantNames(
  ids: string[],
  participants: ProjectParticipant[],
  separator: string
): string {
  return ids
    .map((id) => participants.find((p) => p.id === id)?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .join(separator);
}

export function sumExpensePayments(payments: ExpensePayment[]): number {
  return roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
}

async function readAll(): Promise<Project[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return (parsed.filter(Boolean) as Project[]).map(normalizeProject);
  } catch {
    return [];
  }
}

async function writeAll(items: Project[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function projectTotalSpent(project: Project): number {
  return project.expenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0);
}

export function computeParticipantBalances(
  participants: ProjectParticipant[],
  expenses: ProjectExpense[]
): ParticipantBalanceRow[] {
  const n = participants.length;
  if (n === 0) {
    return [];
  }
  const participantIds = participants.map((p) => p.id);
  const paidByParticipant = new Map<string, number>();
  const shareByParticipant = new Map<string, number>();

  for (const p of participants) {
    paidByParticipant.set(p.id, 0);
    shareByParticipant.set(p.id, 0);
  }

  for (const expense of expenses) {
    const amount = Number.isFinite(expense.amount) ? expense.amount : 0;
    const perPerson = amount / n;
    for (const p of participants) {
      shareByParticipant.set(p.id, (shareByParticipant.get(p.id) ?? 0) + perPerson);
    }
    const payments = getExpensePayments(expense, participantIds);
    for (const payment of payments) {
      paidByParticipant.set(
        payment.participantId,
        (paidByParticipant.get(payment.participantId) ?? 0) + payment.amount
      );
    }
  }

  return participants.map((p) => {
    const fairShare = shareByParticipant.get(p.id) ?? 0;
    const paid = paidByParticipant.get(p.id) ?? 0;
    const netBalance = paid - fairShare;
    return {
      participantId: p.id,
      participantName: p.name,
      fairShare: roundMoney(fairShare),
      paid: roundMoney(paid),
      netBalance: roundMoney(netBalance),
    };
  });
}

export function computeSettlementTransfers(
  participants: ProjectParticipant[],
  balances: ParticipantBalanceRow[]
): ProjectTransfer[] {
  const debtors = balances
    .filter((b) => b.netBalance < -0.005)
    .map((b) => ({
      id: b.participantId,
      name: b.participantName,
      amount: roundMoney(-b.netBalance),
    }));
  const creditors = balances
    .filter((b) => b.netBalance > 0.005)
    .map((b) => ({
      id: b.participantId,
      name: b.participantName,
      amount: roundMoney(b.netBalance),
    }));

  const transfers: ProjectTransfer[] = [];
  let di = 0;
  let ci = 0;

  while (di < debtors.length && ci < creditors.length) {
    const pay = Math.min(debtors[di].amount, creditors[ci].amount);
    if (pay > 0.005) {
      transfers.push({
        id: newId(),
        fromParticipantId: debtors[di].id,
        fromParticipantName: debtors[di].name,
        toParticipantId: creditors[ci].id,
        toParticipantName: creditors[ci].name,
        amount: roundMoney(pay),
        waitingSource: "project",
      });
    }
    debtors[di].amount = roundMoney(debtors[di].amount - pay);
    creditors[ci].amount = roundMoney(creditors[ci].amount - pay);
    if (debtors[di].amount < 0.01) {
      di += 1;
    }
    if (creditors[ci].amount < 0.01) {
      ci += 1;
    }
  }

  return transfers;
}

export function computeSettlements(project: Project): ProjectSettlement[] {
  const n = project.participants.length;
  if (n === 0) {
    return [];
  }

  const balances = computeParticipantBalances(project.participants, project.expenses);
  const transfers = computeSettlementTransfers(project.participants, balances);

  return project.participants.map((p) => {
    const fairShare = balances.find((b) => b.participantId === p.id)?.fairShare ?? 0;
    const paid = balances.find((b) => b.participantId === p.id)?.paid ?? 0;
    const totalOwed = roundMoney(
      transfers
        .filter((t) => t.fromParticipantId === p.id)
        .reduce((sum, t) => sum + t.amount, 0)
    );

    const lines: ProjectSettlementLine[] = project.expenses.map((expense) => {
      const expenseAmount = Number.isFinite(expense.amount) ? expense.amount : 0;
      return {
        expenseId: expense.id,
        description: expense.description,
        expenseAmount,
        participantShare: expenseAmount / n,
      };
    });

    return {
      participantId: p.id,
      participantName: p.name,
      lines,
      totalOwed: totalOwed > 0 ? totalOwed : roundMoney(Math.max(0, fairShare - paid)),
    };
  });
}

export function getUnpaidProjectDebts(projects: Project[]): ProjectWaitingEntry[] {
  const entries: ProjectWaitingEntry[] = [];
  for (const project of projects) {
    if (project.status !== "closed" || !project.closedAt) {
      continue;
    }
    const transfers = project.transfers ?? [];
    for (const transfer of transfers) {
      if (transfer.amount <= 0) {
        continue;
      }
      const paidAt = typeof transfer.paidAt === "string" ? transfer.paidAt.trim() : "";
      if (paidAt.length > 0) {
        continue;
      }
      entries.push({
        transferId: transfer.id,
        projectId: project.id,
        participantId: transfer.fromParticipantId,
        participantName: transfer.fromParticipantName,
        toParticipantId: transfer.toParticipantId,
        toParticipantName: transfer.toParticipantName,
        projectName: project.name,
        amount: transfer.amount,
        closedAt: project.closedAt,
        waitingSource: transfer.waitingSource ?? "project",
        nudgeTone: transfer.nudgeTone,
        nudgeSentAt: transfer.nudgeSentAt,
      });
    }
  }
  return entries.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export function getProjectLackDebts(projects: Project[]): ProjectWaitingEntry[] {
  return getUnpaidProjectDebts(projects);
}

function validatePayments(
  amount: number,
  payments: ExpensePayment[],
  participants: ProjectParticipant[]
): ExpensePayment[] | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const validIds = new Set(participants.map((p) => p.id));
  const normalized = payments
    .filter((p) => validIds.has(p.participantId) && p.amount > 0)
    .map((p) => ({ participantId: p.participantId, amount: roundMoney(p.amount) }));
  if (normalized.length === 0) {
    return null;
  }
  const sum = sumExpensePayments(normalized);
  if (Math.abs(sum - amount) > 0.02) {
    return null;
  }
  return normalized;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const all = await readAll();
      setProjects(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openProjectCount = projects.filter((p) => p.status === "open").length;

  const createProject = useCallback(
    async (input: { name: string; participantNames: string[] }, options?: { isPro?: boolean }) => {
      const isPro = options?.isPro ?? false;
      if (!isPro) {
        return null;
      }
      const all = await readAll();

      const now = new Date().toISOString();
      const participants: ProjectParticipant[] = input.participantNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .map((name) => ({ id: newId(), name }));

      const project: Project = {
        id: newId(),
        name: input.name.trim() || "Project",
        createdAt: now,
        closedAt: null,
        participants,
        expenses: [],
        status: "open",
      };

      await writeAll([project, ...all]);
      await reload();
      return project;
    },
    [reload]
  );

  const getById = useCallback(async (id: string): Promise<Project | null> => {
    const all = await readAll();
    return all.find((p) => p.id === id) ?? null;
  }, []);

  const addExpense = useCallback(
    async (
      projectId: string,
      expense: { description: string; amount: number; payments: ExpensePayment[] }
    ) => {
      const all = await readAll();
      const ix = all.findIndex((p) => p.id === projectId);
      if (ix < 0 || all[ix].status !== "open") {
        return null;
      }
      const row = all[ix];
      const payments = validatePayments(expense.amount, expense.payments, row.participants);
      if (!payments) {
        return null;
      }
      const nextExpense: ProjectExpense = {
        id: newId(),
        description: expense.description.trim() || "Expense",
        amount: roundMoney(expense.amount),
        payments,
        createdAt: new Date().toISOString(),
      };
      const updated: Project = {
        ...row,
        expenses: [...row.expenses, nextExpense],
      };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
      return updated;
    },
    [reload]
  );

  const updateExpense = useCallback(
    async (
      projectId: string,
      expenseId: string,
      expense: { description: string; amount: number; payments: ExpensePayment[] }
    ) => {
      const all = await readAll();
      const ix = all.findIndex((p) => p.id === projectId);
      if (ix < 0 || all[ix].status !== "open") {
        return null;
      }
      const row = all[ix];
      const eIx = row.expenses.findIndex((e) => e.id === expenseId);
      if (eIx < 0) {
        return null;
      }
      const payments = validatePayments(expense.amount, expense.payments, row.participants);
      if (!payments) {
        return null;
      }
      const updatedExpense: ProjectExpense = {
        ...row.expenses[eIx],
        description: expense.description.trim() || "Expense",
        amount: roundMoney(expense.amount),
        payments,
      };
      const nextExpenses = [...row.expenses];
      nextExpenses[eIx] = updatedExpense;
      const updated: Project = { ...row, expenses: nextExpenses };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
      return updated;
    },
    [reload]
  );

  const closeProject = useCallback(
    async (projectId: string) => {
      const all = await readAll();
      const ix = all.findIndex((p) => p.id === projectId);
      if (ix < 0 || all[ix].status !== "open") {
        return null;
      }
      const row = all[ix];
      const now = new Date().toISOString();
      const balances = computeParticipantBalances(row.participants, row.expenses);
      const transfers = computeSettlementTransfers(row.participants, balances);
      const settlements = computeSettlements(row);
      const updated: Project = {
        ...row,
        status: "closed",
        closedAt: now,
        settlements,
        transfers,
      };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
      return updated;
    },
    [reload]
  );

  const markSettlementPaid = useCallback(
    async (projectId: string, transferId: string) => {
      const all = await readAll();
      const ix = all.findIndex((p) => p.id === projectId);
      if (ix < 0) {
        return;
      }
      const row = all[ix];
      const transfer = (row.transfers ?? []).find((t) => t.id === transferId);
      if (!transfer) {
        return;
      }
      const now = new Date().toISOString();
      const transfers = (row.transfers ?? []).map((t) =>
        t.id === transferId ? { ...t, paidAt: now } : t
      );
      const settlements = (row.settlements ?? []).map((s) =>
        s.participantId === transfer.fromParticipantId ? { ...s, paidAt: now } : s
      );
      const updated: Project = { ...row, transfers, settlements };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
    },
    [reload]
  );

  const markProjectNudgeSent = useCallback(
    async (
      projectId: string,
      transferId: string,
      meta: { nudgeTone: NudgeTone; nudgePreviewText: string }
    ) => {
      const all = await readAll();
      const ix = all.findIndex((p) => p.id === projectId);
      if (ix < 0) {
        return;
      }
      const row = all[ix];
      const now = new Date().toISOString();
      const transfers = (row.transfers ?? []).map((t) =>
        t.id === transferId
          ? {
              ...t,
              nudgeSentAt: now,
              nudgeTone: meta.nudgeTone,
              nudgePreviewText: meta.nudgePreviewText,
            }
          : t
      );
      const updated: Project = { ...row, transfers };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
    },
    [reload]
  );

  const clearAllProjects = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await reload();
  }, [reload]);

  const deleteProject = useCallback(
    async (projectId: string) => {
      const all = await readAll();
      const next = all.filter((p) => p.id !== projectId);
      if (next.length === all.length) {
        return;
      }
      await writeAll(next);
      await reload();
    },
    [reload]
  );

  const unmarkSettlementPaid = useCallback(
    async (projectId: string, transferId: string) => {
      const all = await readAll();
      const ix = all.findIndex((p) => p.id === projectId);
      if (ix < 0) {
        return;
      }
      const row = all[ix];
      const transfer = (row.transfers ?? []).find((t) => t.id === transferId);
      if (!transfer) {
        return;
      }
      const transfers = (row.transfers ?? []).map((t) =>
        t.id === transferId ? { ...t, paidAt: undefined } : t
      );
      const settlements = (row.settlements ?? []).map((s) =>
        s.participantId === transfer.fromParticipantId ? { ...s, paidAt: undefined } : s
      );
      const updated: Project = { ...row, transfers, settlements };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
    },
    [reload]
  );

  return {
    projects,
    loading,
    reload,
    openProjectCount,
    createProject,
    getById,
    addExpense,
    updateExpense,
    closeProject,
    markSettlementPaid,
    markProjectNudgeSent,
    deleteProject,
    clearAllProjects,
    unmarkSettlementPaid,
    getUnpaidDebts: useCallback(() => getUnpaidProjectDebts(projects), [projects]),
    getLackDebts: useCallback(() => getProjectLackDebts(projects), [projects]),
  };
}
