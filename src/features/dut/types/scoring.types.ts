/**
 * Scoring System Types
 *
 * TypeScript types for the Universal 0-10 Scoring System.
 * These types match the backend scoring schemas.
 *
 * Score Range: 0.00 - 10.00
 * - Outside limits: 0.00
 * - At limit boundary (LCL/UCL): 1.00 (limit_score)
 * - At target: 10.00
 *
 * Scoring Types:
 * - Symmetrical: Target = midpoint (UCL + LCL) / 2
 * - Asymmetrical: User-defined custom target with Policy
 * - PER/MASK: UCL-only, lower is better (best=0)
 * - EVM: UCL-only, lower is better (best=-35 dB, gentle decay)
 * - Binary: PASS = 10, FAIL = 0
 */

// Scoring algorithm types
export type ScoringType =
    | 'symmetrical'       // Target centered between UCL and LCL
    | 'asymmetrical'      // User-defined custom target with Policy
    | 'per_mask'          // UCL-only, lower is better (best=0)
    | 'evm'               // UCL-only, lower is better (best=-35 dB, gentle decay)
    | 'binary'            // PASS/FAIL scoring
    // Legacy types kept for backwards compatibility
    | 'symmetrical_nl'
    | 'throughput'

// Policy for asymmetrical scoring - determines how score decays from target
export type ScoringPolicy = 'symmetrical' | 'higher' | 'lower'

// Policy metadata for UI
export interface ScoringPolicyInfo {
    value: ScoringPolicy
    label: string
    description: string
    icon: string
}

// Available scoring policies for asymmetrical type
export const SCORING_POLICIES: ScoringPolicyInfo[] = [
    {
        value: 'symmetrical',
        label: 'Based on Target',
        description: 'Peak score at target, linear decay to both limits',
        icon: 'mdi-arrow-left-right'
    },
    {
        value: 'higher',
        label: 'Higher than Target',
        description: 'Perfect score at/above target, decay below target to LCL',
        icon: 'mdi-arrow-up-bold'
    },
    {
        value: 'lower',
        label: 'Lower than Target',
        description: 'Perfect score at/below target, decay above target to UCL',
        icon: 'mdi-arrow-down-bold'
    }
]

// Configuration for scoring a specific test item
export interface ScoringConfig {
    testItemName: string
    scoringType: ScoringType
    enabled: boolean
    weight: number

    // Main parameters
    target?: number          // User-defined target value (required for asymmetrical)
    policy?: ScoringPolicy   // Scoring policy for asymmetrical (symmetrical/higher/lower)
    limitScore?: number      // Score at limit boundary (default: 1.0 on 0-10 scale)

    // Legacy parameters kept for backwards compatibility
    alpha?: number           // Legacy: Min score at limit (deprecated, use limitScore)
    targetScore?: number     // Legacy: Score at target deviation (deprecated)
    targetDeviation?: number // Legacy: Deviation for target_score (deprecated)
    minScore?: number        // Legacy: Minimum score (deprecated)
    maxDeviation?: number    // Legacy: Max deviation (deprecated)
}

// Score result for a single test item
export interface TestItemScoreResult {
    testItemName: string
    value: number | null
    ucl: number | null
    lcl: number | null
    status: string
    scoringType: ScoringType
    policy?: ScoringPolicy | null  // Only for asymmetrical scoring
    score: number  // Stored as 0-1, displayed as 0-10
    deviation?: number
    weight: number  // Weight used for this test item in scoring (default 1.0)
    target?: number | null  // Target value used for scoring
}

