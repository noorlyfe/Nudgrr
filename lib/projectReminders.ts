import type { NudgeTone } from "../constants/messages";

export type ProjectReminderParams = {
  amount: string;
  project: string;
  payee: string;
};

/** Level-2 reminder tone escalation (matches split overdue receipts). */
export function escalatedProjectReminderTone(original: NudgeTone): NudgeTone {
  if (original === "serious" || original === "passiveAggressive") {
    return "serious";
  }
  return "passiveAggressive";
}

export function projectReminderMessageKey(tone: NudgeTone): string {
  switch (tone) {
    case "casual":
      return "projectReminderCasual";
    case "passiveAggressive":
      return "projectReminderPassive";
    case "serious":
      return "projectReminderSerious";
    case "funny":
    default:
      return "projectReminderFunny";
  }
}

export function buildProjectReminderMessage(
  t: (key: string, params?: Record<string, string>) => string,
  originalTone: NudgeTone,
  daysOverdue: number,
  params: ProjectReminderParams
): string {
  const tone = daysOverdue > 0 ? escalatedProjectReminderTone(originalTone) : originalTone;
  return t(projectReminderMessageKey(tone), params);
}
