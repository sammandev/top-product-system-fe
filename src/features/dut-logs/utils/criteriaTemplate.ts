export interface UploadLogCriteriaRule {
  test_item: string
  ucl: string
  lcl: string
  target: string
}

export interface UploadLogCriteriaTemplate {
  $comment?: string
  criteria: UploadLogCriteriaRule[]
}

export const DEFAULT_UPLOAD_LOG_CRITERIA_TEMPLATE: UploadLogCriteriaTemplate = {
  $comment: 'Criteria Configuration Template for Test Log Parser',
  criteria: [
    {
      test_item: 'WiFi_TX_POW_2462_11B_CCK11_B20',
      ucl: '20',
      lcl: '10',
      target: '15',
    },
    {
      test_item: 'BT_FREQ_KHZ',
      ucl: '2500000',
      lcl: '2400000',
      target: '2450000',
    },
  ],
}

export function buildUploadLogCriteriaJson(criteria: UploadLogCriteriaRule[]) {
  return JSON.stringify({ criteria }, null, 2)
}

export function buildDefaultUploadLogCriteriaTemplateJson() {
  return JSON.stringify(DEFAULT_UPLOAD_LOG_CRITERIA_TEMPLATE, null, 2)
}

export function downloadUploadLogCriteriaTemplate() {
  const templateJson = buildDefaultUploadLogCriteriaTemplateJson()
  const blob = new Blob([templateJson], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'criteria_template.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
