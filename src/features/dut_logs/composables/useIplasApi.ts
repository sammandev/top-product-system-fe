/**
 * iPLAS API Composable
 * 
 * Provides reactive state and methods for interacting with iPLAS APIs
 * through the backend proxy for security and performance.
 * 
 * All methods now use the backend proxy by default. Tokens are securely
 * managed on the backend with optional user override via settings.
 */

import { ref, computed } from 'vue'
import {
  iplasProxyApi,
  type SiteProject,
  type IplasStation,
  type IplasTestItemInfo,
  type IplasCsvTestItemResponse,
  type CsvTestItemData,
  type TestItem,
  type IplasIsnSearchRecord,
  type IplasDownloadAttachmentInfo
} from '../api/iplasProxyApi'
import { useIplasSettings } from './useIplasSettings'

// Re-export types for backwards compatibility
export type { SiteProject, IplasStation, CsvTestItemData, IplasIsnSearchRecord, TestItem }

// Type aliases for backwards compatibility
export type Station = IplasStation
export type DownloadAttachmentInfo = IplasDownloadAttachmentInfo
export type IsnSearchData = IplasIsnSearchRecord

// Module-level cache for metadata (rarely changes)
let cachedSiteProjects: SiteProject[] | null = null
const cachedStations: Map<string, IplasStation[]> = new Map()
const CACHE_KEY_SEPARATOR = '::'

/**
 * Composable for iPLAS API operations
 */
