import { ref } from 'vue'
import type { DownloadCsvLogInfo } from '@/features/dut-logs/composables/useIplasApi'
import { useIplasApi } from '@/features/dut-logs/composables/useIplasApi'
import { useNotification } from '@/shared/composables/useNotification'
import { getErrorMessage } from '@/shared/utils'
import type { NormalizedRecord } from '../components/IplasTestItemsFullscreenDialog.vue'

export function useIplasRecordDownload() {
  const { downloadAttachments, downloadCsvLogs } = useIplasApi()
  const { showError, showSuccess } = useNotification()
  const downloading = ref(false)

  async function downloadRecord(record: NormalizedRecord | null): Promise<void> {
    if (downloading.value) return
    if (!record?.site || !record.project || !record.stationName || !record.testEndTime) {
      showError('Missing record, site, project, station, or test end time for download')
      return
    }

    downloading.value = true
    try {
      const isn = record.isn.trim() || record.deviceId
      // Station-search timestamps are already local; do not apply display-time adjustments.
      const endTime = record.testEndTime.replace('T', ' ').replace(/-/g, '/')
      const csvLog: DownloadCsvLogInfo = {
        site: record.site,
        project: record.project,
        // CSV uses TSP/display station; TXT attachments require the raw station name.
        station: record.tsp || record.displayStationName || record.stationName,
        line: record.line || 'NA',
        model: record.model || 'ALL',
        deviceid: record.deviceId,
        isn,
        test_end_time: endTime.includes('.') ? endTime : `${endTime}.000`,
        data_source: 0,
      }
      await downloadAttachments(record.site, record.project, [
        {
          isn,
          deviceid: record.deviceId,
          station: record.stationName,
          time: endTime.split('.')[0] || '',
        },
      ])
      await downloadCsvLogs([csvLog])
      showSuccess('Test logs downloaded successfully!')
    } catch (error) {
      console.error('Failed to download test logs:', error)
      showError(getErrorMessage(error) || 'Failed to download test logs')
    } finally {
      downloading.value = false
    }
  }

  return { downloading, downloadRecord }
}
