<template>
    <div>
        <!-- Search Card -->
        <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center justify-space-between bg-primary">
                <div class="d-flex align-center">
                    <v-icon class="mr-2">mdi-barcode-scan</v-icon>
                    ISN Search
                </div>
                <v-btn color="white" variant="outlined" size="small" prepend-icon="mdi-cog"
                    @click="emit('show-settings')">
                    iPLAS Settings
                </v-btn>
            </v-card-title>
            <v-card-text class="pt-4">
                <!-- Input Mode Toggle -->
                <v-btn-toggle v-model="inputMode" mandatory color="primary" class="mb-4">
                    <v-btn value="single" size="small">
                        <v-icon start>mdi-numeric-1-box</v-icon>
                        Single ISN
                    </v-btn>
                    <v-btn value="multiple" size="small">
                        <v-icon start>mdi-format-list-bulleted</v-icon>
                        Multiple ISNs
                    </v-btn>
                    <v-btn value="bulk" size="small">
                        <v-icon start>mdi-text-box-multiple</v-icon>
                        Bulk Paste
                    </v-btn>
                </v-btn-toggle>

                <!-- Single ISN Input -->
                <v-row v-if="inputMode === 'single'">
                    <v-col cols="12" md="10">
                        <v-text-field v-model="searchIsn" label="DUT ISN" placeholder="e.g., DM2520270073965"
                            prepend-inner-icon="mdi-barcode-scan" variant="outlined" density="comfortable" clearable
                            hint="Enter the ISN to search across all stations" persistent-hint
                            @keyup.enter="handleSearch" />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <v-btn color="primary" size="large" :loading="loadingIsnSearch" :disabled="!searchIsn?.trim()"
                            prepend-icon="mdi-magnify" block class="mb-5" @click="handleSearch">
                            Search
                        </v-btn>
                    </v-col>
                </v-row>

                <!-- Multiple ISNs Combobox -->
                <v-row v-if="inputMode === 'multiple'">
                    <v-col cols="12">
                        <v-combobox v-model="selectedISNs" label="DUT ISNs" placeholder="Type ISN and press Enter"
                            prepend-inner-icon="mdi-barcode-scan" variant="outlined" chips multiple closable-chips
                            clearable hint="Type ISN and press Enter to add multiple" persistent-hint>
                            <template #chip="{ props, item }">
                                <v-chip v-bind="props" :text="String(item.value || item)" closable />
                            </template>
                            <template #append>
                                <v-btn color="primary" variant="flat" size="small" :loading="loadingIsnSearch"
                                    :disabled="!selectedISNs || selectedISNs.length === 0" prepend-icon="mdi-magnify"
                                    @click="handleSearch">
                                    Search
                                </v-btn>
                            </template>
                        </v-combobox>
                    </v-col>
                </v-row>

                <!-- Bulk Paste Textarea -->
                <v-row v-if="inputMode === 'bulk'">
                    <v-col cols="12">
                        <v-textarea v-model="searchIsn" label="Bulk ISN Input"
                            placeholder="Paste multiple ISNs (one per line, comma-separated, or space-separated)"
                            prepend-inner-icon="mdi-text-box-multiple" variant="outlined" rows="4" clearable
                            hint="Paste ISNs separated by newlines, commas, or spaces" persistent-hint>
                            <template #append>
                                <v-btn color="primary" variant="flat" size="small" :loading="loadingIsnSearch"
                                    :disabled="!searchIsn?.trim()" prepend-icon="mdi-magnify" @click="handleSearch">
                                    Search
                                </v-btn>
                            </template>
                        </v-textarea>
                    </v-col>
                </v-row>

                <!-- Action Buttons -->
                <v-divider v-if="groupedByISN.length > 0" class="my-4" />
                <div v-if="groupedByISN.length > 0" class="d-flex justify-end gap-2">
                    <v-btn color="error" variant="outlined" prepend-icon="mdi-close-circle" :disabled="loadingIsnSearch"
                        @click="clearAll">
                        Clear All
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>

        <!-- Error Alert -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
            {{ error }}
        </v-alert>

        <!-- No Results Alert -->
        <v-alert v-if="hasSearched && groupedByISN.length === 0 && !loadingIsnSearch" type="info" class="mb-4">
            No test records found for the provided ISN(s).
        </v-alert>

        <!-- Results Section with Ranking Table -->
        <TopProductIplasIsnRanking v-if="groupedByISN.length > 0" :isn-groups="groupedByISN" :loading="downloading"
            :scores="recordScores" :calculating-scores="calculatingScores" @row-click="handleRowClick"
            @download-selected="handleDownloadSelected" @export="handleExportRecords" @export-all="handleExportAllRecords" @calculate-scores="handleCalculateScores" />

        <!-- Copy Success Snackbar -->
        <v-snackbar v-model="showCopySuccess" :timeout="2000" color="success" location="bottom">
            <v-icon start>mdi-check</v-icon>
            Copied to clipboard!
        </v-snackbar>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIplasApi } from '@/features/dut_logs/composables/useIplasApi'
