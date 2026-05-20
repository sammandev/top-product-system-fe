import { keepPreviousData, type QueryClient, useQuery } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { computed, toValue } from 'vue'
import { queryClient } from '@/app/providers/query-client'
import { queryKeys } from '@/core/query'
import {
  type CompactCsvTestItemData,
  type CsvTestItemData,
  type IplasCsvTestItemRequest,
  type IplasCsvTestItemResponse,
  type IplasIsnSearchRequest,
  type IplasIsnSearchResponse,
  type IplasIsnSearchBatchRequest,
  type IplasIsnSearchBatchResponse,
  type IplasStation,
  type IplasStationSearchRunCreateRequest,
  type IplasStationSearchRunRecordsRequest,
  type IplasStationSearchRunRecordsResponse,
  type IplasStationSearchRunResponse,
  type IplasStationsFromIsnRequest,
  type IplasStationsFromIsnResponse,
  type IplasStationsFromIsnBatchRequest,
  type IplasStationsFromIsnBatchResponse,
  iplasProxyApi,
  type RecordTestItemsRequest,
  type SiteProject,
  type TestItem,
} from '../api/iplasProxyApi'
import type { PaginatedResult, PaginationOptions } from './useIplasApi'

const SITE_PROJECT_STALE_TIME = 24 * 60 * 60 * 1000
const STATION_STALE_TIME = 60 * 60 * 1000
const DEVICE_STALE_TIME = 5 * 60 * 1000
const CSV_TEST_ITEMS_STALE_TIME = 2 * 60 * 1000
const ISN_SEARCH_STALE_TIME = 5 * 60 * 1000
const RECORD_TEST_ITEMS_STALE_TIME = 10 * 60 * 1000
const PAGINATED_TEST_ITEMS_STALE_TIME = 30 * 1000

export interface IplasStationsQueryParams {
  site: string
  project: string
  token?: string
}

export interface IplasDevicesQueryParams extends IplasStationsQueryParams {
  station: string
  startTime: string | Date
  endTime: string | Date
}

export interface IplasPaginatedTestItemsQueryParams extends IplasDevicesQueryParams {
  deviceId: string
  testStatus?: 'ALL' | 'PASS' | 'FAIL'
  options?: PaginationOptions
}

export interface IplasStationSearchRunRecordsQueryParams {
  runId: string
  station?: string | null
  deviceIds?: string[]
  testStatus?: 'ALL' | 'PASS' | 'FAIL'
  search?: string | null
  options?: PaginationOptions
}

function formatQueryDate(value: string | Date): string {
  return iplasProxyApi.formatDateForRequest(value)
}

function normalizeDeviceParams(params: IplasDevicesQueryParams) {
  return {
    site: params.site,
    project: params.project,
    station: params.station,
    startTime: formatQueryDate(params.startTime),
    endTime: formatQueryDate(params.endTime),
    token: params.token,
  }
}

function normalizePaginatedParams(params: IplasPaginatedTestItemsQueryParams) {
  return {
    ...normalizeDeviceParams(params),
    deviceId: params.deviceId,
    testStatus: params.testStatus ?? 'ALL',
    page: params.options?.page ?? 1,
    itemsPerPage: params.options?.itemsPerPage ?? 25,
    sortBy: params.options?.sortBy ?? 'TestStartTime',
    sortDesc: params.options?.sortDesc ?? true,
  }
}

function normalizeCsvTestItemsRequest(request: IplasCsvTestItemRequest) {
  return {
    site: request.site,
    project: request.project,
    station: request.station,
    device_id: request.device_id,
    begin_time: request.begin_time,
    end_time: request.end_time,
    test_status: request.test_status,
    test_item_filters: request.test_item_filters ?? [],
    exclude_test_item_filters: request.exclude_test_item_filters ?? [],
    include_test_items: request.include_test_items ?? false,
    limit: request.limit ?? null,
    offset: request.offset ?? null,
    sort_by: request.sort_by ?? null,
    sort_desc: request.sort_desc ?? true,
    token: request.token,
  }
}

function normalizeIsnSearchBatchRequest(request: IplasIsnSearchBatchRequest) {
  return {
    isns: [...request.isns].sort(),
    token: request.token,
  }
}

function normalizeIsnSearchRequest(request: IplasIsnSearchRequest) {
  return {
    isn: request.isn,
    token: request.token,
  }
}

function normalizeStationsFromIsnRequest(request: IplasStationsFromIsnRequest) {
  return {
    isn: request.isn,
    token: request.token,
  }
}

function normalizeStationsFromIsnBatchRequest(request: IplasStationsFromIsnBatchRequest) {
  return {
    isns: [...request.isns].sort(),
    token: request.token,
  }
}

function normalizeRecordTestItemsParams(params: RecordTestItemsRequest) {
  return {
    site: params.site,
    project: params.project,
    station: params.station,
    isn: params.isn,
    testStartTime: params.test_start_time,
    deviceId: params.device_id ?? 'ALL',
    testStatus: params.test_status ?? 'ALL',
    token: params.token,
  }
}