// Score result for a single test record
export interface RecordScoreResult {
    isn: string
    deviceId: string
    station: string
    testStartTime: string
    testStatus: string
    overallScore: number  // Stored as 0-1, displayed as 0-10
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
    | 'target'
    | 'limitScore'
    // Legacy keys
    | 'alpha'
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
        label: 'Symmetrical (Target Centered)',
        description: 'Target is midpoint between UCL and LCL.',
        useCase: 'Most test items with UCL and LCL limits',
        icon: 'mdi-arrow-left-right',
        color: 'primary',
        formulaLatex: String.raw`score = 1 + 9 \cdot \frac{L - |x - T|}{L}`,
        variables: {
            'T': String.raw`Target = \frac{UCL + LCL}{2}`,
            'L': String.raw`Distance to limit from target`,
            'x': 'Measured value'
        },
        parameters: []  // No configurable parameters for symmetrical
    },
    asymmetrical: {
        type: 'asymmetrical',
        label: 'Asymmetrical (Custom Target)',
        description: 'Policy options: Based on Target, Higher than Target, or Lower than Target.',
        useCase: 'When optimal value is not centered between limits',
        icon: 'mdi-arrow-left-right-bold',
        color: 'warning',
        formulaLatex: String.raw`score = 1 + 9 \cdot \frac{L - d}{L}`,
        variables: {
            'L': 'Distance from target to relevant limit',
            'd': 'Distance from measured value to target',
            'T': 'User-defined target value'
        },
        requiredInputs: ['target', 'policy'],
        parameters: [
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
        label: 'Lower is Better',
        description: 'Near zero is ideal (e.g., PER/MASK).',
        useCase: 'Packet Error Rate (PER) and MASK test items where 0 is ideal',
        icon: 'mdi-target',
        color: 'error',
        formulaLatex: String.raw`score = 1 + 9 \cdot \frac{UCL - x}{UCL}`,
        variables: {
            'x': 'Measured value',
            'UCL': 'Upper Criteria Limit (failure threshold)'
        },
        parameters: []  // No configurable parameters - best is always 0
    },
    evm: {
        type: 'evm',
        label: 'EVM',
        description: 'EVM scoring with exponent decay.',
        useCase: 'Error Vector Magnitude (EVM) test items where lower dB values are better',
        icon: 'mdi-signal-cellular-3',
        color: 'info',
        formulaLatex: String.raw`score = 1 + 9 \cdot \left(1 - \frac{x - ref}{UCL - ref}\right)^{0.25}`,
        variables: {
            'x': 'Measured EVM value (dB)',
            'ref': 'Reference best (-35 dB)',
            'UCL': 'Upper Criteria Limit (failure threshold)',
            '0.25': 'Exponent for gentle decay'
        },
        parameters: []  // Parameters are fixed: ref=-35, exponent=0.25
    },
    binary: {
        type: 'binary',
        label: 'Binary (PASS/FAIL)',
        description: 'PASS = 10.0, FAIL = 0.0',
        useCase: 'Non-numeric test items (status-based)',
        icon: 'mdi-toggle-switch',
        color: 'grey',
        formulaLatex: String.raw`score = \begin{cases} 10.0 & \text{STATUS} = \text{PASS} \\ 0.0 & \text{STATUS} = \text{FAIL} \end{cases}`,
        variables: {},
        parameters: []
    },
    // Legacy types (mapped internally)
    symmetrical_nl: {
        type: 'symmetrical_nl',
        label: 'Symmetrical (Legacy)',
        description: 'Legacy type - now uses standard symmetrical scoring',
        useCase: 'Legacy compatibility',
        icon: 'mdi-chart-bell-curve',
        color: 'secondary',
        parameters: []
    },
    throughput: {
        type: 'throughput',
        label: 'Throughput (Legacy)',
        description: 'Legacy type - now uses standard symmetrical scoring',
        useCase: 'Legacy compatibility',
        icon: 'mdi-speedometer',
        color: 'success',
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
    if (typeInfo && typeInfo.parameters) {
        for (const param of typeInfo.parameters) {
            // Use type assertion to properly set dynamic keys
            ; (config as unknown as Record<string, unknown>)[param.key] = param.default
        }
    }

    // Set default policy for asymmetrical
    if (scoringType === 'asymmetrical') {
        config.policy = 'symmetrical'
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

// UI-visible scoring types for user selection
// Symmetrical, Asymmetrical, PER/MASK, and EVM are shown to users
export const UI_SCORING_TYPES: ScoringType[] = ['symmetrical', 'asymmetrical', 'per_mask', 'evm']

// Helper to get UI-visible scoring type options for dropdowns
export function getUIScoringTypeOptions() {
    return UI_SCORING_TYPES.map(type => ({
        type: SCORING_TYPE_INFO[type].type,
        label: SCORING_TYPE_INFO[type].label,
        description: SCORING_TYPE_INFO[type].description,
        raw: SCORING_TYPE_INFO[type]
    }))
}

// Helper to detect if a test item should use PER/MASK scoring
export function shouldUsePerMaskScoring(testItemName: string): boolean {
    const upperName = testItemName.toUpperCase()

    // Check for PER
    if (upperName.includes('PER')) {
        return true
    }

    // Check for MASK but not "MASK MARGIN" or compound words
    if (upperName.includes('MASK')) {
        const excluded = ['MASK MARGIN', 'MASKING', 'MASKED', 'MASK_MARGIN']
        for (const pattern of excluded) {
            if (upperName.includes(pattern)) {
                return false
            }
        }
        return true
    }

    return false
}

// Helper to detect if a test item should use EVM scoring
// Note: EVM scoring should only be used when the item has UCL but no LCL
export function shouldUseEvmScoring(testItemName: string): boolean {
    const upperName = testItemName.toUpperCase()
    return upperName.includes('EVM')
}