export function useIplasApi() {
  // Get settings for user token
  const { apiToken } = useIplasSettings()

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
   * Get user token for proxy requests (if configured)
   */
  function getUserToken(): string | undefined {
    const token = apiToken.value
    // Return undefined if token is empty (backend will use default)
    return token && token.trim() ? token : undefined
  }

  /**
   * Verify token access for a site/project via backend proxy
   */
  async function verifyAccess(site: string, project: string): Promise<boolean> {
    try {
      const response = await iplasProxyApi.verifyAccess({
        site,
        project,
        token: getUserToken()
      })
      return response.success
    } catch (err) {
      console.error('Access verification failed:', err)
      return false
    }
  }

  /**
   * Fetch site and project list via backend proxy (cached for 24 hours)
   */
  async function fetchSiteProjects(forceRefresh = false): Promise<SiteProject[]> {
    if (!forceRefresh && cachedSiteProjects) {
      siteProjects.value = cachedSiteProjects
      return cachedSiteProjects
    }

    loading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getSiteProjects('simple')
      cachedSiteProjects = response.data
      siteProjects.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch site/project list'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch stations for a project via backend proxy (cached for 1 hour)
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
      const response = await iplasProxyApi.getStations({
        site,
        project,
        token: getUserToken()
      })
      // Convert proxy response to Station type
      const stationData: Station[] = response.data.map(s => ({
        display_station_name: s.display_station_name,
        station_name: s.station_name,
        order: s.order,
        data_source: s.data_source
      }))
      cachedStations.set(cacheKey, stationData)
      stations.value = stationData
      return stationData
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch station list'
      throw err
    } finally {
      loadingStations.value = false
    }
  }

  /**
   * Fetch device IDs for a station via backend proxy (cached for 5 minutes)
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

      const response = await iplasProxyApi.getDevices({
        site,
        project,
        station: displayStationName,
        start_time: start,
        end_time: end,
        token: getUserToken()
      })
      deviceIds.value = response.data
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch device IDs'
      throw err
    } finally {
      loadingDevices.value = false
    }
  }

  /**
   * Get CSV test items for a device via backend proxy
   * Appends to existing testItemData instead of replacing
   * 
   * @param begintime - Start time (Date object or ISO string)
   * @param endtime - End time (Date object or ISO string)
   */
  async function fetchTestItems(
    site: string,
    project: string,
    station: string,
    deviceid: string,
    begintime: string | Date,
    endtime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL'
  ): Promise<CsvTestItemData[]> {
    loadingTestItems.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItems({
        site,
        project,
        station,
        device_id: deviceid,
        begin_time: iplasProxyApi.formatDateForRequest(begintime),
        end_time: iplasProxyApi.formatDateForRequest(endtime),
        test_status: testStatus,
        token: getUserToken()
      })

      // Append to existing data instead of replacing
      testItemData.value = [...testItemData.value, ...response.data]
      return response.data as CsvTestItemData[]
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
  }

  /**
   * Search DUT test data by ISN via backend proxy
   * Returns data from all stations that tested the same ISN
   */
  async function searchByIsn(isn: string): Promise<IsnSearchData[]> {
    loadingIsnSearch.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.searchByIsn({
        isn,
        token: getUserToken()
      })

      // Map proxy response to IsnSearchData format
      isnSearchData.value = response.data as unknown as IsnSearchData[]
      return isnSearchData.value
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
   * Download test log attachments via backend proxy
   */
  async function downloadAttachments(
    site: string,
    project: string,
    attachments: DownloadAttachmentInfo[]
  ): Promise<void> {
    downloading.value = true
    error.value = null

    try {
      // Convert to proxy format
      const proxyInfo: IplasDownloadAttachmentInfo[] = attachments.map(a => ({
        isn: a.isn,
        time: a.time,
        deviceid: a.deviceid,
        station: a.station
      }))

      const response = await iplasProxyApi.downloadAttachment({
        site,
        project,
        info: proxyInfo,
        token: getUserToken()
      })

      // Generate filename if not provided
      const filename = response.filename || 
        (attachments.length === 1 && attachments[0]
          ? `${attachments[0].isn}_${attachments[0].time.replace(/[\/:]/g, '_')}.zip`
          : `test_logs_${new Date().toISOString().slice(0, 10)}.zip`)

      // Trigger download
      iplasProxyApi.downloadBase64File(response.content, filename)
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

  /**
   * Fetch unique test item names via backend proxy (lightweight)
   * Returns only test item names, not full data - reduces payload significantly
   */
  async function fetchTestItemNames(
    site: string,
    project: string,
    station: string,
    deviceId: string,
    beginTime: string | Date,
    endTime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL'
  ): Promise<IplasTestItemInfo[]> {
    loading.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getTestItemNames({
        site,
        project,
        station,
        device_id: deviceId,
        begin_time: iplasProxyApi.formatDateForRequest(beginTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        test_status: testStatus,
        token: getUserToken()
      })
      return response.test_items
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch test item names'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch filtered test items via backend proxy with caching
   * Filters are applied on server-side for better performance
   */
  async function fetchTestItemsFiltered(
    site: string,
    project: string,
    station: string,
    deviceId: string,
    beginTime: string | Date,
    endTime: string | Date,
    testStatus: 'PASS' | 'FAIL' | 'ALL' = 'ALL',
    testItemFilters?: string[],
    limit?: number,
    offset?: number
  ): Promise<IplasCsvTestItemResponse> {
    loadingTestItems.value = true
    error.value = null

    try {
      const response = await iplasProxyApi.getCsvTestItems({
        site,
        project,
        station,
        device_id: deviceId,
        begin_time: iplasProxyApi.formatDateForRequest(beginTime),
        end_time: iplasProxyApi.formatDateForRequest(endTime),
        test_status: testStatus,
        test_item_filters: testItemFilters,
        limit,
        offset,
        token: getUserToken()
      })

      // Append to existing data instead of replacing
      testItemData.value = [...testItemData.value, ...response.data]
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch filtered test items'
      throw err
    } finally {
      loadingTestItems.value = false
    }
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

    // Core Methods (all use backend proxy with user token support)
    verifyAccess,
    fetchSiteProjects,
    fetchStations,
    fetchDeviceIds,
    fetchTestItems,
    fetchTestItemNames,
    fetchTestItemsFiltered,
    searchByIsn,
    downloadAttachments,

    // Utilities
    formatDateForV1Api,
    clearTestItemData,
    clearIsnSearchData,
    clearCache
  }
}
