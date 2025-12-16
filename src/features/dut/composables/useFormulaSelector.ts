// New Formula Selection Approach - useFormulaSelector.ts
import { ref, computed } from 'vue'

/**
 * Formula types: Backend-validated + Mathematical models + Custom
 */
export type FormulaType = 
  // Backend-validated formulas (match backend scoring logic)
  | 'SYSTEM'           // Use backend's auto-detected formula (default)
  | 'EVM'              // Error Vector Magnitude scoring
  | 'FREQ'             // Frequency deviation scoring
  | 'PER'              // Packet Error Rate scoring
  | 'PA_ADJUSTED_POWER' // PA power adjustment scoring
  | 'PA_POW_DIF_ABS'   // PA power difference absolute
  | 'BOUNDED'          // Standard bounded measurement scoring
  
  // Mathematical models (general-purpose formulas)
  | 'LINEAR'           // Linear scoring: y = a×x + b
  | 'EXPONENTIAL'      // Exponential scoring: y = a×e^(b×x)
  | 'LOGARITHMIC'      // Logarithmic scoring: y = a×ln(b×x + c)
  | 'POLYNOMIAL'       // Polynomial scoring: y = a×x² + b×x + c
  | 'INVERSE'          // Inverse scoring: y = a / (b×x + c)
  | 'SIGMOID'          // Sigmoid scoring: y = L / (1 + e^(-k×(x-x₀)))
  
  // Custom formula (user-defined LaTeX)
  | 'CUSTOM'           // Custom LaTeX formula with parameters

/**
 * Formula metadata with descriptions and LaTeX
 */
export interface FormulaMetadata {
  type: FormulaType
  name: string
  description: string
  formula_latex: string
  usedFor: string[]  // Categories this formula is typically used for
  category: 'backend' | 'mathematical' | 'custom'  // Formula category
  parameters?: string[]  // Parameter names (a, b, c, etc.)
}

/**
 * Custom formula parameters
 */
export interface CustomFormulaParams {
  latex: string  // LaTeX formula string
  parameters: Record<string, number>  // Parameter values (e.g., {a: 1.0, b: 0.5})
  description?: string  // Optional description
}

/**
 * Formula selection for universal or per-category
 */
export interface FormulaSelection {
  enabled: boolean
  formulaType: FormulaType
  customParams?: CustomFormulaParams  // Only for CUSTOM formula type
}

/**
 * Category-specific formula selections
 */
export interface CategoryFormulaSelections {
  EVM?: FormulaSelection
  FREQ?: FormulaSelection
  PER?: FormulaSelection
  PA?: FormulaSelection
  [key: string]: FormulaSelection | undefined
}

/**
 * Available formula definitions with metadata
 */
