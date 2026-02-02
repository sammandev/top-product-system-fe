/**
 * Scoring System Types
 * 
 * TypeScript types for the iPLAS test item scoring system.
 * These types match the backend scoring schemas.
 */

// Scoring algorithm types
export type ScoringType =
    | 'symmetrical'
    | 'symmetrical_nl'
    | 'evm'
    | 'throughput'
    | 'asymmetrical'
    | 'per_mask'
    | 'binary'

// Configuration for scoring a specific test item
export interface ScoringConfig {
    testItemName: string
    scoringType: ScoringType
    enabled: boolean
    weight: number

    // Type-specific parameters
    alpha?: number           // Min score at limit (symmetrical, asymmetrical)
    target?: number          // User-defined target value
    targetScore?: number     // Score at target deviation
    targetDeviation?: number // Deviation for target_score (Gaussian)
    minScore?: number        // Minimum score (throughput)
    maxDeviation?: number    // Max deviation (PER/MASK)
}

// Score result for a single test item
export interface TestItemScoreResult {
    testItemName: string
    value: number | null
    ucl: number | null
    lcl: number | null
    status: string
    scoringType: ScoringType
    score: number
    deviation?: number
}

// Score result for a single test record
export interface RecordScoreResult {
    isn: string
    deviceId: string
    station: string
    testStartTime: string
    testStatus: string
    overallScore: number
    valueItemsScore: number | null
    binItemsScore: number | null
    testItemScores: TestItemScoreResult[]
    totalItems: number
    scoredItems: number
    failedItems: number
}

// Summary statistics for scored records
export interface ScoreSummary {
    averageScore: number
    minScore: number
    maxScore: number
    medianScore: number
    stdDeviation: number
    totalRecords: number
    passRecords: number
    failRecords: number
}

// API request/response types
export interface CalculateScoresRequest {
    records: unknown[]
    scoringConfigs: ScoringConfig[]
    includeBinaryInOverall: boolean
}

export interface CalculateScoresResponse {
    scoredRecords: RecordScoreResult[]
    summary: ScoreSummary
}

// Scoring type metadata for UI
export interface ScoringTypeInfo {
    type: ScoringType
    label: string
    description: string
    useCase: string
    icon: string
    color: string
    parameters: ScoringParameter[]
    formulaLatex?: string
    variables?: Record<string, string>
    requiredInputs?: string[]
}

export type ScoringConfigParameterKey =
    | 'alpha'
    | 'target'
    | 'targetScore'
    | 'targetDeviation'
    | 'minScore'
    | 'maxDeviation'

export interface ScoringParameter {
    key: ScoringConfigParameterKey
    label: string
    type: 'number' | 'slider'
    min?: number
    max?: number
    step?: number
    default: number
    description: string
}

