// Test Data for Formula Selection System
// This file provides mock data for testing formula selection functionality

import type { FormulaType, FormulaSelection, CustomFormulaParams } from '../composables/useFormulaSelector'

/**
 * Sample formula selections for testing
 */
export const sampleFormulaSelections = {
  // Test 1: Universal LINEAR formula
  universalLinear: {
    enabled: true,
    formulaType: 'LINEAR' as FormulaType,
    customParams: {
      latex: '\\text{Score} = a \\times x + b',
      parameters: { a: 1.5, b: 0.5 },
      description: 'Linear scoring with custom parameters'
    }
  } as FormulaSelection,

  // Test 2: Universal EXPONENTIAL formula
  universalExponential: {
    enabled: true,
    formulaType: 'EXPONENTIAL' as FormulaType,
    customParams: {
      latex: '\\text{Score} = a \\times e^{b \\times x}',
      parameters: { a: 10, b: 0.5 },
      description: 'Exponential scoring'
    }
  } as FormulaSelection,

  // Test 3: Custom LaTeX formula
  customGaussian: {
    enabled: true,
    formulaType: 'CUSTOM' as FormulaType,
    customParams: {
      latex: '10 \\times e^{-(x - target)^2 / (2 \\times \\sigma^2)}',
      parameters: { sigma: 1.5 },
      description: 'Gaussian distribution scoring'
    }
  } as FormulaSelection,

  // Test 4: SIGMOID formula
  sigmoid: {
    enabled: true,
    formulaType: 'SIGMOID' as FormulaType,
    customParams: {
      latex: '\\text{Score} = \\frac{L}{1 + e^{-k \\times (x - x_0)}}',
      parameters: { L: 10, k: 1.5, x0: 0 },
      description: 'S-curve scoring'
    }
  } as FormulaSelection,

  // Test 5: Backend EVM formula
  backendEVM: {
    enabled: true,
    formulaType: 'EVM' as FormulaType
  } as FormulaSelection,

  // Test 6: System auto-detect (disabled)
  systemDefault: {
    enabled: false,
    formulaType: 'SYSTEM' as FormulaType
  } as FormulaSelection
}

/**
 * Sample measurement data for testing formula application
 */
export const sampleMeasurements = [
  {
    test_item: 'WiFi_EVM_2G4_CH1_MCS0',
    usl: -5,
    lsl: -40,
    actual: -15.5,
    target: -20,
    category: 'EVM'
  },
  {
    test_item: 'WiFi_FREQ_2G4_CH1',
    usl: 2422.5,
    lsl: 2417.5,
    actual: 2420.0,
    target: 2420.0,
    category: 'FREQ'
  },
  {
    test_item: 'WiFi_PER_5G_CH36_MCS7',
    usl: 10,
    lsl: 0,
    actual: 2.5,
    target: 0,
    category: 'PER'
  },
  {
    test_item: 'WiFi_PA_ADJ_PWR_2G4_CH1',
    usl: 5,
    lsl: -5,
    actual: 0.5,
    target: 0,
    category: 'PA'
  },
  {
    test_item: 'WiFi_POW_2G4_CH1_MCS0',
    usl: 20,
    lsl: 15,
    actual: 17.5,
    target: 17.5,
    category: 'POW'
  }
]

/**
 * Expected score calculations for validation
 * These are approximate expected values based on different formulas
 */
export const expectedScores = {
  // LINEAR formula (a=1, b=0): Score = 1*x + 0
  linear: {
    'WiFi_EVM_2G4_CH1_MCS0': -15.5,
    'WiFi_FREQ_2G4_CH1': 2420.0,
    'WiFi_PER_5G_CH36_MCS7': 2.5,
    'WiFi_PA_ADJ_PWR_2G4_CH1': 0.5,
    'WiFi_POW_2G4_CH1_MCS0': 17.5
  },

  // EXPONENTIAL formula (a=10, b=0.5): Score = 10*e^(0.5*x)
  // Note: These are example approximations
  exponential: {
    'WiFi_EVM_2G4_CH1_MCS0': 0.001, // Very small for negative values
    'WiFi_FREQ_2G4_CH1': Infinity, // Very large for large positive values
    'WiFi_PER_5G_CH36_MCS7': 35.8,
    'WiFi_PA_ADJ_PWR_2G4_CH1': 12.8,
    'WiFi_POW_2G4_CH1_MCS0': 19459.5
  },

  // Backend formulas would use their specific logic
  backendEVM: {
    'WiFi_EVM_2G4_CH1_MCS0': 8.5 // Example: Good EVM score
  }
}

/**
 * Test scenarios for comprehensive testing
 */
export const testScenarios = [
  {
    name: 'Universal Linear Formula',
    description: 'Apply linear formula to all measurements',
    universalFormula: sampleFormulaSelections.universalLinear,
    categoryFormulas: {},
    measurements: sampleMeasurements,
    expectedBehavior: 'All measurements use linear formula'
  },
  {
    name: 'Category-Specific EVM Override',
    description: 'Use backend EVM formula for EVM category, linear for others',
    universalFormula: sampleFormulaSelections.universalLinear,
    categoryFormulas: {
      EVM: sampleFormulaSelections.backendEVM
    },
    measurements: sampleMeasurements,
    expectedBehavior: 'EVM measurements use EVM formula, others use linear'
  },
  {
    name: 'Custom Gaussian Formula',
    description: 'Apply custom Gaussian distribution formula',
    universalFormula: sampleFormulaSelections.customGaussian,
    categoryFormulas: {},
    measurements: sampleMeasurements,
    expectedBehavior: 'All measurements use custom Gaussian formula'
  },
  {
    name: 'Mixed Mathematical Formulas',
    description: 'Different mathematical formulas for different categories',
    universalFormula: sampleFormulaSelections.sigmoid,
    categoryFormulas: {
      EVM: sampleFormulaSelections.universalExponential,
      FREQ: sampleFormulaSelections.universalLinear
    },
    measurements: sampleMeasurements,
    expectedBehavior: 'EVM uses exponential, FREQ uses linear, others use sigmoid'
  },
  {
    name: 'No Formula Override',
    description: 'Use system default auto-detect',
    universalFormula: sampleFormulaSelections.systemDefault,
    categoryFormulas: {},
    measurements: sampleMeasurements,
    expectedBehavior: 'All measurements use backend auto-detect'
  }
]