export const FORMULA_DEFINITIONS: Record<FormulaType, FormulaMetadata> = {
  SYSTEM: {
    type: 'SYSTEM',
    name: 'System Auto-Detect',
    description: 'Use the backend\'s automatically detected formula based on measurement category',
    formula_latex: '\\text{Auto-detected based on category}',
    usedFor: ['All categories'],
    category: 'backend'
  },
  EVM: {
    type: 'EVM',
    name: 'EVM Advanced Scoring',
    description: 'Error Vector Magnitude scoring. Lower EVM values are better. Scores 6-10 for within spec, with bonus for excellent values.',
    formula_latex: 'score = 6 + 4 \\times \\frac{USL - actual}{|USL - (-60)|}',
    usedFor: ['EVM'],
    category: 'backend'
  },
  FREQ: {
    type: 'FREQ',
    name: 'Frequency Deviation',
    description: 'Linear scoring based on deviation from target frequency. Score decreases linearly from target to spec limits.',
    formula_latex: '\\text{Score} = 10 \\times \\left(1 - \\frac{|\\text{actual} - \\text{target}|}{\\text{span}}\\right)',
    usedFor: ['FREQ'],
    category: 'backend'
  },
  PER: {
    type: 'PER',
    name: 'Packet Error Rate',
    description: 'PER scoring where lower values are better. Perfect score (10) when PER = 0.',
    formula_latex: '\\text{Score} = 10 \\times \\frac{\\text{USL} - \\text{actual}}{\\text{USL}}',
    usedFor: ['PER'],
    category: 'backend'
  },
  PA_ADJUSTED_POWER: {
    type: 'PA_ADJUSTED_POWER',
    name: 'PA Adjusted Power',
    description: 'PA power adjustment scoring. Target is 0 (ideal calibration). Uses 5dB threshold by default.',
    formula_latex: '\\text{Score} = 10 \\times \\left(1 - \\frac{|\\text{actual}|}{\\text{threshold}}\\right)',
    usedFor: ['PA'],
    category: 'backend'
  },
  PA_POW_DIF_ABS: {
    type: 'PA_POW_DIF_ABS',
    name: 'PA Power Difference',
    description: 'PA power difference absolute (calibration delta). Target is 0. Linear scoring from 0 to threshold.',
    formula_latex: '\\text{Score} = 10 \\times \\left(1 - \\frac{|\\text{actual}|}{\\text{threshold}}\\right)',
    usedFor: ['PA'],
    category: 'backend'
  },
  BOUNDED: {
    type: 'BOUNDED',
    name: 'Standard Bounded',
    description: 'Standard bounded measurement scoring. Score based on position within USL/LSL limits and deviation from target.',
    formula_latex: '\\text{Score} = f(\\text{position}, \\text{deviation})',
    usedFor: ['POW', 'General measurements'],
    category: 'backend'
  },
  
  // Mathematical formulas
  LINEAR: {
    type: 'LINEAR',
    name: 'Linear Scoring',
    description: 'Simple linear scoring between min and max values. Score = a×x + b',
    formula_latex: '\\text{Score} = a \\times x + b',
    usedFor: ['General measurements', 'Temperature', 'Voltage'],
    category: 'mathematical',
    parameters: ['a', 'b']
  },
  EXPONENTIAL: {
    type: 'EXPONENTIAL',
    name: 'Exponential Scoring',
    description: 'Exponential growth or decay scoring. Score = a×e^(b×x)',
    formula_latex: '\\text{Score} = a \\times e^{b \\times x}',
    usedFor: ['Growth measurements', 'Decay curves'],
    category: 'mathematical',
    parameters: ['a', 'b']
  },
  LOGARITHMIC: {
    type: 'LOGARITHMIC',
    name: 'Logarithmic Scoring',
    description: 'Logarithmic scaling for wide-range measurements. Score = a×ln(b×x + c)',
    formula_latex: '\\text{Score} = a \\times \\ln(b \\times x + c)',
    usedFor: ['Wide dynamic range', 'Decibel measurements'],
    category: 'mathematical',
    parameters: ['a', 'b', 'c']
  },
  POLYNOMIAL: {
    type: 'POLYNOMIAL',
    name: 'Polynomial Scoring',
    description: 'Polynomial curve fitting. Score = a×x² + b×x + c',
    formula_latex: '\\text{Score} = a \\times x^2 + b \\times x + c',
    usedFor: ['Complex curves', 'Non-linear relationships'],
    category: 'mathematical',
    parameters: ['a', 'b', 'c']
  },
  INVERSE: {
    type: 'INVERSE',
    name: 'Inverse Scoring',
    description: 'Inverse relationship scoring. Score = a / (b×x + c)',
    formula_latex: '\\text{Score} = \\frac{a}{b \\times x + c}',
    usedFor: ['Inverse relationships', 'Rate measurements'],
    category: 'mathematical',
    parameters: ['a', 'b', 'c']
  },
  SIGMOID: {
    type: 'SIGMOID',
    name: 'Sigmoid S-Curve',
    description: 'S-shaped curve with smooth transitions. Score = L / (1 + e^(-k×(x-x₀)))',
    formula_latex: '\\text{Score} = \\frac{L}{1 + e^{-k \\times (x - x_0)}}',
    usedFor: ['Threshold-based', 'Binary pass/fail transitions'],
    category: 'mathematical',
    parameters: ['L', 'k', 'x0']
  },
  
  // Custom formula
  CUSTOM: {
    type: 'CUSTOM',
    name: 'Custom LaTeX Formula',
    description: 'User-defined LaTeX formula with custom parameters. Variables: x (actual), usl, lsl, target',
    formula_latex: '\\text{User-defined formula}',
    usedFor: ['Advanced custom scoring'],
    category: 'custom',
    parameters: [] // User defines their own
  }
}

