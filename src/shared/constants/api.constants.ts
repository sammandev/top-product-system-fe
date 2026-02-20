/**
 * API Constants
 * HTTP methods, status codes, headers, and API-related constants
 */

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    EXTERNAL_LOGIN: '/api/auth/external-login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },

  // Users
  USERS: {
    BASE: '/api/users',
    BY_ID: (id: number) => `/api/users/${id}`,
    PROFILE: '/api/users/profile',
    CHANGE_PASSWORD: '/api/users/change-password',
  },

  // DUT Management
  DUT: {
    SITES: '/api/dut/sites',
    SITE_BY_ID: (id: number) => `/api/dut/sites/${id}`,
    MODELS: (siteId: number) => `/api/dut/sites/${siteId}/models`,
    STATIONS: (modelId: number) => `/api/dut/models/${modelId}/stations`,
    TOP_PRODUCTS: (stationId: number) => `/api/dut/stations/${stationId}/top-products`,
    RECORDS: (stationId: number, dutId: string) => `/api/dut/records/${stationId}/${dutId}`,
    HISTORY: {
      ISNS: '/api/dut/history/isns',
      IDENTIFIERS: '/api/dut/history/identifiers',
      PROGRESSION: '/api/dut/history/progression',
      RESULTS: '/api/dut/history/results',
    },
    SUMMARY: '/api/dut/summary',
  },

  // File Parsing
  PARSING: {
    UPLOAD_PREVIEW: '/api/upload-preview',
    PARSE: '/api/parse',
    PARSE_DOWNLOAD: '/api/parse-download',
  },

  // File Comparison
  COMPARISON: {
    COMPARE: '/api/compare',
    COMPARE_DOWNLOAD: '/api/compare-download',
  },

  // Analysis
  ANALYSIS: {
    MULTI_DUT: '/api/analyze-multi-dut',
    DOWNLOAD: '/api/analysis/download',
  },
} as const

// Request Headers
export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  AUTHORIZATION: 'Authorization',
  ACCEPT: 'Accept',
  X_REQUESTED_WITH: 'X-Requested-With',
} as const

// Content Types
export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_DATA: 'multipart/form-data',
  URL_ENCODED: 'application/x-www-form-urlencoded',
  TEXT: 'text/plain',
  HTML: 'text/html',
  XML: 'application/xml',
  CSV: 'text/csv',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

// API Response Types
export const RESPONSE_TYPES = {
  JSON: 'json',
  BLOB: 'blob',
  TEXT: 'text',
  ARRAY_BUFFER: 'arraybuffer',
} as const