import { iplasProxyApi, type ExportRecord, type ExportTestItem } from '@/features/dut_logs/api/iplasProxyApi'
import { useScoring } from '../composables/useScoring'
import TopProductIplasIsnRanking from './TopProductIplasIsnRanking.vue'
import type { NormalizedRecord, NormalizedTestItem } from './IplasTestItemsFullscreenDialog.vue'
import type { IsnSearchData, IsnSearchTestItem } from '@/features/dut_logs/api/iplasApi'

// Scoring composable
const {
    initializeConfigs,
    calculateScores,
    scoredRecords,
    loading: scoringLoading,
    error: scoringError
} = useScoring()

// Scoring state
const recordScores = ref<Record<string, number>>({})
const calculatingScores = ref(false)

interface StationGroup {
    stationName: string
    displayName: string
    hasError: boolean
    errorCount: number
    records: IsnSearchData[]
}

interface ISNGroup {
    isn: string
    site: string
    project: string
    hasError: boolean
    errorCount: number
    records: IsnSearchData[]
    stations: StationGroup[]
}

// Emits
const emit = defineEmits<{
    (e: 'show-details', record: NormalizedRecord): void
    (e: 'show-settings'): void
}>()

const {
    loadingIsnSearch,
    downloading,
    error,
    searchByIsn,
    searchByIsnBatch,
    downloadAttachments,
    clearIsnSearchData
} = useIplasApi()

// Input mode
const inputMode = ref<'single' | 'multiple' | 'bulk'>('single')
const searchIsn = ref('')
const selectedISNs = ref<string[]>([])

// Search state
const hasSearched = ref(false)
const groupedByISN = ref<ISNGroup[]>([])
const showCopySuccess = ref(false)

// Normalize record for dialog
function normalizeIsnRecord(record: IsnSearchData): NormalizedRecord {
    return {
        isn: record.isn || '-',
        deviceId: record.device_id || '-',
        stationName: record.station_name,
        displayStationName: record.display_station_name || record.station_name,
        site: record.site || '-',
        project: record.project || '-',
        line: record.line || '-',
        errorCode: record.error_code || '-',
        errorName: record.error_name || '-',
        testStatus: record.test_status || '-',
        testStartTime: record.test_start_time || '-',
        testEndTime: record.test_end_time || '-',
        testItems: (record.test_item || []).map((item: IsnSearchTestItem): NormalizedTestItem => ({
            NAME: item.NAME,
            STATUS: item.STATUS,
            VALUE: item.VALUE,
            UCL: item.UCL || '',
            LCL: item.LCL || '',
            CYCLE: item.CYCLE || ''
        }))
    }
}

// Handle row click from ranking table
function handleRowClick(record: IsnSearchData) {
    const normalized = normalizeIsnRecord(record)
    emit('show-details', normalized)
}

// Handle download selected
async function handleDownloadSelected(records: IsnSearchData[]) {
    // Group records by site and project
    const groupedByProject: Record<string, { site: string; project: string; attachments: { isn: string; time: string; deviceid: string; station: string }[] }> = {}

    for (const record of records) {
        const key = `${record.site}-${record.project}`
        if (!groupedByProject[key]) {
            groupedByProject[key] = {
                site: record.site || '',
                project: record.project || '',
                attachments: []
            }
        }
        groupedByProject[key].attachments.push({
            isn: record.isn,
            time: formatTimeForDownloadWithTimezone(record.test_end_time, record.site),
            deviceid: record.device_id || '',
            station: record.display_station_name || record.station_name
        })
    }

    // Download for each project
    for (const group of Object.values(groupedByProject)) {
        await downloadAttachments(group.site, group.project, group.attachments)
    }
}

