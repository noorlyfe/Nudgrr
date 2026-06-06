import { useCallback, useEffect, useMemo, useState } from "react";

import { NUDGE_TEMPLATES, type NudgeTone, fillNudgeTemplate } from "../constants/messages";

type ToneCycleState = {
  order: number[];
  position: number;
  lastIndex: number | null;
};

type NudgeTemplates = Record<NudgeTone, readonly string[]>;

function shuffledIndices(length: number, avoidFirst: number | null = null): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (avoidFirst !== null && arr.length > 1 && arr[0] === avoidFirst) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

function createInitialCycles(templates: NudgeTemplates): Record<NudgeTone, ToneCycleState> {
  return {
    funny: {
      order: shuffledIndices(templates.funny.length),
      position: 0,
      lastIndex: null,
    },
    casual: {
      order: shuffledIndices(templates.casual.length),
      position: 0,
      lastIndex: null,
    },
    passiveAggressive: {
      order: shuffledIndices(templates.passiveAggressive.length),
      position: 0,
      lastIndex: null,
    },
    serious: {
      order: shuffledIndices(templates.serious.length),
      position: 0,
      lastIndex: null,
    },
  };
}

export function useNudgeCycle(tone: NudgeTone, templates: NudgeTemplates = NUDGE_TEMPLATES) {
  const [toneCycles, setToneCycles] = useState<Record<NudgeTone, ToneCycleState>>(() =>
    createInitialCycles(templates)
  );

  useEffect(() => {
    setToneCycles(createInitialCycles(templates));
  }, [templates]);

  const templateIndex = useMemo(() => {
    const list = templates[tone];
    const cycle = toneCycles[tone];
    if (!cycle || list.length === 0) {
      return 0;
    }
    return cycle.order[cycle.position] ?? 0;
  }, [tone, toneCycles, templates]);

  const cardPosition = useMemo(() => {
    const cycle = toneCycles[tone];
    return cycle?.position ?? 0;
  }, [tone, toneCycles]);

  const advance = useCallback(
    (targetTone: NudgeTone = tone) => {
      setToneCycles((prev) => {
        const current = prev[targetTone];
        const listLength = templates[targetTone].length;
        if (!current || listLength === 0) {
          return prev;
        }

        const currentIndex = current.order[current.position] ?? 0;
        const nextPosition = current.position + 1;

        if (nextPosition < current.order.length) {
          return {
            ...prev,
            [targetTone]: {
              ...current,
              position: nextPosition,
              lastIndex: currentIndex,
            },
          };
        }

        return {
          ...prev,
          [targetTone]: {
            order: shuffledIndices(listLength, currentIndex),
            position: 0,
            lastIndex: currentIndex,
          },
        };
      });
    },
    [templates, tone]
  );

  const rawBody = useCallback(
    (amountFormatted: string) => {
      const list = templates[tone];
      const template = list[templateIndex];
      return fillNudgeTemplate(template, amountFormatted);
    },
    [templateIndex, templates, tone]
  );

  return {
    templateIndex,
    cardPosition,
    advance,
    rawBody,
  };
}
