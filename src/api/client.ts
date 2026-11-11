import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import type { GlobalResponse, TokenResponse } from './types'
import { tokenStorage } from '@/auth/tokenStorage'

/** 비우면 같은 출처(/api)로 요청합니다. 개발 서버는 vite proxy가 백엔드로 넘깁니다. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

/** 백엔드가 돌려준 /uploads/... 같은 상대 경로를 이미지 src로 쓸 수 있게 만듭니다. */
export function resolveAssetUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export const http = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // Spring은 status=A&status=B 형태로 List를 받습니다.
  paramsSerializer: { indexes: null },
})

http.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

// ---------- 토큰 재발급 ----------
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return null
  try {
    const res = await axios.post<GlobalResponse<TokenResponse>>(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken })
    if (!res.data.success) return null
    tokenStorage.save(res.data.data)
    return res.data.data.accessToken
  } catch {
    return null
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh']

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<GlobalResponse<unknown>>) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const isAuthCall = AUTH_PATHS.some((p) => config?.url?.startsWith(p))

    if (status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null
      })
      const token = await refreshing
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`)
        return http(config)
      }
      tokenStorage.clear()
      window.dispatchEvent(new Event('nubi:logout'))
    }

    const body = error.response?.data
    // 토큰은 살아 있지만 계정이 지워진 경우: 로그인된 척 남지 않게 바로 로그아웃합니다.
    if (body?.error?.code === 'MEMBER_NOT_FOUND' && !isAuthCall && tokenStorage.getAccessToken()) {
      tokenStorage.clear()
      window.dispatchEvent(new Event('nubi:logout'))
    }
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      throw new ApiError(body.error.code, body.error.message, status ?? 0)
    }
    throw new ApiError('NETWORK_ERROR', '서버에 연결할 수 없어요. 잠시 뒤 다시 시도해 주세요.', status ?? 0)
  },
)

/** GlobalResponse를 벗겨 data만 돌려줍니다. */
async function unwrap<T>(promise: Promise<{ data: GlobalResponse<T> }>): Promise<T> {
  const res = await promise
  if (!res.data.success) {
    const err = res.data.error
    throw new ApiError(err?.code ?? 'UNKNOWN', err?.message ?? '요청을 처리하지 못했어요.', 200)
  }
  return res.data.data
}

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.post(url, body, config)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.put(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => unwrap<T>(http.patch(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(http.delete(url, config)),
}

/** 에러를 화면에 보여줄 문장으로 바꿉니다. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return '알 수 없는 오류가 발생했어요.'
}