// Handle calculate scores request from ranking table
async function handleCalculateScores(): Promise<void> {
    // Collect all records from all ISN groups
    const allRecords: IsnSearchData[] = []
    for (const group of groupedByISN.value) {
        allRecords.push(...group.records)
    }

    if (allRecords.length === 0) return

    calculatingScores.value = true
    try {
        // Convert ISN search records to format expected by scoring API
        const records = allRecords.map(record => ({
            ISN: record.isn,
            DeviceId: record.device_id || '',
            station: record.station_name,
            'Test Start Time': record.test_start_time,
            'Test end Time': record.test_end_time,
            TestItem: (record.test_item || []).map(item => ({
                NAME: item.NAME,
                STATUS: item.STATUS,
                VALUE: item.VALUE,
                UCL: item.UCL,
                LCL: item.LCL
            }))
        }))

        // Initialize scoring configs from first record's test items if needed
        const firstRecord = allRecords[0]
        if (firstRecord?.test_item && firstRecord.test_item.length > 0) {
            initializeConfigs(firstRecord.test_item)
        }

        // Calculate scores via backend API
        await calculateScores(records)

        // Map scored records back to our score map
        const newScores: Record<string, number> = {}
        allRecords.forEach(record => {
            const key = `${record.isn}_${record.station_name}_${record.test_end_time}`

            // Try to find matching scored record
            const matchedScore = scoredRecords.value.find(s =>
                (s.isn === record.isn || s.deviceId === record.device_id) &&
                s.station === record.station_name
            )
            if (matchedScore) {
                newScores[key] = matchedScore.overallScore
            }
        })

        recordScores.value = newScores
    } catch (err) {
        console.error('Failed to calculate scores:', err)
        error.value = scoringError.value || 'Failed to calculate scores'
    } finally {
        calculatingScores.value = false
    }
}

// Handle export selected records to CSV/XLSX
async function handleExportRecords(payload: { records: IsnSearchData[]; isnGroups: any[] }): Promise<void> {
    if (payload.records.length === 0) return

    // Transform IsnSearchData to ExportRecord format
    const exportRecords: ExportRecord[] = payload.records.map(record => {
        // Build test items from the record's test_item array
        const testItems: ExportTestItem[] = (record.test_item || []).map(item => ({
            NAME: item.NAME,
            STATUS: item.STATUS || '',
            VALUE: item.VALUE || '',
            UCL: item.UCL || '',
            LCL: item.LCL || ''
        }))

        return {
            ISN: record.isn,
            Project: record.project || '',
            Station: record.display_station_name || record.station_name,
            DeviceId: record.device_id || '',
            Line: record.line || 'NA',
            ErrorCode: record.error_code || '',
            ErrorName: record.error_name || '',
            Type: 'ONLINE',
            TestStartTime: record.test_start_time || '',
            TestEndTime: record.test_end_time || '',
            TestItems: testItems
        }
    })

    try {
        // Group by ISN for filename
        const uniqueISNs = [...new Set(payload.records.map(r => r.isn))]
        const fileName = uniqueISNs.length === 1 ? uniqueISNs[0] : `${uniqueISNs.length}_ISNs`

        const response = await iplasProxyApi.exportTestItems({
            records: exportRecords,
            format: 'xlsx', // Default to XLSX for multi-sheet support
            filename_prefix: fileName
        })

        iplasProxyApi.downloadExportFile(response)
    } catch (error) {
        console.error('Export failed:', error)
    }
}

// Handle export ALL records to XLSX (all ISNs and stations)
async function handleExportAllRecords(payload: { records: IsnSearchData[]; isnGroups: any[] }): Promise<void> {
    if (payload.records.length === 0) return

    // Transform IsnSearchData to ExportRecord format
    const exportRecords: ExportRecord[] = payload.records.map(record => {
        // Build test items from the record's test_item array
        const testItems: ExportTestItem[] = (record.test_item || []).map(item => ({
            NAME: item.NAME,
            STATUS: item.STATUS || '',
            VALUE: item.VALUE || '',
            UCL: item.UCL || '',
            LCL: item.LCL || ''
        }))

        return {
            ISN: record.isn,
            Project: record.project || '',
            Station: record.display_station_name || record.station_name,
            DeviceId: record.device_id || '',
            Line: record.line || 'NA',
            ErrorCode: record.error_code || '',
            ErrorName: record.error_name || '',
            Type: 'ONLINE',
            TestStartTime: record.test_start_time || '',
            TestEndTime: record.test_end_time || '',
            TestItems: testItems
        }
    })

    try {
        // Use a more descriptive filename for export all
        const uniqueISNs = [...new Set(payload.records.map(r => r.isn))]
        const fileName = `all_${uniqueISNs.length}_ISNs`

        const response = await iplasProxyApi.exportTestItems({
            records: exportRecords,
            format: 'xlsx', // XLSX for multi-sheet support (each station is a sheet)
            filename_prefix: fileName
        })

        iplasProxyApi.downloadExportFile(response)
    } catch (error) {
        console.error('Export all failed:', error)
    }
}

/**
 * Get timezone offset hours based on site
 */
function getSiteTimezoneOffset(site: string): number {
    const siteUpper = (site || '').toUpperCase()
    if (siteUpper === 'PTB' || siteUpper === 'PVN') {
        return 8 // UTC+8
    } else if (siteUpper === 'PSZ' || siteUpper === 'PTY') {
        return 8 // UTC+8
    }
    // Default to UTC+8 for unknown sites
    return 8
}