function normalizeStationSearchRunRecordsParams(params: IplasStationSearchRunRecordsQueryParams) {
  return {
    runId: params.runId,
    station: params.station ?? null,
    deviceIds: params.deviceIds ?? [],
    testStatus: params.testStatus ?? 'ALL',
    search: params.search ?? null,
    page: params.options?.page ?? 1,
    itemsPerPage: params.options?.itemsPerPage ?? 25,
    sortBy: params.options?.sortBy ?? 'TestStartTime',
    sortDesc: params.options?.sortDesc ?? true,
  }
}

function sortStations(stations: IplasStation[]): IplasStation[] {
  return [...stations].sort((a, b) => {
    const aOrder = a.order ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.order ?? Number.MAX_SAFE_INTEGER
    return aOrder - bOrder
  })
}

async function refreshQuery(
  client: QueryClient,
  queryKey: readonly unknown[],
  forceRefresh: boolean,
) {
  if (forceRefresh) {
    await client.invalidateQueries({ queryKey })
  }
}

export async function fetchIplasSiteProjectsQuery(
  forceRefresh = false,
  client = queryClient,
): Promise<SiteProject[]> {
  const queryKey = queryKeys.iplas.siteProjects()
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: async () => {
      const response = await iplasProxyApi.getSiteProjects('simple', forceRefresh)
      return response.data
    },
    staleTime: SITE_PROJECT_STALE_TIME,
  })
}

export async function fetchIplasStationsQuery(
  params: IplasStationsQueryParams,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasStation[]> {
  const queryKey = queryKeys.iplas.stations(params.site, params.project)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: async () => {
      const response = await iplasProxyApi.getStations({
        site: params.site,
        project: params.project,
        token: params.token,
      })
      return sortStations(
        response.data.map((station) => ({
          display_station_name: station.display_station_name,
          station_name: station.station_name,
          order: station.order,
          data_source: station.data_source,
        })),
      )
    },
    staleTime: STATION_STALE_TIME,
  })
}

export async function fetchIplasDevicesQuery(
  params: IplasDevicesQueryParams,
  forceRefresh = false,
  client = queryClient,
): Promise<string[]> {
  const normalizedParams = normalizeDeviceParams(params)
  const queryKey = queryKeys.iplas.devices(normalizedParams)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: async () => {
      const response = await iplasProxyApi.getDevices(
        {
          site: normalizedParams.site,
          project: normalizedParams.project,
          station: normalizedParams.station,
          start_time: normalizedParams.startTime,
          end_time: normalizedParams.endTime,
          token: normalizedParams.token,
        },
        { cancelPrevious: false },
      )
      return response.data
    },
    staleTime: DEVICE_STALE_TIME,
  })
}

export async function fetchIplasCsvTestItemsQuery<
  TRecord extends CsvTestItemData | CompactCsvTestItemData = CsvTestItemData,
>(
  request: IplasCsvTestItemRequest,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasCsvTestItemResponse<TRecord>> {
  const normalizedRequest = normalizeCsvTestItemsRequest(request)
  const queryKey = queryKeys.iplas.csvTestItems(normalizedRequest)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => iplasProxyApi.getCsvTestItems<TRecord>(request),
    staleTime: CSV_TEST_ITEMS_STALE_TIME,
  })
}

export async function fetchIplasIsnSearchBatchQuery(
  request: IplasIsnSearchBatchRequest,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasIsnSearchBatchResponse> {
  const normalizedRequest = normalizeIsnSearchBatchRequest(request)
  const queryKey = queryKeys.iplas.isnSearchBatch(normalizedRequest)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => iplasProxyApi.searchByIsnBatch(request),
    staleTime: ISN_SEARCH_STALE_TIME,
  })
}

export async function fetchIplasIsnSearchQuery(
  request: IplasIsnSearchRequest,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasIsnSearchResponse> {
  const normalizedRequest = normalizeIsnSearchRequest(request)
  const queryKey = queryKeys.iplas.isnSearch(normalizedRequest)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => iplasProxyApi.searchByIsn(request),
    staleTime: ISN_SEARCH_STALE_TIME,
  })
}

export async function fetchIplasStationsFromIsnBatchQuery(
  request: IplasStationsFromIsnBatchRequest,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasStationsFromIsnBatchResponse> {
  const normalizedRequest = normalizeStationsFromIsnBatchRequest(request)
  const queryKey = queryKeys.iplas.stationsFromIsnBatch(normalizedRequest)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => iplasProxyApi.getStationsFromIsnBatch(request),
    staleTime: STATION_STALE_TIME,
  })
}

export async function fetchIplasStationsFromIsnQuery(
  request: IplasStationsFromIsnRequest,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasStationsFromIsnResponse> {
  const normalizedRequest = normalizeStationsFromIsnRequest(request)
  const queryKey = queryKeys.iplas.stationsFromIsn(normalizedRequest)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => iplasProxyApi.getStationsFromIsn(request),
    staleTime: STATION_STALE_TIME,
  })
}

