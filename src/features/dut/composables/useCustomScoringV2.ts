import { computed, ref } from 'vue'

// Formula template types
export type FormulaType = 'linear' | 'exponential' | 'logarithmic' | 'step' | 'custom'

// Formula parameters for different types
export interface FormulaParameters {
  // Linear parameters
  tolerance?: number // For linear: deviation tolerance

  // Exponential parameters
  decayRate?: number // For exponential: e^(-x/rate)
  baseline?: number // Score baseline (default 5 or 10)

  // Logarithmic parameters
  logBase?: number // Logarithm base (default e)
  scaleFactor?: number // Scale multiplier

  // Step parameters
  thresholds?: number[] // Step breakpoints
  scores?: number[] // Score at each step

  // Bonus zones
  bonusThreshold?: number // Beyond this gets bonus
  bonusRate?: number // Bonus multiplier

  // General bounds
  minScore?: number // Minimum score (default 0)
  maxScore?: number // Maximum score (default 10)
}

// Enhanced custom formula interface
export interface CustomFormulaV2 {
  name: string
  enabled: boolean
  formulaType: FormulaType
  parameters: FormulaParameters
  customExpression?: string // For 'custom' type
  description?: string
  calculate: (actual: number, usl: number | null, lsl: number | null, target: number) => number
}

export interface CategoryFormulasV2 {
  [category: string]: CustomFormulaV2
}

export type ScoreSource = 'category' | 'universal' | 'system'

export interface ScoredMeasurement {
  testItem: string
  usl: number | null
  lsl: number | null
  actual: number
  target: number
  systemScore: number
  customScore?: number
  scoreSource?: ScoreSource
}

// New interfaces for backend integration
export interface ScoringResult {
  systemScore: number // From backend
  customScore: number // From frontend formula
  difference: number // customScore - systemScore
  formula: string // Formula name/description used
  method: 'system' | 'custom' | 'both'
  category?: string // Detected category
}

export interface MeasurementWithScoring {
  test_item: string
  usl: number | null
  lsl: number | null
  actual: number
  score_breakdown: ScoreBreakdownData // From backend
  custom_scoring?: ScoringResult // From frontend
}

export interface ScoreBreakdownData {
  category: string
  method: string
  usl: number | null
  lsl: number | null
  target_used: number | null
  actual: number
  deviation: number | null
  raw_score: number
  final_score: number
  formula_latex: string
}

// Formula template creators
const createLinearFormula = (
  params: FormulaParameters,
): ((a: number, u: number | null, l: number | null, t: number) => number) => {
  const tolerance = params.tolerance ?? 1.0
  const minScore = params.minScore ?? 0
  const maxScore = params.maxScore ?? 10

  return (actual: number, usl: number | null, lsl: number | null, target: number): number => {
    // Out of bounds check
    if (usl !== null && actual > usl) return minScore
    if (lsl !== null && actual < lsl) return minScore

    const deviation = Math.abs(actual - target)

    // Calculate span
    let span: number
    if (usl !== null && lsl !== null) {
      span = (usl - lsl) / 2
    } else if (usl !== null) {
      span = Math.abs(usl - target)
    } else if (lsl !== null) {
      span = Math.abs(target - lsl)
    } else {
      span = Math.max(Math.abs(target) * 0.1, 1)
    }

    const effectiveTolerance = span * tolerance
    if (deviation >= effectiveTolerance) return minScore

    const score = maxScore * (1 - deviation / effectiveTolerance)
    return Number(Math.max(minScore, Math.min(maxScore, score)).toFixed(2))
  }
}

const createExponentialFormula = (
  params: FormulaParameters,
): ((a: number, u: number | null, l: number | null, t: number) => number) => {
  const decayRate = params.decayRate ?? 2.0
  const baseline = params.baseline ?? 5
  const minScore = params.minScore ?? 0
  const maxScore = params.maxScore ?? 10

  return (actual: number, usl: number | null, lsl: number | null, _target: number): number => {
    // Out of bounds = exponential decay
    if (usl !== null && actual > usl) {
      const excess = actual - usl
      const penalty = baseline * Math.exp(-excess / decayRate)
      return Number(Math.max(minScore, penalty).toFixed(2))
    }

    if (lsl !== null && actual < lsl) {
      const deficit = lsl - actual
      const penalty = baseline * Math.exp(-deficit / decayRate)
      return Number(Math.max(minScore, penalty).toFixed(2))
    }

    // Within bounds = reward with margin bonus
    const margin = usl !== null ? usl - actual : lsl !== null ? actual - lsl : 0
    const reward = baseline + (maxScore - baseline) * (1 - Math.exp(-margin / decayRate))
    return Number(Math.min(maxScore, reward).toFixed(2))
  }
}

