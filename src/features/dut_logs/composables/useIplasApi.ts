/**
 * iPLAS API Composable
 * 
 * Provides reactive state and methods for interacting with iPLAS v1/v2 APIs
 */

import { ref, computed } from 'vue'
import {
  iplasV1Api,
  iplasV2Api,
  type SiteProject,
  type Station,
  type DownloadAttachmentInfo,
  type CsvTestItemData,
  type IsnSearchData
} from '../api/iplasApi'

// Module-level cache for metadata (rarely changes)
let cachedSiteProjects: SiteProject[] | null = null
const cachedStations: Map<string, Station[]> = new Map()
const CACHE_KEY_SEPARATOR = '::'

/**
 * Composable for iPLAS API operations
 */
export function useIplasApi() {
  // Loading states
  const loading = ref(false)
  const loadingStations = ref(false)
  const loadingDevices = ref(false)
  const loadingTestItems = ref(false)
  const loadingIsnSearch = ref(false)
  const downloading = ref(false)

  // Error state
  const error = ref<string | null>(null)

  // Data states
  const siteProjects = ref<SiteProject[]>([])
  const stations = ref<Station[]>([])
  const deviceIds = ref<string[]>([])
  const testItemData = ref<CsvTestItemData[]>([])
  const isnSearchData = ref<IsnSearchData[]>([])

  // Computed
  const uniqueSites = computed(() => {
    const sites = new Set(siteProjects.value.map(sp => sp.site))
    return Array.from(sites).sort()
  })

  const projectsBySite = computed(() => {
    const map: Record<string, string[]> = {}
    for (const sp of siteProjects.value) {
      if (!map[sp.site]) {
        map[sp.site] = []
      }
      map[sp.site]!.push(sp.project)
    }
    // Sort projects within each site
    for (const site of Object.keys(map)) {
      map[site]!.sort()
    }
    return map
  })

  /**
   * Verify token access for a site/project
   */
  async function verifyAccess(site: string, project: string): Promise<boolean> {
    try {
      const response = await iplasV2Api.verify(site, project)
      return response.message === 'success'
    } catch (err) {
      console.error('Access verification failed:', err)
      return false
    }
  }

  /**
   * Fetch site and project list (uses cache)
   */
  async function fetchSiteProjects(forceRefresh = false): Promise<SiteProject[]> {
    if (!forceRefresh && cachedSiteProjects) {
      siteProjects.value = cachedSiteProjects
      return cachedSiteProjects
    }

    loading.value = true
    error.value = null

    try {
      const data = await iplasV2Api.getSiteProjectList('simple')
      cachedSiteProjects = data
      siteProjects.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch site/project list'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch stations for a project (uses cache)
   */
  async function fetchStations(
    site: string,
    project: string,
    forceRefresh = false
  ): Promise<Station[]> {
    const cacheKey = `${site}${CACHE_KEY_SEPARATOR}${project}`
    
    if (!forceRefresh && cachedStations.has(cacheKey)) {
      stations.value = cachedStations.get(cacheKey)!
      return stations.value
    }

    loadingStations.value = true
    error.value = null

    try {
      const data = await iplasV2Api.getStationList(site, project)
      cachedStations.set(cacheKey, data)
      stations.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch station list'
      throw err
    } finally {
      loadingStations.value = false
    }
  }

  /**
   * Fetch device IDs for a station within a time range
   */
  async function fetchDeviceIds(
    site: string,
    project: string,
    displayStationName: string,
    startTime: string | Date,
    endTime: string | Date
  ): Promise<string[]> {
    loadingDevices.value = true
    error.value = null

    try {
      // Convert Date objects to ISO string if needed
      const start = startTime instanceof Date ? startTime.toISOString() : startTime
      const end = endTime instanceof Date ? endTime.toISOString() : endTime

      const data = await iplasV2Api.getDeviceIdList(
        site,
        project,
        displayStationName,
        start,
        end
      )
      deviceIds.value = data
      return data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch device IDs'
      throw err
    } finally {
      loadingDevices.value = false
    }
  }

  /**
   * Get CSV test items for a device
   * Appends to existing testItemData instead of replacing
   */
  async function fetchTestItems(
    site: string,
    project: string,
    station: string,
    deviceid: string,
    begintime: string,
    endtime: string,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL'
  ): Promise<CsvTestItemData[]> {
    loadingTestItems.value = true
    error.value = null

    try {
      const response = await iplasV1Api.getCsvTestItems(site, project, {
        station,
        deviceid,
        test_status: testStatus,
        begintime,
        endtime
      })

      if (response.statuscode !== 200) {
        throw new Error(`API returned status ${response.statuscode}`)
      }

      // Append to existing data instead of replacing
      testItemData.value = [...testItemData.value, ...response.data]
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  /**
   * Search DUT test data by ISN
   * Returns data from all stations that tested the same ISN
   */
  async function searchByIsn(isn: string): Promise<IsnSearchData[]> {
    loadingIsnSearch.value = true
    error.value = null

    try {
      const response = await iplasV2Api.searchByIsn(isn)

      if (response.status_code !== 200) {
        throw new Error(`API returned status ${response.status_code}`)
      }

      isnSearchData.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to search by ISN'
      throw err
    } finally {
      loadingIsnSearch.value = false
    }
  }

  /**
   * Clear ISN search data
   */
  function clearIsnSearchData(): void {
    isnSearchData.value = []
  }

  /**
   * Download test log attachments
   */
  async function downloadAttachments(
    site: string,
    project: string,
    attachments: DownloadAttachmentInfo[]
  ): Promise<void> {
    downloading.value = true
    error.value = null

    try {
      const response = await iplasV1Api.downloadAttachment(site, project, attachments)

      if (response.statuscode !== 200) {
        throw new Error(`API returned status ${response.statuscode}`)
      }

      // Generate filename if not provided
      const filename = response.data.filename || 
        (attachments.length === 1 && attachments[0]
          ? `${attachments[0].isn}_${attachments[0].time.replace(/[\/:]/g, '_')}.zip`
          : `test_logs_${new Date().toISOString().slice(0, 10)}.zip`)

      // Trigger download
      iplasV1Api.downloadBase64File(response.data.content, filename)
    } catch (err: any) {
      error.value = err.message || 'Failed to download attachments'
      throw err
    } finally {
      downloading.value = false
    }
  }

  /**
   * Format date for iPLAS v1 API (YYYY/MM/DD HH:mm:ss)
   */
  function formatDateForV1Api(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
  }

  /**
   * Clear test item data (useful before fetching multiple devices)
   */
  function clearTestItemData(): void {
    testItemData.value = []
  }

  /**
   * Clear all cached data
   */
  function clearCache(): void {
    cachedSiteProjects = null
    cachedStations.clear()
    siteProjects.value = []
    stations.value = []
    deviceIds.value = []
    testItemData.value = []
    isnSearchData.value = []
  }

  return {
    // Loading states
    loading,
    loadingStations,
    loadingDevices,
    loadingTestItems,
    loadingIsnSearch,
    downloading,

    // Error state
    error,

    // Data
    siteProjects,
    stations,
    deviceIds,
    testItemData,
    isnSearchData,

    // Computed
    uniqueSites,
    projectsBySite,

    // Methods
    verifyAccess,
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,
    fetchTestItems,
    searchByIsn,
    downloadAttachments,
    formatDateForV1Api,
    clearTestItemData,
    clearIsnSearchData,
    clearCache
  }
}