/**
 * Composable for formula type selection and scoring
 */
export function useFormulaSelector() {
  // Universal formula selection (applies to all measurements if no category match)
  const universalFormula = ref<FormulaSelection>({
    enabled: false,
    formulaType: 'SYSTEM'
  })

  // Category-specific formula selections
  const categoryFormulas = ref<CategoryFormulaSelections>({
    EVM: { enabled: false, formulaType: 'SYSTEM' },
    FREQ: { enabled: false, formulaType: 'SYSTEM' },
    PER: { enabled: false, formulaType: 'SYSTEM' },
    PA: { enabled: false, formulaType: 'SYSTEM' }
  })

  /**
   * Check if any formula selection is enabled
   */
  const formulaSelectionEnabled = computed(() => {
    if (universalFormula.value.enabled && universalFormula.value.formulaType !== 'SYSTEM') {
      return true
    }
    
    return Object.values(categoryFormulas.value).some(
      selection => selection?.enabled && selection.formulaType !== 'SYSTEM'
    )
  })

  /**
   * Get statistics about enabled formulas
   */
  const activeFormulaStats = computed(() => {
    let enabledCount = 0
    const activeCategories: string[] = []

    if (universalFormula.value.enabled && universalFormula.value.formulaType !== 'SYSTEM') {
      enabledCount++
      activeCategories.push('Universal')
    }

    Object.entries(categoryFormulas.value).forEach(([category, selection]) => {
      if (selection?.enabled && selection.formulaType !== 'SYSTEM') {
        enabledCount++
        activeCategories.push(category)
      }
    })

    return {
      enabledCount,
      activeCategories,
      hasUniversal: universalFormula.value.enabled && universalFormula.value.formulaType !== 'SYSTEM',
      hasCategory: activeCategories.length > (universalFormula.value.enabled ? 1 : 0)
    }
  })

  /**
   * Extract category from test item name
   */
  function extractCategory(testItem: string): string | null {
    if (!testItem) return null
    
    const testItemUpper = testItem.toUpperCase()
    
    // PA adjusted power pattern
    if (testItemUpper.includes('PA') && (testItemUpper.includes('ADJUSTED_POW') || testItemUpper.includes('ADJUSTED_POWER'))) {
      return 'PA'
    }
    
    // PA POW_DIF_ABS pattern
    if (testItemUpper.includes('PA') && testItemUpper.includes('POW_DIF_ABS')) {
      return 'PA'
    }
    
    // FREQ pattern
    if (testItemUpper.includes('FREQ') || testItemUpper.includes('_FREQ_')) {
      return 'FREQ'
    }
    
    // EVM pattern
    if (testItemUpper.includes('EVM')) {
      return 'EVM'
    }
    
    // PER pattern
    if (testItemUpper.includes('PER') && !testItemUpper.includes('PPER')) {
      return 'PER'
    }
    
    return null
  }

  /**
   * Get the applicable formula type for a measurement
   * Priority: Category-specific > Universal > System
   */
  function getApplicableFormulaType(testItem: string): FormulaType {
    const category = extractCategory(testItem)
    
    // Check category-specific formula first
    if (category && categoryFormulas.value[category]?.enabled) {
      const formulaType = categoryFormulas.value[category]!.formulaType
      if (formulaType !== 'SYSTEM') {
        return formulaType
      }
    }
    
    // Check universal formula
    if (universalFormula.value.enabled && universalFormula.value.formulaType !== 'SYSTEM') {
      return universalFormula.value.formulaType
    }
    
    // Fall back to system auto-detect
    return 'SYSTEM'
  }

  /**
   * Calculate score using selected formula type
   * This applies the frontend formula selection on top of backend scores
   */
  function calculateScoreWithFormulaType(
    formulaType: FormulaType,
    measurement: {
      actual: number
      usl: number | null
      lsl: number | null
      target?: number | null
      systemScore?: number
    }
  ): number {
    // If using SYSTEM formula, return the backend score as-is
    if (formulaType === 'SYSTEM') {
      return measurement.systemScore ?? 0
    }
    
    const { actual, usl, lsl, target } = measurement
    
    // Apply formula-specific scoring logic (matching backend implementation)
    switch (formulaType) {
      case 'EVM':
        return calculateEVMScore(actual, usl)
        
      case 'FREQ':
        return calculateFREQScore(actual, usl, lsl, target ?? 0)
        
      case 'PER':
        return calculatePERScore(actual, usl)
        
      case 'PA_ADJUSTED_POWER':
        return calculatePAAdjustedPowerScore(actual, 5.0)
        
      case 'PA_POW_DIF_ABS':
        return calculatePAPowDifAbsScore(actual, usl ?? 5.0)
        
      case 'BOUNDED':
        return calculateBoundedScore(actual, usl, lsl, target ?? ((usl ?? 0) + (lsl ?? 0)) / 2)
        
      default:
        return measurement.systemScore ?? 0
    }
  }

  /**
   * Apply formula selection to measurement results
   */
  function applyFormulaSelectionToResults(results: any[]): any[] {
    if (!formulaSelectionEnabled.value) {
      return results
    }

    return results.map(result => {
      const testItem = typeof result === 'object' && 'test_item' in result 
        ? result.test_item 
        : (Array.isArray(result) ? result[0] : '')
      
      const formulaType = getApplicableFormulaType(testItem)
      
      // If using system formula, no changes needed
      if (formulaType === 'SYSTEM') {
        return result
      }
      
      // Extract measurement data
      let measurement: any
      if (typeof result === 'object' && 'actual' in result) {
        measurement = result
      } else if (Array.isArray(result) && result.length >= 7) {
        measurement = {
          test_item: result[0],
          usl: result[1],
          lsl: result[2],
          actual: result[3],
          target: result[4],
          systemScore: result[5]
        }
      } else {
        return result
      }
      
      const systemScore = measurement.score_breakdown?.final_score ?? measurement.systemScore ?? 0
      const customScore = calculateScoreWithFormulaType(formulaType, {
        ...measurement,
        systemScore
      })
      
      // Add custom scoring information
      const customScoring = {
        systemScore,
        customScore,
        difference: customScore - systemScore,
        formula: FORMULA_DEFINITIONS[formulaType].name,
        formulaType,
        method: 'custom'
      }
      
      if (typeof result === 'object') {
        return {
          ...result,
          custom_scoring: customScoring
        }
      }
      
      return result
    })
  }

  /**
   * Reset all formula selections
   */
  function resetFormulas() {
    universalFormula.value = {
      enabled: false,
      formulaType: 'SYSTEM'
    }
    
    Object.keys(categoryFormulas.value).forEach(category => {
      categoryFormulas.value[category] = {
        enabled: false,
        formulaType: 'SYSTEM'
      }
    })
  }

  return {
    // State
    universalFormula,
    categoryFormulas,
    
    // Computed
    formulaSelectionEnabled,
    activeFormulaStats,
    
    // Methods
    extractCategory,
    getApplicableFormulaType,
    calculateScoreWithFormulaType,
    applyFormulaSelectionToResults,
    resetFormulas,
    
    // Constants
    FORMULA_DEFINITIONS
  }
}