/**
 * Format time for download_attachment API (ISN Search data)
 */
function formatTimeForDownloadWithTimezone(timeStr: string, site: string): string {
    if (!timeStr) return ''

    // Clean the time string: remove %:z suffix
    const cleanedTime = timeStr.replace('%:z', '').replace('T', ' ')

    // Parse as UTC
    const utcDate = new Date(cleanedTime.replace(' ', 'T') + 'Z')

    // Get timezone offset based on site
    const offsetHours = getSiteTimezoneOffset(site)

    // Add timezone offset
    const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000)

    // Format as YYYY/MM/DD HH:mm:ss
    const year = localDate.getUTCFullYear()
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(localDate.getUTCDate()).padStart(2, '0')
    const hours = String(localDate.getUTCHours()).padStart(2, '0')
    const minutes = String(localDate.getUTCMinutes()).padStart(2, '0')
    const seconds = String(localDate.getUTCSeconds()).padStart(2, '0')

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

// Group data by ISN
function groupDataByISN(data: IsnSearchData[]): ISNGroup[] {
    const isnMap: Record<string, ISNGroup> = {}

    for (const record of data) {
        const isn = record.isn

        if (!isnMap[isn]) {
            isnMap[isn] = {
                isn,
                site: record.site || '-',
                project: record.project || '-',
                hasError: false,
                errorCount: 0,
                records: [],
                stations: []
            }
        }

        isnMap[isn].records.push(record)

        // Check for errors
        const hasError = record.error_code !== 'PASS'
        if (hasError) {
            isnMap[isn].hasError = true
            isnMap[isn].errorCount++
        }
    }

    // Group records by station within each ISN
    for (const isnGroup of Object.values(isnMap)) {
        const stationMap: Record<string, StationGroup> = {}

        for (const record of isnGroup.records) {
            const stationName = record.station_name

            if (!stationMap[stationName]) {
                stationMap[stationName] = {
                    stationName,
                    displayName: record.display_station_name || stationName,
                    hasError: false,
                    errorCount: 0,
                    records: []
                }
            }

            stationMap[stationName].records.push(record)

            const hasError = record.error_code !== 'PASS'
            if (hasError) {
                stationMap[stationName].hasError = true
                stationMap[stationName].errorCount++
            }
        }

        isnGroup.stations = Object.values(stationMap)

        // Sort stations by name
        isnGroup.stations.sort((a, b) => {
            return a.stationName.localeCompare(b.stationName)
        })

        // Sort records within each station by test_end_time descending
        for (const station of isnGroup.stations) {
            station.records.sort((a, b) => {
                const timeA = new Date(a.test_end_time).getTime()
                const timeB = new Date(b.test_end_time).getTime()
                return timeB - timeA
            })
        }
    }

    return Object.values(isnMap)
}

// Clear all data
function clearAll(): void {
    searchIsn.value = ''
    selectedISNs.value = []
    groupedByISN.value = []
    hasSearched.value = false
    clearIsnSearchData()
}

// Handle search
async function handleSearch(): Promise<void> {
    // Get list of ISNs based on input mode
    let isnList: string[] = []

    if (inputMode.value === 'single') {
        if (!searchIsn.value?.trim()) return
        isnList = [searchIsn.value.trim()]
    } else if (inputMode.value === 'multiple') {
        if (!selectedISNs.value || selectedISNs.value.length === 0) return
        isnList = selectedISNs.value.map(s => s.trim()).filter(Boolean)
    } else if (inputMode.value === 'bulk') {
        if (!searchIsn.value?.trim()) return
        // Parse bulk input: split by newlines, commas, or spaces
        isnList = searchIsn.value
            .split(/[\n,\s]+/)
            .map(s => s.trim())
            .filter(Boolean)
    }

    if (isnList.length === 0) return

    hasSearched.value = true
    groupedByISN.value = []
    // Clear scores when performing new search
    recordScores.value = {}

    try {
        const allRecords: any[] = []

        // Use batch search for multiple ISNs (significantly faster)
        if (isnList.length > 1) {
            const resultMap = await searchByIsnBatch(isnList)
            for (const [_isn, records] of resultMap) {
                allRecords.push(...records)
            }
        } else {
            // Single ISN - use regular search
            const data = await searchByIsn(isnList[0]!)
            allRecords.push(...data)
        }

        groupedByISN.value = groupDataByISN(allRecords)
    } catch (err) {
        console.error('Search failed:', err)
    }
}
</script>

<style scoped>
.gap-2 {
    gap: 0.5rem;
}
</style>