// Scoring type metadata registry
export const SCORING_TYPE_INFO: Record<ScoringType, ScoringTypeInfo> = {
    symmetrical: {
        type: 'symmetrical',
        label: 'Symmetrical',
        description: 'Linear scoring with centered target (UCL + LCL / 2)',
        useCase: 'TX Power, frequency measurements with symmetric limits',
        icon: 'mdi-arrow-left-right',
        color: 'primary',
        formulaLatex: String.raw`score = \alpha + (1-\alpha) \cdot \frac{L - |x - T|}{L}`,
        variables: {
            'T': String.raw`Target = \frac{UCL + LCL}{2}`,
            'L': String.raw`Limit = \frac{UCL - LCL}{2}`,
            'x': 'Measured value',
            'α': 'Minimum score at limit boundary (default: 0.8)'
        },
        parameters: [
            {
                key: 'alpha',
                label: 'Alpha (Min Score)',
                type: 'slider',
                min: 0,
                max: 1,
                step: 0.05,
                default: 0.8,
                description: 'Score at the limit boundary'
            }
        ]
    },
    symmetrical_nl: {
        type: 'symmetrical_nl',
        label: 'Symmetrical (Gaussian)',
        description: 'Non-linear Gaussian scoring curve',
        useCase: 'When you want steeper decay away from target',
        icon: 'mdi-chart-bell-curve',
        color: 'secondary',
        formulaLatex: String.raw`score = e^{-\lambda \cdot d^2}`,
        variables: {
            'λ': String.raw`\lambda = -\frac{\ln(S_t)}{d_t^2}`,
            'd': String.raw`|x - T| \text{ (deviation from target)}`,
            'T': String.raw`Target = \frac{UCL + LCL}{2}`,
            'S_t': 'Target score at target deviation (default: 0.8)',
            'd_t': 'Target deviation distance (default: 2.5)'
        },
        parameters: [
            {
                key: 'targetScore',
                label: 'Target Score',
                type: 'slider',
                min: 0,
                max: 1,
                step: 0.05,
                default: 0.8,
                description: 'Score at target deviation'
            },
            {
                key: 'targetDeviation',
                label: 'Target Deviation',
                type: 'number',
                min: 0.1,
                max: 10,
                step: 0.1,
                default: 2.5,
                description: 'Deviation value for target score'
            }
        ]
    },
    evm: {
        type: 'evm',
        label: 'EVM',
        description: 'For negative dB values like EVM - more negative = better',
        useCase: 'EVM measurements (typically -20 to -60 dB)',
        icon: 'mdi-signal-cellular-3',
        color: 'info',
        formulaLatex: String.raw`score = 1 - e^{-\lambda \cdot x^2}`,
        variables: {
            'λ': String.raw`\lambda = -\frac{\ln(1 - S_t)}{T^2}`,
            'x': 'Measured EVM value (negative dB)',
            'T': 'Target EVM value (default: -30)',
            'S_t': 'Target score at target EVM (default: 0.9)'
        },
        parameters: [
            {
                key: 'target',
                label: 'Target EVM',
                type: 'number',
                min: -100,
                max: 0,
                step: 1,
                default: -30,
                description: 'Target EVM value for scoring'
            },
            {
                key: 'targetScore',
                label: 'Target Score',
                type: 'slider',
                min: 0,
                max: 1,
                step: 0.05,
                default: 0.9,
                description: 'Score at target EVM value'
            }
        ]
    },
    throughput: {
        type: 'throughput',
        label: 'Throughput',
        description: 'Linear below target, exponential above target',
        useCase: 'Data throughput, speed measurements',
        icon: 'mdi-speedometer',
        color: 'success',
        formulaLatex: String.raw`score = \begin{cases} m \cdot x + (S_{min} - m \cdot LCL) & x < T \\ 1 - e^{-\lambda \cdot x^2} & x \geq T \end{cases}`,
        variables: {
            'm': String.raw`\text{Slope} = \frac{S_t - S_{min}}{T - LCL}`,
            'λ': String.raw`\lambda = -\frac{\ln(1 - S_t)}{T^2}`,
            'T': 'Target throughput value (user-defined, required)',
            'LCL': 'Lower control limit (minimum acceptable)',
            'S_min': 'Minimum score at LCL (default: 0.4)',
            'S_t': 'Target score at target value (default: 0.9)'
        },
        requiredInputs: ['target'],
        parameters: [
            {
                key: 'minScore',
                label: 'Min Score',
                type: 'slider',
                min: 0,
                max: 0.5,
                step: 0.05,
                default: 0.4,
                description: 'Score at minimum threshold (LCL)'
            },
            {
                key: 'targetScore',
                label: 'Target Score',
                type: 'slider',
                min: 0.5,
                max: 1,
                step: 0.05,
                default: 0.9,
                description: 'Score at target throughput'
            },
            {
                key: 'target',
                label: 'Target Value',
                type: 'number',
                min: 0,
                step: 1,
                default: 0,
                description: 'Target throughput value (required)'
            }
        ]
    },
    asymmetrical: {
        type: 'asymmetrical',
        label: 'Asymmetrical',
        description: 'Custom target between UCL and LCL (not centered)',
        useCase: 'When optimal value is not centered between limits',
        icon: 'mdi-arrow-left-right-bold',
        color: 'warning',
        formulaLatex: String.raw`score = \alpha + (1-\alpha) \cdot \frac{L - d}{L}`,
        variables: {
            'L': String.raw`\begin{cases} UCL - T & x \geq T \\ T - LCL & x < T \end{cases}`,
            'd': String.raw`\begin{cases} x - T & x \geq T \\ T - x & x < T \end{cases}`,
            'T': 'User-defined target value (required)',
            'α': 'Minimum score at limit boundary (default: 0.4)'
        },
        requiredInputs: ['target'],
        parameters: [
            {
                key: 'alpha',
                label: 'Alpha (Min Score)',
                type: 'slider',
                min: 0,
                max: 1,
                step: 0.05,
                default: 0.4,
                description: 'Score at limit boundary'
            },
            {
                key: 'target',
                label: 'Target Value',
                type: 'number',
                step: 0.01,
                default: 0,
                description: 'User-defined target (required)'
            }
        ]
    },
    per_mask: {
        type: 'per_mask',
        label: 'PER/MASK (Close to 0)',
        description: 'Linear decrease from 1.0 at 0 to 0.0 at max deviation',
        useCase: 'Packet Error Rate, Mask margin measurements',
        icon: 'mdi-target',
        color: 'error',
        formulaLatex: String.raw`score = \max\left(0, 1 - \frac{|x - 0|}{d_{max}}\right)`,
        variables: {
            'x': 'Measured value',
            'd_max': 'Maximum deviation (score = 0 at this distance from 0)'
        },
        parameters: [
            {
                key: 'maxDeviation',
                label: 'Max Deviation',
                type: 'number',
                min: 0.1,
                step: 0.1,
                default: 10,
                description: 'Maximum acceptable deviation (default: UCL)'
            }
        ]
    },
    binary: {
        type: 'binary',
        label: 'Binary (PASS/FAIL)',
        description: 'PASS = 1.0, FAIL = 0.0',
        useCase: 'Non-numeric test items',
        icon: 'mdi-toggle-switch',
        color: 'grey',
        formulaLatex: String.raw`score = \begin{cases} 1.0 & \text{STATUS} = \text{PASS} \\ 0.0 & \text{STATUS} = \text{FAIL} \end{cases}`,
        variables: {},
        parameters: []
    }
}

