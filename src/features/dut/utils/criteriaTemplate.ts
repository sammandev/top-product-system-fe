const CRITERIA_TEMPLATE = {
  criteria: [
    {
      test_item: 'WiFi_TX_FIXTURE_OR_DUT_PROBLEM_POW_2437_11N_MCS0_B20',
      ucl: '20',
      lcl: '10',
      target: '15',
    },
    {
      test_item: 'WiFi_RX_PER_2462_11B_CCK11_B20',
      ucl: '10',
      lcl: '',
      target: '0',
    },
    {
      test_item: 'WiFi_TX_POW_6185_11AX_MCS11_B160',
      ucl: '17',
      lcl: '14',
      target: '16',
    },
  ],
}

export function downloadCriteriaJsonTemplate() {
  const templateContent = `${JSON.stringify(CRITERIA_TEMPLATE, null, 2)}\n`
  const blob = new Blob([templateContent], { type: 'application/json;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'top_product_criteria_configuration.json'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