export async function fetchIplasRecordTestItemsQuery(
  params: RecordTestItemsRequest,
  forceRefresh = false,
  client = queryClient,
): Promise<TestItem[]> {
  const normalizedParams = normalizeRecordTestItemsParams(params)
  const queryKey = queryKeys.iplas.recordTestItems(normalizedParams)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: async () => {
      const response = await iplasProxyApi.getRecordTestItems(params)
      return response.test_items
    },
    staleTime: RECORD_TEST_ITEMS_STALE_TIME,
  })
}

export async function createIplasStationSearchRun(
  request: IplasStationSearchRunCreateRequest,
): Promise<IplasStationSearchRunResponse> {
  return iplasProxyApi.createStationSearchRun(request)
}

export async function fetchIplasStationSearchRunQuery(
  runId: string,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasStationSearchRunResponse> {
  const queryKey = queryKeys.iplas.stationSearchRun(runId)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => iplasProxyApi.getStationSearchRun(runId),
    staleTime: 0,
  })
}

export async function fetchIplasStationSearchRunRecordsQuery(
  params: IplasStationSearchRunRecordsQueryParams,
  forceRefresh = false,
  client = queryClient,
): Promise<IplasStationSearchRunRecordsResponse> {
  const normalizedParams = normalizeStationSearchRunRecordsParams(params)
  const queryKey = queryKeys.iplas.stationSearchRunRecords(normalizedParams.runId, normalizedParams)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: () => {
      const offset = (normalizedParams.page - 1) * normalizedParams.itemsPerPage
      const request: IplasStationSearchRunRecordsRequest = {
        station: normalizedParams.station,
        device_ids: normalizedParams.deviceIds,
        test_status: normalizedParams.testStatus,
        search: normalizedParams.search,
        limit: normalizedParams.itemsPerPage,
        offset,
        sort_by: normalizedParams.sortBy,
        sort_desc: normalizedParams.sortDesc,
      }
      return iplasProxyApi.getStationSearchRunRecords(normalizedParams.runId, request)
    },
    staleTime: PAGINATED_TEST_ITEMS_STALE_TIME,
  })
}

export async function fetchIplasPaginatedTestItemsQuery(
  params: IplasPaginatedTestItemsQueryParams,
  forceRefresh = false,
  client = queryClient,
): Promise<PaginatedResult<CompactCsvTestItemData>> {
  const normalizedParams = normalizePaginatedParams(params)
  const queryKey = queryKeys.iplas.paginatedTestItems(normalizedParams)
  await refreshQuery(client, queryKey, forceRefresh)

  return client.fetchQuery({
    queryKey,
    queryFn: async () => {
      const offset = (normalizedParams.page - 1) * normalizedParams.itemsPerPage
      const response = await iplasProxyApi.getCsvTestItemsCompact({
        site: normalizedParams.site,
        project: normalizedParams.project,
        station: normalizedParams.station,
        device_id: normalizedParams.deviceId,
        begin_time: normalizedParams.startTime,
        end_time: normalizedParams.endTime,
        test_status: normalizedParams.testStatus,
        limit: normalizedParams.itemsPerPage,
        offset,
        sort_by: normalizedParams.sortBy,
        sort_desc: normalizedParams.sortDesc,
        token: normalizedParams.token,
      })

      const progress =
        response.chunks_fetched && response.total_chunks
          ? {
              fetched: response.chunks_fetched,
              total: response.total_chunks,
            }
          : null

      return {
        items: response.data,
        totalItems: response.total_records,
        page: normalizedParams.page,
        itemsPerPage: normalizedParams.itemsPerPage,
        possiblyTruncated: response.possibly_truncated ?? false,
        chunkProgress: progress,
      }
    },
    staleTime: PAGINATED_TEST_ITEMS_STALE_TIME,
  })
}

export function useIplasSiteProjectsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  return useQuery({
    queryKey: queryKeys.iplas.siteProjects(),
    queryFn: () => fetchIplasSiteProjectsQuery(),
    enabled,
    staleTime: SITE_PROJECT_STALE_TIME,
  })
}

export function useIplasStationsQuery(params: MaybeRefOrGetter<IplasStationsQueryParams | null>) {
  const queryKey = computed(() => {
    const value = toValue(params)
    return value
      ? queryKeys.iplas.stations(value.site, value.project)
      : queryKeys.iplas.stations('', '')
  })

  return useQuery({
    queryKey,
    queryFn: () => {
      const value = toValue(params)
      if (!value) throw new Error('Missing iPLAS station query params')
      return fetchIplasStationsQuery(value)
    },
    enabled: computed(() => Boolean(toValue(params))),
    placeholderData: keepPreviousData,
    staleTime: STATION_STALE_TIME,
  })
}