// Formula calculation functions (matching backend logic)

function calculateEVMScore(actual: number, usl: number | null): number {
  const uslValue = usl ?? -3.0
  const theoreticalMin = -60.0
  
  if (actual > uslValue) {
    const deviation = actual - uslValue
    const penaltyFactor = Math.min(deviation / Math.max(Math.abs(uslValue), 1.0), 1.0)
    return Math.max(0.0, 5.0 - penaltyFactor * 5.0)
  }
  
  const specRange = Math.abs(uslValue - theoreticalMin)
  const position = specRange > 0 ? (uslValue - actual) / specRange : 1.0
  const clampedPosition = Math.max(0.0, Math.min(1.0, position))
  
  let score = 6.0 + (clampedPosition * 4.0)
  
  if (actual < (uslValue - 10)) {
    const bonus = Math.min((uslValue - 10 - actual) / 10.0, 1.0) * 0.5
    score = Math.min(10.0, score + bonus)
  }
  
  return Math.round(score * 100) / 100
}

function calculateFREQScore(actual: number, usl: number | null, lsl: number | null, target: number): number {
  const deviation = Math.abs(actual - target)
  
  if ((usl !== null && actual > usl) || (lsl !== null && actual < lsl)) {
    return 0.0
  }
  
  let span: number
  if (usl !== null && lsl !== null) {
    span = (usl - lsl) / 2.0
  } else if (usl !== null) {
    span = Math.abs(usl - target)
  } else if (lsl !== null) {
    span = Math.abs(target - lsl)
  } else {
    span = Math.max(Math.abs(target) * 0.1, 1.0)
  }
  
  span = Math.max(span, 1e-6)
  const normalized = deviation / span
  const score = Math.max(0.0, Math.min(10.0, 10.0 - (normalized * 10.0)))
  
  return Math.round(score * 100) / 100
}

