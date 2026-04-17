import type { RecordScoreResult, TestItemScoreResult } from '../types/scoring.types'
import type { StationConfig } from '../components/StationSelectionDialog.vue'

export interface ForcedFailureInfo {
  isForcedFailure: boolean
  minimumItemScore: number | null
  failingItems: string[]
}

function isNumericScoredItem(item: TestItemScoreResult): boolean {
  return item.scoringType !== 'binary' && item.value !== null
}

export function evaluateForcedFailure(
  scoredRecord: RecordScoreResult,
  stationConfig?: StationConfig,
): ForcedFailureInfo {
  // If minimum item score check is disabled, never flag as forced failure
  const minimumItemScoreEnabled = stationConfig?.minimumItemScoreEnabled ?? true
  if (!minimumItemScoreEnabled) {
    return {
      isForcedFailure: false,
      minimumItemScore: null,
      failingItems: [],
    }
  }

  const minimumItemScore = stationConfig?.minimumItemScore ?? 6.5
  const threshold = minimumItemScore / 10

  const failingItems = scoredRecord.testItemScores
    .filter((item) => isNumericScoredItem(item) && item.score < threshold)
    .map((item) => item.testItemName)

  return {
    isForcedFailure: failingItems.length > 0,
    minimumItemScore,
    failingItems,
  }
}
