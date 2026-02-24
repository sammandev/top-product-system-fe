import { apiClient } from '@/core/api'
import type {
  AppConfig,
  AppConfigUpdateRequest,
  GuestCredential,
  GuestCredentialCreateRequest,
  GuestCredentialListResponse,
  GuestCredentialUpdateRequest,
  IplasToken,
  IplasTokenCreateRequest,
  IplasTokenListResponse,
  IplasTokenUpdateRequest,
  SfistspConfigCreateRequest,
  SfistspConfigItem,
  SfistspConfigListResponse,
  SfistspConfigUpdateRequest,
} from '@/core/types'

const BASE = '/api/app-config'

export const appConfigApi = {
  // ===== General Config =====
  async get(): Promise<AppConfig> {
    const { data } = await apiClient.get<AppConfig>(BASE)
    return data
  },

  async update(payload: AppConfigUpdateRequest): Promise<AppConfig> {
    const { data } = await apiClient.put<AppConfig>(BASE, payload)
    return data
  },

  async uploadFavicon(file: File): Promise<AppConfig> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<AppConfig>(`${BASE}/favicon`, formData)
    return data
  },

  async deleteFavicon(): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`${BASE}/favicon`)
    return data
  },

  // ===== iPLAS Tokens =====
  async getIplasTokens(): Promise<IplasTokenListResponse> {
    const { data } = await apiClient.get<IplasTokenListResponse>(`${BASE}/iplas-tokens`)
    return data
  },

  async createIplasToken(payload: IplasTokenCreateRequest): Promise<IplasToken> {
    const { data } = await apiClient.post<IplasToken>(`${BASE}/iplas-tokens`, payload)
    return data
  },

  async updateIplasToken(id: number, payload: IplasTokenUpdateRequest): Promise<IplasToken> {
    const { data } = await apiClient.put<IplasToken>(`${BASE}/iplas-tokens/${id}`, payload)
    return data
  },

  async deleteIplasToken(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`${BASE}/iplas-tokens/${id}`)
    return data
  },

  async activateIplasToken(id: number): Promise<IplasToken> {
    const { data } = await apiClient.post<IplasToken>(`${BASE}/iplas-tokens/${id}/activate`)
    return data
  },

  // ===== SFISTSP Config =====
  async getSfistspConfigs(): Promise<SfistspConfigListResponse> {
    const { data } = await apiClient.get<SfistspConfigListResponse>(`${BASE}/sfistsp`)
    return data
  },

  async createSfistspConfig(payload: SfistspConfigCreateRequest): Promise<SfistspConfigItem> {
    const { data } = await apiClient.post<SfistspConfigItem>(`${BASE}/sfistsp`, payload)
    return data
  },

  async updateSfistspConfig(
    id: number,
    payload: SfistspConfigUpdateRequest,
  ): Promise<SfistspConfigItem> {
    const { data } = await apiClient.put<SfistspConfigItem>(`${BASE}/sfistsp/${id}`, payload)
    return data
  },

  async deleteSfistspConfig(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(`${BASE}/sfistsp/${id}`)
    return data
  },

  async activateSfistspConfig(id: number): Promise<SfistspConfigItem> {
    const { data } = await apiClient.post<SfistspConfigItem>(`${BASE}/sfistsp/${id}/activate`)
    return data
  },

  // ===== Guest Credentials =====
  async getGuestCredentials(): Promise<GuestCredentialListResponse> {
    const { data } = await apiClient.get<GuestCredentialListResponse>(
      `${BASE}/guest-credentials`,
    )
    return data
  },

  async createGuestCredential(payload: GuestCredentialCreateRequest): Promise<GuestCredential> {
    const { data } = await apiClient.post<GuestCredential>(
      `${BASE}/guest-credentials`,
      payload,
    )
    return data
  },

  async updateGuestCredential(
    id: number,
    payload: GuestCredentialUpdateRequest,
  ): Promise<GuestCredential> {
    const { data } = await apiClient.put<GuestCredential>(
      `${BASE}/guest-credentials/${id}`,
      payload,
    )
    return data
  },

  async deleteGuestCredential(id: number): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(
      `${BASE}/guest-credentials/${id}`,
    )
    return data
  },

  async activateGuestCredential(id: number): Promise<GuestCredential> {
    const { data } = await apiClient.post<GuestCredential>(
      `${BASE}/guest-credentials/${id}/activate`,
    )
    return data
  },
}
