import type { MemberRole, TokenResponse } from '@/api/types'

const KEY = 'nubi.auth'

export interface StoredAuth {
  accessToken: string
  refreshToken: string
  memberId: number
  email: string
  role: MemberRole
  organizationId: number
  organizationName: string
}

function read(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

export const tokenStorage = {
  get: read,
  getAccessToken: () => read()?.accessToken ?? null,
  getRefreshToken: () => read()?.refreshToken ?? null,
  save(token: TokenResponse) {
    try {
      localStorage.setItem(KEY, JSON.stringify(token))
    } catch {
      /* 저장소를 못 쓰는 환경 */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* noop */
    }
  },
}
