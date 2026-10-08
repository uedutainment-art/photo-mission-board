import type { GridSize } from "./types";

export interface CollageFitOption {
  id: "down" | "up";
  label: string;
  grid: GridSize;
  totalSlots: number;
  perTeamCount: number;
  delta: number;
}

export interface CollageFitResult {
  exact: boolean;
  totalSlots: number;
  perTeamCount: number | null;
  options: CollageFitOption[];
  recommended: CollageFitOption | null;
}

function getGridScore(candidate: GridSize, preferred: GridSize): number {
  const candidateAspect = candidate.cols / candidate.rows;
  const preferredAspect = preferred.cols / preferred.rows;
  const aspectScore = Math.abs(candidateAspect - preferredAspect);
  const dimensionScore = Math.abs(candidate.cols - preferred.cols) + Math.abs(candidate.rows - preferred.rows);

  return aspectScore * 10 + dimensionScore;
}

export function getClosestGridForTotal(totalSlots: number, preferred: GridSize): GridSize {
  let bestGrid: GridSize = { cols: totalSlots, rows: 1 };
  let bestScore = Number.POSITIVE_INFINITY;

  for (let cols = 1; cols <= totalSlots; cols += 1) {
    if (totalSlots % cols !== 0) {
      continue;
    }

    const rows = totalSlots / cols;
    const candidates = [
      { cols, rows },
      { cols: rows, rows: cols },
    ];

    for (const candidate of candidates) {
      const score = getGridScore(candidate, preferred);

      if (score < bestScore) {
        bestGrid = candidate;
        bestScore = score;
      }
    }
  }

  return bestGrid;
}

function makeOption(
  id: CollageFitOption["id"],
  targetSlots: number,
  currentSlots: number,
  preferred: GridSize,
  teamCount: number,
): CollageFitOption | null {
  if (targetSlots <= 0 || targetSlots === currentSlots || targetSlots % teamCount !== 0) {
    return null;
  }

  const grid = getClosestGridForTotal(targetSlots, preferred);
  const perTeamCount = targetSlots / teamCount;
  const delta = targetSlots - currentSlots;

  return {
    id,
    label: id === "up" ? "칸 늘려 맞추기" : "칸 줄여 맞추기",
    grid,
    totalSlots: targetSlots,
    perTeamCount,
    delta,
  };
}

export function getCollageFit(grid: GridSize, teamCount: number): CollageFitResult {
  const totalSlots = grid.rows * grid.cols;

  if (teamCount <= 0 || totalSlots <= 0) {
    return {
      exact: false,
      options: [],
      perTeamCount: null,
      recommended: null,
      totalSlots,
    };
  }

  if (totalSlots % teamCount === 0) {
    return {
      exact: true,
      options: [],
      perTeamCount: totalSlots / teamCount,
      recommended: null,
      totalSlots,
    };
  }

  const lowerSlots = Math.floor(totalSlots / teamCount) * teamCount;
  const upperSlots = Math.ceil(totalSlots / teamCount) * teamCount;
  const options = [
    makeOption("down", lowerSlots, totalSlots, grid, teamCount),
    makeOption("up", upperSlots, totalSlots, grid, teamCount),
  ].filter((option): option is CollageFitOption => Boolean(option));
  const recommended = [...options].sort((a, b) => {
    const deltaCompare = Math.abs(a.delta) - Math.abs(b.delta);

    if (deltaCompare !== 0) {
      return deltaCompare;
    }

    return a.id === "up" ? -1 : 1;
  })[0] ?? null;

  return {
    exact: false,
    options,
    perTeamCount: null,
    recommended,
    totalSlots,
  };
}

export function getCollectionGrid(totalSlots: number): GridSize {
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(totalSlots, 1))));

  return {
    cols,
    rows: Math.max(1, Math.ceil(Math.max(totalSlots, 1) / cols)),
  };
}
