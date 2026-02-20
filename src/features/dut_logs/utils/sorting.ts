/**
 * Custom sorting utilities for test log items
 */

interface TestItemLike {
  test_item: string
}

/**
 * Generate sort key for test items with custom ordering rules.
 *
 * Sorting order based on original file order:
 * - BT tests: Sort by criteria first (POW→FREQ_KHZ→PER), then antenna
 * - WiFi tests: Sort by frequency→antenna→criteria
 */
export function getTestItemSortKey(item: TestItemLike): string {
  const testItem = item.test_item

  // Detect if this is a BT test (no WiFi_ prefix, contains _BT)
  const isBtTest = !testItem.startsWith('WiFi_') && testItem.includes('_BT')

  // Extract frequency + standard + modulation + bandwidth pattern
  // Patterns to match:
  // - NNNN_XX (e.g., 2404_BT, 2480_BT)
  // - NNNN_STANDARD_MODULATION_BNN (e.g., 6175_11AX_MCS9_B20, 6115_11AG_OFDM6_B20)
  // - NNNN_STANDARD_MODULATION_BNNN-N (e.g., 6265_11BE_MCS9_B320-2)
  const freqPattern = testItem.match(/(\d{4}_(?:\w+(?:_\w+)*_B\d+(?:-\d+)?|\w+))/)
  const freqStdModBw = freqPattern ? freqPattern[1] : ''

  // Extract antenna number (TX1, TX2, RX1, PA1, etc.)
  const antennaMatch = testItem.match(/(TX|RX|PA|ANT)(\d+)/)
  const antennaType = antennaMatch ? antennaMatch[1] : ''
  const antennaNum = antennaMatch?.[2] ? parseInt(antennaMatch[2], 10) : 0

  // Define criteria family ordering
  // Order matters - check more specific patterns first to avoid false matches
  const criteriaFamilies: Record<string, number> = {
    // BT tests (special ordering for BT)
    POW: isBtTest ? 5 : 30, // BT: POW comes first; WiFi: POW after PA tests
    FREQ_KHZ: 6, // BT only, check before FREQ
    // Fixture/problem detection
    FIXTURE_OR_DUT_PROBLEM_POW: 10,
    FIXTURE_OR_DUT_PROBLEM_FREQ: 11,
    FIXTURE_OR_DUT_PROBLEM_EVM: 12,
    // PA family (check specific patterns first)
    POW_OLD: 20,
    POW_DIF_ABS: 21,
    POW_DIF: 21, // Alias for POW_DIF_ABS
    SROM_OLD: 22,
    SROM_NEW: 23,
    // TX/RX family (WiFi tests)
    EVM: 31,
    FREQ: 32,
    MASK: 33,
    LO_LEAKAGE: 34,
    PER: 40,
    RSSI: 41,
  }

  // Find which criteria family this item belongs to
  let criteriaOrder = 100 // Default for unknown criteria
  for (const [criteriaName, order] of Object.entries(criteriaFamilies)) {
    if (testItem.includes(criteriaName)) {
      criteriaOrder = order
      break
    }
  }

  // Build sort key
  // BT tests: freq | criteria | antenna_type | antenna_num | original_name
  // WiFi tests: freq | antenna_type | antenna_num | criteria | original_name
  const paddedAntenna = antennaNum.toString().padStart(3, '0')
  const paddedCriteria = criteriaOrder.toString().padStart(3, '0')

  if (isBtTest) {
    return `${freqStdModBw}|${paddedCriteria}|${antennaType}|${paddedAntenna}|${testItem}`
  } else {
    return `${freqStdModBw}|${antennaType}|${paddedAntenna}|${paddedCriteria}|${testItem}`
  }
}

/**
 * Sort an array of test items using custom ordering rules
 */
export function sortTestItems<T extends TestItemLike>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const keyA = getTestItemSortKey(a)
    const keyB = getTestItemSortKey(b)
    return keyA.localeCompare(keyB)
  })
}
