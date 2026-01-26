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
        label: 'EVM (Lower is Better)',
        description: 'For negative dB values like EVM - more negative = better',
        useCase: 'EVM measurements (typically -20 to -60 dB)',
        icon: 'mdi-signal-cellular-3',
        color: 'info',
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
        label: 'Throughput (Higher is Better)',
        description: 'Linear to target, exponential above target',
        useCase: 'Data throughput, speed measurements',
        icon: 'mdi-speedometer',
        color: 'success',
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
                description: 'Target throughput value (0 = auto)'
            }
        ]
    },
    asymmetrical: {
        type: 'asymmetrical',
        label: 'Asymmetrical',
        description: 'Custom target between UCL and LCL',
        useCase: 'When optimal value is not centered between limits',
        icon: 'mdi-arrow-left-right-bold',
        color: 'warning',
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
        label: 'PER/MASK (Zero is Best)',
        description: 'Linear decrease from 1.0 at 0 to 0.0 at max',
        useCase: 'Packet Error Rate, Mask margin measurements',
        icon: 'mdi-target',
        color: 'error',
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
export function getScoreColor(score: number): string {
    if (score >= 0.9) return 'success'
    if (score >= 0.7) return 'info'
    if (score >= 0.5) return 'warning'
    return 'error'
}

export function formatScore(score: number): string {
    return `${(score * 100).toFixed(1)}%`
}

export function getScoreIcon(score: number): string {
    if (score >= 0.9) return 'mdi-check-circle'
    if (score >= 0.7) return 'mdi-check'
    if (score >= 0.5) return 'mdi-alert'
    return 'mdi-close-circle'
}
