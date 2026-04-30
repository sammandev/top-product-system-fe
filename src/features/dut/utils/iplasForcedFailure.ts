import type { StationConfig } from '../components/StationSelectionDialog.vue'
import type { RecordScoreResult, TestItemScoreResult } from '../types/scoring.types'

export interface ForcedFailureItemDetail {
  name: string
  score: number
  deviation?: number
  scoreFail: boolean
  deviationFail: boolean
  reasonLabel: string
}

export interface ForcedFailureInfo {
  isForcedFailure: boolean
  minimumItemScore: number | null
  failingItems: ForcedFailureItemDetail[]
}

function isNumericScoredItem(item: TestItemScoreResult): boolean {
  return item.scoringType !== 'binary' && item.value !== null
}

export function evaluateForcedFailure(
  scoredRecord: RecordScoreResult,
  stationConfig?: StationConfig,
): ForcedFailureInfo {
  const minimumItemScoreEnabled = stationConfig?.minimumItemScoreEnabled ?? true
  const minimumItemScore = stationConfig?.minimumItemScore ?? 6.5
  const threshold = minimumItemScore / 10
  const scoringConfigs = stationConfig?.testItemScoringConfigs ?? {}

  const failingItems = scoredRecord.testItemScores
    .filter((item) => isNumericScoredItem(item))
    .flatMap((item) => {
      const scoreFail = minimumItemScoreEnabled && item.score < threshold
      const configuredMaxDeviation = scoringConfigs[item.testItemName]?.maxDeviation
      const deviationFail = Boolean(
        item.exceedsMaxDeviation ||
          (configuredMaxDeviation !== undefined &&
            item.deviation !== undefined &&
            Math.abs(item.deviation) > configuredMaxDeviation),
      )

      if (!scoreFail && !deviationFail) {
        return []
      }

      return [
        {
          name: item.testItemName,
          score: item.score,
          deviation: item.deviation,
          scoreFail,
          deviationFail,
          reasonLabel:
            scoreFail && deviationFail
              ? 'Dev./Score Fail'
              : deviationFail
                ? 'Deviation Fail'
                : 'Score Fail',
        },
      ]
    })

  return {
    isForcedFailure: failingItems.length > 0,
    minimumItemScore: minimumItemScoreEnabled ? minimumItemScore : null,
    failingItems,
  }
}