/**
 * Parameter validation test cases
 */
export const parameterTestCases = [
  {
    formulaType: 'LINEAR' as FormulaType,
    validParameters: { a: 1.5, b: 0.5 },
    invalidParameters: { a: 'invalid', b: null },
    edgeCases: { a: 0, b: 0 }
  },
  {
    formulaType: 'EXPONENTIAL' as FormulaType,
    validParameters: { a: 10, b: 0.5 },
    invalidParameters: { a: -10, b: 'text' },
    edgeCases: { a: 0, b: 0 }
  },
  {
    formulaType: 'SIGMOID' as FormulaType,
    validParameters: { L: 10, k: 1.5, x0: 0 },
    invalidParameters: { L: -10, k: 0, x0: 'invalid' },
    edgeCases: { L: 0, k: 0.01, x0: 0 }
  }
]

/**
 * LaTeX formula validation test cases
 */
export const latexValidationTests = [
  {
    description: 'Valid simple formula',
    latex: '10 \\times x',
    isValid: true
  },
  {
    description: 'Valid complex formula with fractions',
    latex: '\\frac{10 \\times (x - target)}{usl - lsl}',
    isValid: true
  },
  {
    description: 'Valid exponential formula',
    latex: '10 \\times e^{-(x - target)^2 / \\sigma^2}',
    isValid: true
  },
  {
    description: 'Invalid - missing closing brace',
    latex: '10 \\times {x + 1',
    isValid: false
  },
  {
    description: 'Invalid - undefined variable',
    latex: '10 \\times unknown_var',
    isValid: false
  }
]

/**
 * UI interaction test cases
 */
export const uiTestCases = [
  {
    name: 'Open Formula Selector Dialog',
    action: 'click formula selector button',
    expectedResult: 'Dialog opens showing universal and category sections'
  },
  {
    name: 'Select Universal Formula',
    action: 'enable universal toggle, select LINEAR from dropdown',
    expectedResult: 'Formula preview shows, parameter inputs appear'
  },
  {
    name: 'Adjust Parameters',
    action: 'change parameter values in input fields',
    expectedResult: 'Parameter values update, ready to apply'
  },
  {
    name: 'Apply Custom LaTeX',
    action: 'enter custom LaTeX in advanced section, click apply',
    expectedResult: 'Custom formula set as universal, dialog closes'
  },
  {
    name: 'View Score Breakdown',
    action: 'click measurement chip to open breakdown',
    expectedResult: 'Shows both system and selected formula with LaTeX rendering'
  },
  {
    name: 'Reset All Formulas',
    action: 'click reset button in formula dialog',
    expectedResult: 'All formulas reset to system default'
  }
]

/**
 * Performance test data
 */
export const performanceTestData = {
  small: Array.from({ length: 10 }, (_, i) => ({
    test_item: `Test_${i}`,
    usl: 10,
    lsl: 0,
    actual: 5 + Math.random() * 5,
    target: 5,
    category: ['EVM', 'FREQ', 'PER', 'PA'][i % 4]
  })),

  medium: Array.from({ length: 100 }, (_, i) => ({
    test_item: `Test_${i}`,
    usl: 10,
    lsl: 0,
    actual: 5 + Math.random() * 5,
    target: 5,
    category: ['EVM', 'FREQ', 'PER', 'PA'][i % 4]
  })),

  large: Array.from({ length: 1000 }, (_, i) => ({
    test_item: `Test_${i}`,
    usl: 10,
    lsl: 0,
    actual: 5 + Math.random() * 5,
    target: 5,
    category: ['EVM', 'FREQ', 'PER', 'PA'][i % 4]
  }))
}

/**
 * Utility function to generate random test data
 */
export function generateRandomMeasurement(category: string) {
  return {
    test_item: `Test_${category}_${Date.now()}`,
    usl: 10,
    lsl: 0,
    actual: Math.random() * 10,
    target: 5,
    category
  }
}

/**
 * Utility function to validate formula selection
 */
export function validateFormulaSelection(selection: FormulaSelection): boolean {
  if (!selection) return false
  if (typeof selection.enabled !== 'boolean') return false
  if (!selection.formulaType) return false
  
  // If it's a CUSTOM formula, must have customParams
  if (selection.formulaType === 'CUSTOM' && !selection.customParams?.latex) {
    return false
  }
  
  return true
}

/**
 * Utility function to validate custom parameters
 */
export function validateCustomParams(params: CustomFormulaParams): boolean {
  if (!params) return false
  if (!params.latex || typeof params.latex !== 'string') return false
  if (!params.parameters || typeof params.parameters !== 'object') return false
  
  // Validate all parameter values are numbers
  for (const value of Object.values(params.parameters)) {
    if (typeof value !== 'number' || isNaN(value)) {
      return false
    }
  }
  
  return true
}

export default {
  sampleFormulaSelections,
  sampleMeasurements,
  expectedScores,
  testScenarios,
  parameterTestCases,
  latexValidationTests,
  uiTestCases,
  performanceTestData,
  generateRandomMeasurement,
  validateFormulaSelection,
  validateCustomParams
}