function calculatePERScore(actual: number, usl: number | null): number {
  const uslValue = (usl === null || Math.abs(usl) < 1e-9) ? 1.0 : usl
  
  if (actual <= 0) {
    return 10.0
  }
  
  const remainingMargin = Math.max(uslValue - actual, 0.0)
  const score = Math.max(0.0, Math.min(10.0, (remainingMargin / uslValue) * 10.0))
  
  return Math.round(score * 100) / 100
}

function calculatePAAdjustedPowerScore(actual: number, threshold: number): number {
  const deviation = Math.abs(actual)
  
  if (deviation >= threshold) {
    return 0.0
  }
  
  const score = 10.0 * (1.0 - deviation / threshold)
  return Math.round(Math.max(0.0, Math.min(10.0, score)) * 100) / 100
}

function calculatePAPowDifAbsScore(actual: number, usl: number): number {
  const deviation = Math.abs(actual)
  const threshold = (usl > 0) ? usl : 5.0
  
  if (deviation >= threshold) {
    return 0.0
  }
  
  const score = 10.0 * (1.0 - deviation / threshold)
  return Math.round(Math.max(0.0, Math.min(10.0, score)) * 100) / 100
}

function calculateBoundedScore(actual: number, usl: number | null, lsl: number | null, target: number): number {
  // Simplified bounded scoring - can be enhanced
  if (usl !== null && actual > usl) return 0.0
  if (lsl !== null && actual < lsl) return 0.0
  
  const deviation = Math.abs(actual - target)
  const range = (usl !== null && lsl !== null) ? (usl - lsl) / 2 : Math.abs(target) * 0.1
  const normalized = deviation / Math.max(range, 1e-6)
  const score = Math.max(0.0, Math.min(10.0, 10.0 - (normalized * 5.0)))
  
  return Math.round(score * 100) / 100
}