// Default scoring config factory
export function createDefaultScoringConfig(
    testItemName: string,
    scoringType: ScoringType = 'symmetrical'
): ScoringConfig {
    const typeInfo = SCORING_TYPE_INFO[scoringType]
    const config: ScoringConfig = {
        testItemName,
        scoringType,
        enabled: true,
        weight: 1.0
    }

    // Set default parameters from type info
    for (const param of typeInfo.parameters) {
        config[param.key] = param.default
    }

    return config
}

// Utility functions
// Score is stored as 0-1 internally but displayed as 0-10 scale
export const SCORE_DISPLAY_MULTIPLIER = 10

export function getScoreColor(score: number): string {
    // Score is 0-1 scale internally
    if (score >= 0.9) return 'success'
    if (score >= 0.7) return 'info'
    if (score >= 0.5) return 'warning'
    return 'error'
}

export function formatScore(score: number): string {
    // Convert from 0-1 to 0-10 scale and format to 2 decimal places
    return (score * SCORE_DISPLAY_MULTIPLIER).toFixed(2)
}

export function formatScoreWithMax(score: number): string {
    // Format as "X.XX / 10"
    return `${(score * SCORE_DISPLAY_MULTIPLIER).toFixed(2)} / 10`
}

export function getScoreIcon(score: number): string {
    if (score >= 0.9) return 'mdi-check-circle'
    if (score >= 0.7) return 'mdi-check'
    if (score >= 0.5) return 'mdi-alert'
    return 'mdi-close-circle'
}

// UPDATED: UI-visible scoring types (simplified for user selection)
// Only Symmetrical and Asymmetrical are shown to users.
// Other types (evm, per_mask, etc.) are assigned automatically by name-based detection.
export const UI_SCORING_TYPES: ScoringType[] = ['symmetrical', 'asymmetrical']

// Helper to get UI-visible scoring type options for dropdowns
export function getUIScoringTypeOptions() {
    return UI_SCORING_TYPES.map(type => ({
        type: SCORING_TYPE_INFO[type].type,
        label: SCORING_TYPE_INFO[type].label,
        description: SCORING_TYPE_INFO[type].description,
        raw: SCORING_TYPE_INFO[type]
    }))
}
