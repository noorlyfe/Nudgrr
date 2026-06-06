import type { ProjectWaitingEntry } from "../hooks/useProjects";
import type { Project } from "../hooks/useProjects";
import { personNamesMatch } from "../hooks/usePeople";
import type { SplitRecord } from "../hooks/useSplitHistory";

export type PersonWaitingRow =
  | {
      kind: "split";
      id: string;
      record: SplitRecord;
      description: string;
      amount: number;
      currency: string;
      sentAt: string;
      settled: boolean;
    }
  | {
      kind: "project";
      id: string;
      entry: ProjectWaitingEntry;
      description: string;
      amount: number;
      currency: string;
      sentAt: string;
      settled: boolean;
    };

function splitSentAt(record: SplitRecord): string {
  const iso = typeof record.nudgeSentAt === "string" ? record.nudgeSentAt.trim() : "";
  return iso || record.createdAt;
}

function isSplitSettled(record: SplitRecord): boolean {
  return typeof record.paidAt === "string" && record.paidAt.trim().length > 0;
}

function isProjectTransferSettled(transfer: { paidAt?: string }): boolean {
  return typeof transfer.paidAt === "string" && transfer.paidAt.trim().length > 0;
}

export function getAllProjectTransfersForPerson(projects: Project[], personName: string): ProjectWaitingEntry[] {
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
      if (!personNamesMatch(transfer.fromParticipantName, personName)) {
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
        paidAt: transfer.paidAt,
      });
    }
  }
  return entries.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export function getPersonWaitingRows(
  personName: string,
  splitItems: SplitRecord[],
  projects: Project[],
  appCurrency: string
): PersonWaitingRow[] {
  const rows: PersonWaitingRow[] = [];

  for (const record of splitItems) {
    const linked = typeof record.linkedPersonName === "string" ? record.linkedPersonName.trim() : "";
    if (!linked || !personNamesMatch(linked, personName)) {
      continue;
    }
    rows.push({
      kind: "split",
      id: record.id,
      record,
      description: record.restaurant.trim() || linked,
      amount: Number.isFinite(record.totalPerPerson) ? record.totalPerPerson : 0,
      currency: record.currency ?? "USD",
      sentAt: splitSentAt(record),
      settled: isSplitSettled(record),
    });
  }

  for (const entry of getAllProjectTransfersForPerson(projects, personName)) {
    rows.push({
      kind: "project",
      id: `project-${entry.projectId}-${entry.transferId}`,
      entry,
      description: entry.projectName.trim() || entry.participantName,
      amount: entry.amount,
      currency: appCurrency,
      sentAt: entry.nudgeSentAt?.trim() || entry.closedAt,
      settled: isProjectTransferSettled(entry),
    });
  }

  return rows.sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export function getPersonOutstandingAmount(
  personName: string,
  splitItems: SplitRecord[],
  projects: Project[],
  appCurrency: string
): number {
  return getPersonWaitingRows(personName, splitItems, projects, appCurrency)
    .filter((row) => !row.settled)
    .reduce((sum, row) => sum + row.amount, 0);
}

export function daysOutstanding(sentAt: string): number {
  const MS_PER_DAY = 86_400_000;
  const diff = Date.now() - (Date.parse(sentAt) || Date.now());
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}
