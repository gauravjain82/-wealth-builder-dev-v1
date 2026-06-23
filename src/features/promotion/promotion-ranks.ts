import type { RankCode } from "./types";

const NEXT_RANK_BY_LEVEL: Record<string, string> = {
  TA: "Associate",
  A: "Marketing Director",
  MD: "Senior Marketing Director",
};

export function getNextRankName(levelCode: RankCode): string {
  return NEXT_RANK_BY_LEVEL[levelCode] ?? "Next Level";
}
