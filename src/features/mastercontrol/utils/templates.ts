/**
 * Template generation utilities for MasterControl Analyze feature
 */

export interface SpecRule {
  test_pattern: string
  usl: number
  lsl: number
  target: number
  gap: number
}

/**
 * Generate sample JSON spec template
 */
export function generateJsonSpecTemplate(): SpecRule[] {
  return [
    {
      test_pattern: 'TX_POW_2412_11B_CCK11_B20',
      usl: 24.5,
      lsl: 21.5,
      target: 23,
      gap: 0.5,
    },
    {
      test_pattern: 'TX_POW_2437_11B_CCK11_B20',
      usl: 24.5,
      lsl: 21.5,
      target: 23,
      gap: 0.5,
    },
    {
      test_pattern: 'TX_EVM_2412_11B_CCK11_B20',
      usl: -9.1,
      lsl: -60,
      target: 0,
      gap: 1,
    },
    {
      test_pattern: 'RX_POW_.*_11N_MCS7',
      usl: -20,
      lsl: -90,
      target: 0,
      gap: 2,
    },
    {
      test_pattern: 'PA_POW_.*_11AC_MCS8',
      usl: 27,
      lsl: 19,
      target: 23,
      gap: 1,
    },
  ]
}

/**
 * Generate sample INI spec template
 */
export function generateIniSpecTemplate(): string {
  return `; MasterControl Multi-DUT Analysis Criteria File
; =================================================
; Format: "PATTERN" <USL,LSL,Target,Gap>
;
; PATTERN - Test item pattern to match (supports regex)
; USL     - Upper Spec Limit
; LSL     - Lower Spec Limit  
; Target  - Target value (use 0 for auto-calculate as (USL+LSL)/2)
; Gap     - Margin/Gap threshold for warnings
;
; =================================================
; PATTERN MATCHING EXAMPLES:
; 
; 1. Simple exact match:
;    "TX_POW_2412_11B_CCK11_B20" <24.5,21.5,23,0.5>
;
; 2. Regex pattern (match all TX1-TX99 power measurements):
;    "TX_FIXTURE_OR_DUT_PROBLEM_POW_5300_11AC_MCS8_B20" <20,10,15,0.5>
;    This will match TX1_FIXTURE_OR_DUT_PROBLEM_POW_5300_11AC_MCS8_B20,
;                     TX2_FIXTURE_OR_DUT_PROBLEM_POW_5300_11AC_MCS8_B20, etc.
;
; 3. Wildcard pattern (match all EVM measurements):
;    "TX._EVM_.*" <-9.1,-60,0,1>
;
; 4. PA measurements:
;    "PA._POW_.*_11B_.*" <27,19,23,1>
;
; =================================================

[Test_Items]
; TX Power specifications
"TX_FIXTURE_POW_.*" <24.5,21.5,23,0.5>
"TX_POW_2412_.*" <24.5,21.5,23,0.5>
"TX_POW_5180_.*" <22.5,19.5,21,0.5>

; TX EVM specifications  
"TX_EVM_.*_11B_.*" <-9.1,-60,0,1>
"TX_EVM_.*_11AG_.*" <-15,-60,0,1>
"TX_EVM_.*_11N_.*" <-25,-60,0,1.5>

; PA Power specifications
"PA_POW_.*_11B_.*" <27,19,23,1>
"PA_POW_.*_11AC_.*" <25,17,21,1>

; RX Sensitivity specifications
"RX_POW_.*" <-20,-90,0,2>

; Fixture or DUT Problem patterns
"TX_FIXTURE_OR_DUT_PROBLEM_POW_5300_11AC_MCS8_B20" <20,10,15,0.5>
`
}

/**
 * Generate sample MC2 CSV template
 */
export function generateMc2CsvTemplate(): string {
  const headers = [
    'Test_Date',
    'Test_Time',
    'ISN',
    'Device_ID',
    'OP_ID',
    'WiFi_TX1_POW_2412_11B_CCK11_B20',
    'WiFi_TX1_EVM_2412_11B_CCK11_B20',
    'WiFi_TX1_POW_2437_11B_CCK11_B20',
    'WiFi_TX1_EVM_2437_11B_CCK11_B20',
    'WiFi_TX1_POW_5180_11AC_MCS7_B80',
    'WiFi_TX1_EVM_5180_11AC_MCS7_B80',
    'WiFi_PA1_POW_2412_11B_CCK11_B20',
    'WiFi_PA1_POW_5180_11AC_MCS7_B80',
    'WiFi_RX1_POW_2412_11B_CCK11_B20',
    'WiFi_RX1_POW_5180_11AC_MCS7_B80',
  ]

  const usl = [
    '',
    '',
    '',
    '',
    '',
    '24.5',
    '-9.1',
    '24.5',
    '-9.1',
    '22.5',
    '-15',
    '27',
    '25',
    '-20',
    '-20',
  ]

  const lsl = [
    '',
    '',
    '',
    '',
    '',
    '21.5',
    '-60',
    '21.5',
    '-60',
    '19.5',
    '-60',
    '19',
    '17',
    '-90',
    '-90',
  ]

  const sampleData = [
    '2025-12-02',
    '14:30:00',
    'DUT001',
    'DEVICE_123',
    'OP001',
    '23.2',
    '-12.5',
    '23.4',
    '-11.8',
    '21.1',
    '-18.2',
    '24.5',
    '22.3',
    '-45',
    '-48',
  ]

  return `${headers.join(',')}\n${usl.join(',')}\n${lsl.join(',')}\n${sampleData.join(',')}\n`
}

/**
 * Download JSON spec template
 */
export function downloadJsonSpecTemplate(): void {
  const template = generateJsonSpecTemplate()
  const content = JSON.stringify(template, null, 2)
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'spec_template.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download INI spec template
 */
export function downloadIniSpecTemplate(): void {
  const content = generateIniSpecTemplate()
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'spec_template.ini'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Download MC2 CSV template
 */
export function downloadMc2CsvTemplate(): void {
  const content = generateMc2CsvTemplate()
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'mc2_template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
