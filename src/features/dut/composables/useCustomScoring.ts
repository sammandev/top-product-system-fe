import { ref, computed } from 'vue'

// Type definitions
export interface CustomFormula {
    name: string
    enabled: boolean
    tolerance?: number
    calculate: (actual: number, usl: number | null, lsl: number | null, target: number) => number
}

export interface CategoryFormulas {
    [category: string]: CustomFormula
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
// Helper function to extract category from test item name
export const extractCategory = (testItem: string): string | null => {
    // Common patterns: WiFi_TX_POW_2412, WiFi_RX_RSSI_5180, BT_TX_EVM_2402
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

// Default universal formula (linear)
const createUniversalFormula = (): CustomFormula => ({
    name: 'Universal Linear',
    enabled: false,
    tolerance: 1.0,
    calculate: (actual: number, usl: number | null, lsl: number | null, target: number): number => {
        // Check if out of bounds
        if (usl !== null && actual > usl) return 0
        if (lsl !== null && actual < lsl) return 0

        // Calculate deviation from target
        const deviation = Math.abs(actual - target)

        // Determine tolerance/span
        let tolerance: number
        if (usl !== null && lsl !== null) {
            tolerance = (usl - lsl) / 2
        } else if (usl !== null) {
            tolerance = Math.abs(usl - target)
        } else if (lsl !== null) {
            tolerance = Math.abs(target - lsl)
        } else {
            tolerance = Math.max(Math.abs(target) * 0.1, 1)
        }

        if (deviation >= tolerance) return 0

        return Number((10 * (1 - deviation / tolerance)).toFixed(2))
    },
})

// Default category-specific formulas
const createCategoryFormulas = (): CategoryFormulas => ({
    POW: {
        name: 'TX Power - Strict',
        enabled: false,
        tolerance: 0.5, // dB
        calculate: (actual: number, usl: number | null, lsl: number | null, target: number): number => {
            // Check if out of bounds
            if (usl !== null && actual > usl) return 0
            if (lsl !== null && actual < lsl) return 0

            const deviation = Math.abs(actual - target)
            const tolerance = 0.5 // Fixed 0.5 dB tolerance

            if (deviation >= tolerance) return 0

            return Number((10 * (1 - deviation / tolerance)).toFixed(2))
        },
    },

    EVM: {
        name: 'TX EVM - Exponential',
        enabled: false,
        calculate: (actual: number, usl: number | null, _lsl: number | null, _target: number): number => {
            const uslActual = usl ?? -3

            if (actual > uslActual) {
                // Harsh exponential penalty beyond USL
                const excess = actual - uslActual
                return Number(Math.max(0, 5 * Math.exp(-excess / 2)).toFixed(2))
            }

            // Linear reward for being well below limit
            const margin = uslActual - actual
            return Number(Math.min(10, 6 + margin * 0.4).toFixed(2))
        },
    },

    FREQ: {
        name: 'TX Frequency - Symmetric',
        enabled: false,
        tolerance: 25, // kHz
        calculate: (actual: number, usl: number | null, lsl: number | null, target: number): number => {
            // Check if out of bounds
            if (usl !== null && actual > usl) return 0
            if (lsl !== null && actual < lsl) return 0

            const deviation = Math.abs(actual - target)
            const tolerance =
                usl !== null && lsl !== null ? (usl - lsl) / 2 : 25 // Default ±25 kHz

            if (deviation >= tolerance) return 0

            return Number((10 * (1 - deviation / tolerance)).toFixed(2))
        },
    },

    PER: {
        name: 'RX PER - Threshold',
        enabled: false,
        calculate: (actual: number, usl: number | null, _lsl: number | null, _target: number): number => {
            const uslActual = usl ?? 1 // Default 1%

            if (actual <= 0) return 10 // Perfect
            if (actual >= uslActual) return 0

            // Linear decay from 10 to 0
            return Number((10 * (1 - actual / uslActual)).toFixed(2))
        },
    },

    RSSI: {
        name: 'RX RSSI - Linear',
        enabled: false,
        calculate: (actual: number, usl: number | null, lsl: number | null, target: number): number => {
            // Check if out of bounds
            if (usl !== null && actual > usl) return 0
            if (lsl !== null && actual < lsl) return 0

            const deviation = Math.abs(actual - target)

            let tolerance: number
            if (usl !== null && lsl !== null) {
                tolerance = (usl - lsl) / 2
            } else if (usl !== null) {
                tolerance = Math.abs(usl - target)
            } else if (lsl !== null) {
                tolerance = Math.abs(target - lsl)
            } else {
                tolerance = 3 // Default ±3 dBm
            }

            if (deviation >= tolerance) return 0

            return Number((10 * (1 - deviation / tolerance)).toFixed(2))
        },
    },

    MASK: {
        name: 'TX Mask - Threshold',
        enabled: false,
        calculate: (actual: number, usl: number | null, _lsl: number | null, _target: number): number => {
            const uslActual = usl ?? 0

            if (actual >= uslActual) return 0

            // More headroom = better score
            const margin = uslActual - actual
            return Number(Math.min(10, 5 + margin * 0.5).toFixed(2))
        },
    },

    LO_LEAKAGE: {
        name: 'LO Leakage - Threshold',
        enabled: false,
        calculate: (actual: number, usl: number | null, _lsl: number | null, _target: number): number => {
            const uslActual = usl ?? -30 // Default -30 dBm

            if (actual >= uslActual) return 0

            // More margin below limit = better score
            const margin = uslActual - actual
            return Number(Math.min(10, 5 + margin * 0.2).toFixed(2))
        },
    },

    POW_DIF_ABS: {
        name: 'PA Power Delta - Linear',
        enabled: false,
        calculate: (actual: number, usl: number | null, _lsl: number | null, _target: number): number => {
            const threshold = usl && usl > 0 ? usl : 5
            const deviation = Math.abs(actual)

            if (deviation >= threshold) return 0

            return Number((10 * (1 - deviation / threshold)).toFixed(2))
        },
    },

    ADJUSTED_POW: {
        name: 'PA Adjusted Power - Linear',
        enabled: false,
        calculate: (actual: number, _usl: number | null, _lsl: number | null, _target: number): number => {
            const threshold = 5
            const deviation = Math.abs(actual)

            if (deviation >= threshold) return 0

            return Number((10 * (1 - deviation / threshold)).toFixed(2))
        },
    },
})

// Composable
export const useCustomScoring = () => {
    const universalFormula = ref<CustomFormula>(createUniversalFormula())
    const categoryFormulas = ref<CategoryFormulas>(createCategoryFormulas())

    // Calculate custom score for a measurement
    const calculateCustomScore = (
        measurement: ScoredMeasurement
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
                measurement.target
            )
            return { score: customScore, source: 'category' }
        }

        // Check if universal formula is enabled
        if (universalFormula.value.enabled) {
            const customScore = universalFormula.value.calculate(
                measurement.actual,
                measurement.usl,
                measurement.lsl,
                measurement.target
            )
            return { score: customScore, source: 'universal' }
        }

        // Fallback to system default
        return { score: measurement.systemScore, source: 'system' }
    }

    // Get statistics about active formulas
    const activeFormulaStats = computed(() => {
        const enabledCategories = Object.entries(categoryFormulas.value)
            .filter(([_, formula]) => formula.enabled)
            .map(([category]) => category)

        return {
            universalEnabled: universalFormula.value.enabled,
            categoryCount: enabledCategories.length,
            enabledCategories,
        }
    })

    // Reset all formulas to default
    const resetFormulas = () => {
        universalFormula.value = createUniversalFormula()
        categoryFormulas.value = createCategoryFormulas()
    }

    // Enable/disable all category formulas
    const toggleAllCategories = (enabled: boolean) => {
        Object.values(categoryFormulas.value).forEach((formula) => {
            formula.enabled = enabled
        })
    }

    return {
        universalFormula,
        categoryFormulas,
        calculateCustomScore,
        activeFormulaStats,
        resetFormulas,
        toggleAllCategories,
        extractCategory,
    }
}