const createLogarithmicFormula = (
  params: FormulaParameters,
): ((a: number, u: number | null, l: number | null, t: number) => number) => {
  const scaleFactor = params.scaleFactor ?? 2.0
  const minScore = params.minScore ?? 0
  const maxScore = params.maxScore ?? 10

  return (actual: number, usl: number | null, lsl: number | null, target: number): number => {
    // Out of bounds
    if (usl !== null && actual > usl) return minScore
    if (lsl !== null && actual < lsl) return minScore

    const deviation = Math.abs(actual - target)

    // Log scale: log(1 + x) grows slowly
    const score = maxScore - scaleFactor * Math.log1p(deviation)
    return Number(Math.max(minScore, Math.min(maxScore, score)).toFixed(2))
  }
}

const createStepFormula = (
  params: FormulaParameters,
): ((a: number, u: number | null, l: number | null, t: number) => number) => {
  const thresholds = params.thresholds ?? [0.5, 1.0, 2.0]
  const scores = params.scores ?? [10, 7, 4, 0]
  const minScore = params.minScore ?? 0

  return (actual: number, usl: number | null, lsl: number | null, target: number): number => {
    // Out of bounds
    if (usl !== null && actual > usl) return minScore
    if (lsl !== null && actual < lsl) return minScore

    const deviation = Math.abs(actual - target)

    // Find appropriate step
    for (let i = 0; i < thresholds.length; i++) {
      const threshold = thresholds[i]
      const score = scores[i]
      if (threshold !== undefined && deviation < threshold) {
        return score ?? minScore
      }
    }

    // Beyond all thresholds
    return scores[scores.length - 1] ?? minScore
  }
}

const createCustomFormula = (
  expression: string,
  params: FormulaParameters,
): ((a: number, u: number | null, l: number | null, t: number) => number) => {
  const minScore = params.minScore ?? 0
  const maxScore = params.maxScore ?? 10

  return (actual: number, usl: number | null, lsl: number | null, target: number): number => {
    try {
      // Create safe evaluation context
      const context = {
        actual,
        usl: usl ?? 0,
        lsl: lsl ?? 0,
        target,
        Math,
        min: Math.min,
        max: Math.max,
        abs: Math.abs,
        exp: Math.exp,
        log: Math.log,
        pow: Math.pow,
        sqrt: Math.sqrt,
        clamp01: (x: number) => Math.max(0, Math.min(1, x)),
      }

      // Create function from expression
      const func = new Function(...Object.keys(context), `return ${expression}`)
      const result = func(...Object.values(context))

      // Validate result
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        console.error('Formula returned invalid value:', result)
        return minScore
      }

      return Number(Math.max(minScore, Math.min(maxScore, result)).toFixed(2))
    } catch (error) {
      console.error('Error evaluating custom formula:', error)
      return minScore
    }
  }
}

// Build formula calculator based on type
const buildFormulaCalculator = (
  formula: CustomFormulaV2,
): ((a: number, u: number | null, l: number | null, t: number) => number) => {
  switch (formula.formulaType) {
    case 'linear':
      return createLinearFormula(formula.parameters)
    case 'exponential':
      return createExponentialFormula(formula.parameters)
    case 'logarithmic':
      return createLogarithmicFormula(formula.parameters)
    case 'step':
      return createStepFormula(formula.parameters)
    case 'custom':
      return createCustomFormula(formula.customExpression ?? '10', formula.parameters)
    default:
      return createLinearFormula(formula.parameters)
  }
}

// Helper function to extract category from test item name
export const extractCategory = (testItem: string): string | null => {
  const patterns = [
    /_(POW)_/i,
    /_(EVM)_/i,
    /_(FREQ)_/i,
    /_(PER)_/i,
    /_(RSSI)_/i,
    /_(MASK)_/i,
    /_(LO_LEAKAGE)_/i,
    /_PA.*_(POW_DIF_ABS)_/i,
    /_PA.*_(ADJUSTED_POW)_/i,
  ]

  for (const pattern of patterns) {
    const match = testItem.match(pattern)
    if (match?.[1]) {
      return match[1].toUpperCase()
    }
  }

  return null
}

