import apiClient from '@/core/api/client';

// ===== Interfaces =====

export interface TopProductMeasurement {
  id: number;
  test_item: string;
  usl: number | null;
  lsl: number | null;
  target_value: number | null;
  actual_value: number | null;
  deviation: number | null;
}

export interface TopProductItem {
  id: number;
  dut_isn: string;
  dut_id: number | null;
  site_name: string | null;
  project_name: string | null;
  model_name: string | null;
  station_name: string;
  device_name: string | null;
  test_date: string | null;
  test_duration: number | null;
  pass_count: number;
  fail_count: number;
  retest_count: number;
  score: number;
  created_at: string;
  measurements_count?: number;
}

export interface TopProductDetail extends TopProductItem {
  measurements: TopProductMeasurement[];
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface TopProductListResponse {
  top_products: TopProductItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TopProductStats {
  total_products: number;
  total_unique_isns: number;
  total_projects: number;
  avg_score: number | null;
  max_score: number | null;
  min_score: number | null;
  total_pass: number;
  total_fail: number;
  recent_products_24h: number;
  recent_products_7d: number;
}

export interface TopProductListParams {
  page?: number;
  page_size?: number;
  stations?: string[];
  projects?: string[];
  dut_isn?: string;
  min_score?: number;
  sort_by?: string;
  sort_desc?: boolean;
}

export interface ProjectOption {
  value: string;
  label: string;
}

export interface StationOption {
  value: string;
  label: string;
  project: string | null;
}

// ===== Create Request Interfaces =====

export interface TopProductMeasurementCreate {
  test_item: string;
  usl: number | null;
  lsl: number | null;
  target_value: number | null;
  actual_value: number | null;
  deviation: number | null;
}

export interface TopProductCreate {
  dut_isn: string;
  dut_id?: number | null;
  site_name?: string | null;
  project_name?: string | null;
  model_name?: string | null;
  station_name: string;
  device_name?: string | null;
  test_date?: string | null;
  test_duration?: number | null;
  pass_count?: number;
  fail_count?: number;
  retest_count?: number;
  score: number;
  measurements?: TopProductMeasurementCreate[];
}

export interface TopProductBulkCreate {
  products: TopProductCreate[];
}

export interface TopProductCreateResponse {
  success: boolean;
  id: number;
  message: string;
}

export interface TopProductBulkCreateResponse {
  success: boolean;
  created_count: number;
  created_ids: number[];
  message: string;
}

// ===== API Methods =====

export async function getTopProductsList(params: TopProductListParams = {}): Promise<TopProductListResponse> {
  const response = await apiClient.get('/api/top-products/list', { params });
  return response.data;
}

export async function getTopProductDetail(productId: number): Promise<TopProductDetail> {
  const response = await apiClient.get(`/api/top-products/${productId}`);
  return response.data;
}

export async function getTopProductsStats(): Promise<TopProductStats> {
  const response = await apiClient.get('/api/top-products/stats/summary');
  return response.data;
}

export async function getUniqueProjects(): Promise<ProjectOption[]> {
  const response = await apiClient.get('/api/top-products/filters/projects');
  return response.data;
}

export async function getUniqueStations(): Promise<StationOption[]> {
  const response = await apiClient.get('/api/top-products/filters/stations');
  return response.data;
}

/**
 * Create a single top product entry
 */
export async function createTopProduct(data: TopProductCreate): Promise<TopProductCreateResponse> {
  const response = await apiClient.post('/api/top-products/create', data);
  return response.data;
}

/**
 * Create multiple top product entries in bulk
 */
export async function createTopProductsBulk(data: TopProductBulkCreate): Promise<TopProductBulkCreateResponse> {
  const response = await apiClient.post('/api/top-products/create-bulk', data);
  return response.data;
}

/**
 * Delete a top product by ID
 */
export async function deleteTopProduct(productId: number): Promise<{ message: string; id: number }> {
  const response = await apiClient.delete(`/api/top-products/${productId}`);
  return response.data;
}
