/**
 * Dashboard API Service
 */

import type { AxiosInstance } from 'axios'
import apiClient from '@/core/api/client'

export interface DashboardStatistics {
    total_top_products: number
    total_unique_duts: number
    total_unique_projects: number
    recent_analyses: number
    avg_score: number | null
    total_pass: number
    total_fail: number
}

export interface RecentActivity {
    title: string
    description: string
    timestamp: string
    activity_type: string
    dut_isn: string | null
    station_name: string | null
}

export interface SystemStatus {
    cache_status: string
    cache_enabled: boolean
    cache_total_keys: number | null
    cache_hits: number | null
    cache_misses: number | null
    cache_hit_rate: number | null
    cache_memory_mb: number | null
    database_status: string
    database_records: number
    total_users: number
    active_users: number
    api_version: string
    uptime_hours: number | null
}export interface DashboardResponse {
    statistics: DashboardStatistics
    recent_activities: RecentActivity[]
    system_status: SystemStatus
}

export interface UploadStats {
    upload_dir_exists: boolean
    total_files: number
    total_size_mb: number
    recent_uploads: number
}

class DashboardApi {
    private client: AxiosInstance

    constructor(client: AxiosInstance) {
        this.client = client
    }

    /**
     * Get dashboard statistics and data
     */
    async getStats(): Promise<DashboardResponse> {
        const response = await this.client.get<DashboardResponse>('/api/dashboard/stats')
        return response.data
    }

    /**
     * Get upload directory statistics
     */
    async getUploadStats(): Promise<UploadStats> {
        const response = await this.client.get<UploadStats>('/api/dashboard/uploads/stats')
        return response.data
    }
}

export const dashboardApi = new DashboardApi(apiClient)