// Default universal formula (linear with adjustable tolerance)
const createUniversalFormula = (): CustomFormulaV2 => ({
  name: 'Universal Linear',
  enabled: false,
  formulaType: 'linear',
  parameters: {
    tolerance: 1.0,
    minScore: 0,
    maxScore: 10,
  },
  description: 'Linear scoring with adjustable tolerance',
  calculate: function (
    actual: number,
    usl: number | null,
    lsl: number | null,
    target: number,
  ): number {
    const calculator = buildFormulaCalculator(this)
    return calculator(actual, usl, lsl, target)
  },
})

// Default category-specific formulas (matching backend logic from TOP_PRODUCT_SCORING_DETAILS.md)
const createCategoryFormulas = (): CategoryFormulasV2 => ({
  POW: {
    name: 'TX Power - Strict',
    enabled: false,
    formulaType: 'linear',
    parameters: {
      tolerance: 0.5,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Linear scoring with ±0.5 dB tolerance',
    calculate: function (
      actual: number,
      usl: number | null,
      lsl: number | null,
      target: number,
    ): number {
      const calculator = buildFormulaCalculator(this)
      return calculator(actual, usl, lsl, target)
    },
  },

  EVM: {
    name: 'TX EVM - Exponential',
    enabled: false,
    formulaType: 'exponential',
    parameters: {
      decayRate: 2.0,
      baseline: 5,
      bonusThreshold: 10,
      bonusRate: 0.4,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Exponential penalty beyond USL, linear reward below',
    calculate: function (
      actual: number,
      usl: number | null,
      _lsl: number | null,
      _target: number,
    ): number {
      const calculator = buildFormulaCalculator(this)
      return calculator(actual, usl, _lsl, _target)
    },
  },

  FREQ: {
    name: 'TX Frequency - Symmetric',
    enabled: false,
    formulaType: 'linear',
    parameters: {
      tolerance: 1.0,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Symmetric tolerance around target (±25 kHz default)',
    calculate: function (
      actual: number,
      usl: number | null,
      lsl: number | null,
      target: number,
    ): number {
      const calculator = buildFormulaCalculator(this)
      return calculator(actual, usl, lsl, target)
    },
  },

  PER: {
    name: 'RX PER - Threshold',
    enabled: false,
    formulaType: 'linear',
    parameters: {
      tolerance: 1.0,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Linear decay from 10 to 0 (lower is better)',
    calculate: (
      actual: number,
      usl: number | null,
      _lsl: number | null,
      _target: number,
    ): number => {
      const uslActual = usl ?? 1
      if (actual <= 0) return 10
      if (actual >= uslActual) return 0
      return Number((10 * (1 - actual / uslActual)).toFixed(2))
    },
  },

  RSSI: {
    name: 'RX RSSI - Linear',
    enabled: false,
    formulaType: 'linear',
    parameters: {
      tolerance: 1.0,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Linear scoring within USL/LSL bounds',
    calculate: function (
      actual: number,
      usl: number | null,
      lsl: number | null,
      target: number,
    ): number {
      const calculator = buildFormulaCalculator(this)
      return calculator(actual, usl, lsl, target)
    },
  },

  MASK: {
    name: 'TX Mask - Threshold',
    enabled: false,
    formulaType: 'step',
    parameters: {
      thresholds: [0.5, 1.0],
      scores: [10, 7, 0],
      minScore: 0,
      maxScore: 10,
    },
    description: 'Threshold-based with headroom bonus',
    calculate: function (
      actual: number,
      usl: number | null,
      _lsl: number | null,
      _target: number,
    ): number {
      const calculator = buildFormulaCalculator(this)
      return calculator(actual, usl, _lsl, _target)
    },
  },

  LO_LEAKAGE: {
    name: 'LO Leakage - Threshold',
    enabled: false,
    formulaType: 'logarithmic',
    parameters: {
      scaleFactor: 0.2,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Logarithmic scoring below threshold',
    calculate: function (
      actual: number,
      usl: number | null,
      _lsl: number | null,
      _target: number,
    ): number {
      const calculator = buildFormulaCalculator(this)
      return calculator(actual, usl, _lsl, _target)
    },
  },

  POW_DIF_ABS: {
    name: 'PA Power Delta - Linear',
    enabled: false,
    formulaType: 'linear',
    parameters: {
      tolerance: 1.0,
      minScore: 0,
      maxScore: 10,
    },
    description: 'Linear from zero with 5 dB threshold',
    calculate: (
      actual: number,
      usl: number | null,
      _lsl: number | null,
      _target: number,
    ): number => {
      const threshold = usl && usl > 0 ? usl : 5
      const deviation = Math.abs(actual)
      if (deviation >= threshold) return 0
      return Number((10 * (1 - deviation / threshold)).toFixed(2))
    },
  },

  ADJUSTED_POW: {
    name: 'PA Adjusted Power - Linear',
    enabled: false,
    formulaType: 'linear',
    parameters: {
      tolerance: 1.0,
      minScore: 0,
      maxScore: 10,
    },
    description: '5 dB threshold, linear scoring',
    calculate: (
      actual: number,
      _usl: number | null,
      _lsl: number | null,
      _target: number,
    ): number => {
      const threshold = 5
      const deviation = Math.abs(actual)
      if (deviation >= threshold) return 0
      return Number((10 * (1 - deviation / threshold)).toFixed(2))
    },
  },
})

// Composable
export const useCustomScoringV2 = () => {
  const universalFormula = ref<CustomFormulaV2>(createUniversalFormula())
  const categoryFormulas = ref<CategoryFormulasV2>(createCategoryFormulas())

  // Calculate custom score for a measurement
  const calculateCustomScore = (
    measurement: ScoredMeasurement,
  ): { score: number; source: ScoreSource } => {
    // 1. Check if measurement has limits (required for custom scoring)
    const hasLimits = measurement.usl !== null || measurement.lsl !== null

    if (!hasLimits) {
      return { score: measurement.systemScore, source: 'system' }
    }

    // 2. Extract category from test item name
    const category = extractCategory(measurement.testItem)

    // 3. Priority: Category-specific > Universal > System default

    // Check if category-specific formula exists and is enabled
    if (category && categoryFormulas.value[category]?.enabled) {
      const customScore = categoryFormulas.value[category].calculate(
        measurement.actual,
        measurement.usl,
        measurement.lsl,
        measurement.target,
      )
      return { score: customScore, source: 'category' }
    }

    // Check if universal formula is enabled
    if (universalFormula.value.enabled) {
      const customScore = universalFormula.value.calculate(
        measurement.actual,
        measurement.usl,
        measurement.lsl,
        measurement.target,
      )
      return { score: customScore, source: 'universal' }
    }

    // Fallback to system default
    return { score: measurement.systemScore, source: 'system' }
  }

  // Update formula configuration
  const updateFormula = (category: string | null, updates: Partial<CustomFormulaV2>) => {
    if (category === null) {
      // Update universal formula
      universalFormula.value = {
        ...universalFormula.value,
        ...updates,
        calculate: function (
          actual: number,
          usl: number | null,
          lsl: number | null,
          target: number,
        ): number {
          const calculator = buildFormulaCalculator(this)
          return calculator(actual, usl, lsl, target)
        },
      }
    } else if (categoryFormulas.value[category]) {
      // Update category formula
      categoryFormulas.value[category] = {
        ...categoryFormulas.value[category],
        ...updates,
        calculate: function (
          actual: number,
          usl: number | null,
          lsl: number | null,
          target: number,
        ): number {
          const calculator = buildFormulaCalculator(this)
          return calculator(actual, usl, lsl, target)
        },
      }
    }
  }

  // Stats
  const enabledCategoryCount = computed(() => {
    return Object.values(categoryFormulas.value).filter((f) => f.enabled).length
  })

  const activeFormulaStats = computed(() => {
    const stats = {
      universalEnabled: universalFormula.value.enabled,
      categoryCount: Object.keys(categoryFormulas.value).length,
      enabledCount: enabledCategoryCount.value,
      categories: Object.keys(categoryFormulas.value).filter(
        (key) => categoryFormulas.value[key]?.enabled === true,
      ),
    }
    return stats
  })

  // Reset formulas to defaults
  const resetFormulas = () => {
    universalFormula.value = createUniversalFormula()
    categoryFormulas.value = createCategoryFormulas()
  }

  // Toggle all category formulas
  const toggleAllCategories = (enabled: boolean) => {
    Object.keys(categoryFormulas.value).forEach((category) => {
      const formula = categoryFormulas.value[category]
      if (formula) {
        formula.enabled = enabled
      }
    })
  }

  // NEW: Apply custom formula to a single measurement from backend
  // biome-ignore lint/suspicious/noExplicitAny: Backend measurement data arrives in multiple formats (object or array)
  const applyCustomFormulaToMeasurement = (measurement: any): MeasurementWithScoring => {
    // Handle both object and array formats from backend
    let test_item: string
    let usl: number | null
    let lsl: number | null
    let actual: number
    let score_breakdown: ScoreBreakdownData

    if (
      typeof measurement === 'object' &&
      !Array.isArray(measurement) &&
      'test_item' in measurement
    ) {
      // Object format: {test_item, usl, lsl, actual, score_breakdown}
      test_item = measurement.test_item
      usl = measurement.usl
      lsl = measurement.lsl
      actual = measurement.actual
      score_breakdown = measurement.score_breakdown
    } else if (Array.isArray(measurement) && measurement.length >= 7) {
      // Array format: [test_item, usl, lsl, actual, target, score, breakdown]
      test_item = String(measurement[0])
      usl = measurement[1]
      lsl = measurement[2]
      actual = Number(measurement[3])
      score_breakdown = measurement[6] as ScoreBreakdownData
    } else {
      // Invalid format, return as-is
      return measurement
    }

    // Check if custom scoring is enabled
    if (!customScoringEnabled.value) {
      return {
        test_item,
        usl,
        lsl,
        actual,
        score_breakdown,
      }
    }

    // Extract values from score_breakdown
    const target = score_breakdown.target_used ?? 0
    const systemScore = score_breakdown.final_score

    // Calculate custom score using existing logic
    const scoredMeasurement: ScoredMeasurement = {
      testItem: test_item,
      usl,
      lsl,
      actual,
      target,
      systemScore,
    }

    const customResult = calculateCustomScore(scoredMeasurement)
    const category = extractCategory(test_item)

    // Create custom scoring result
    const custom_scoring: ScoringResult = {
      systemScore,
      customScore: customResult.score,
      difference: customResult.score - systemScore,
      formula:
        customResult.source === 'category' && category
          ? categoryFormulas.value[category]?.name || 'Category Formula'
          : customResult.source === 'universal'
            ? universalFormula.value.name
            : 'System Formula',
      method: customResult.source === 'system' ? 'system' : 'custom',
      category: category || undefined,
    }

    return {
      test_item,
      usl,
      lsl,
      actual,
      score_breakdown,
      custom_scoring,
    }
  }

  // NEW: Apply custom formulas to all measurements in results
  // biome-ignore lint/suspicious/noExplicitAny: Complex nested backend response structure
  const applyCustomFormulasToResults = (results: any[]): any[] => {
    if (!customScoringEnabled.value) {
      return results
    }

    return results.map((result) => ({
      ...result,
      // biome-ignore lint/suspicious/noExplicitAny: Nested station object from backend response
      test_result: result.test_result.map((station: any) => ({
        ...station,
        // biome-ignore lint/suspicious/noExplicitAny: Measurement data passed to typed handler
        data: station.data.map((measurement: any) => applyCustomFormulaToMeasurement(measurement)),
      })),
    }))
  }

  // NEW: Computed property for enabled state
  const customScoringEnabled = computed(() => {
    return (
      universalFormula.value.enabled || Object.values(categoryFormulas.value).some((f) => f.enabled)
    )
  })

  return {
    universalFormula,
    categoryFormulas,
    calculateCustomScore,
    updateFormula,
    enabledCategoryCount,
    activeFormulaStats,
    resetFormulas,
    toggleAllCategories,
    applyCustomFormulaToMeasurement,
    applyCustomFormulasToResults,
    customScoringEnabled,
  }
}

// Export formula type helpers
export const getFormulaTypeDescription = (type: FormulaType): string => {
  const descriptions: Record<FormulaType, string> = {
    linear: 'Linear decay from target with tolerance',
    exponential: 'Exponential penalty/reward curve',
    logarithmic: 'Logarithmic scale for wide ranges',
    step: 'Step-based scoring with thresholds',
    custom: 'Custom JavaScript expression',
  }
  return descriptions[type]
}

export const getDefaultParameters = (type: FormulaType): FormulaParameters => {
  const defaults: Record<FormulaType, FormulaParameters> = {
    linear: { tolerance: 1.0, minScore: 0, maxScore: 10 },
    exponential: { decayRate: 2.0, baseline: 5, minScore: 0, maxScore: 10 },
    logarithmic: { scaleFactor: 2.0, minScore: 0, maxScore: 10 },
    step: { thresholds: [0.5, 1.0, 2.0], scores: [10, 7, 4, 0], minScore: 0, maxScore: 10 },
    custom: { minScore: 0, maxScore: 10 },
  }
  return defaults[type]
}
