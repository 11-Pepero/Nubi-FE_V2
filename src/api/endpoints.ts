// Nubi-BE REST API (/api/v1). 컨트롤러별로 묶었습니다.
import { api, http } from './client'
import type {
  Application,
  CarePerson,
  CarePersonCreateRequest,
  CarePersonUpdateRequest,
  CityCount,
  DirectApplicationRequest,
  DistrictDetail,
  DistrictStats,
  District,
  Eligibility,
  EligibleProgram,
  EligibleProgramParams,
  EventApplicationDetail,
  EventApplicationList,
  EventCreateRequest,
  EventDashboard,
  EventNeeds,
  EventSummary,
  Group,
  GroupRequest,
  GroupSummary,
  LoginRequest,
  Markers,
  MyApplicationCount,
  MyApplicationDetail,
  MyApplicationSummary,
  MyOrganization,
  MyOrganizationUpdateRequest,
  Notification,
  PageParams,
  PageResponse,
  PrepareApplicationRequest,
  PreparedApplication,
  PrepStatus,
  ProgramDetail,
  ProgramImage,
  ProgramSearchParams,
  ProgramStatus,
  ProgramSummary,
  ApplicationStatus,
  SignUpRequest,
  SubmittedRequest,
  SupportCategory,
  SupportCategoryGroup,
  TokenResponse,
  Venue,
  VenueFacilities,
  YearMonthString,
} from './types'

// ---------- 인증 ----------
export const authApi = {
  signUp: (body: SignUpRequest) => api.post<TokenResponse>('/auth/signup', body),
  login: (body: LoginRequest) => api.post<TokenResponse>('/auth/login', body),
  refresh: (refreshToken: string) => api.post<TokenResponse>('/auth/refresh', { refreshToken }),
  logout: () => api.post<void>('/auth/logout'),
}

// ---------- 기관 ----------
export const organizationApi = {
  me: () => api.get<MyOrganization>('/organizations/me'),
  updateMe: (body: MyOrganizationUpdateRequest) => api.patch<MyOrganization>('/organizations/me', body),
}

// ---------- 지원 관리 ----------
export const supportTagApi = {
  list: (category?: SupportCategory) =>
    api.get<SupportCategoryGroup[]>('/support-tags', { params: { category } }),
}

export const groupApi = {
  list: () => api.get<Group[]>('/groups'),
  summary: () => api.get<GroupSummary>('/groups/summary'),
  get: (groupId: number) => api.get<Group>(`/groups/${groupId}`),
  create: (body: GroupRequest) => api.post<Group>('/groups', body),
  update: (groupId: number, body: GroupRequest) => api.put<Group>(`/groups/${groupId}`, body),
  remove: (groupId: number) => api.delete<void>(`/groups/${groupId}`),
}

export const carePersonApi = {
  list: (params?: { groupId?: number; keyword?: string; category?: SupportCategory }) =>
    api.get<CarePerson[]>('/care-persons', { params }),
  get: (careId: number) => api.get<CarePerson>(`/care-persons/${careId}`),
  create: (body: CarePersonCreateRequest) => api.post<CarePerson>('/care-persons', body),
  update: (careId: number, body: CarePersonUpdateRequest) => api.put<CarePerson>(`/care-persons/${careId}`, body),
  remove: (careId: number) => api.delete<void>(`/care-persons/${careId}`),
}

// ---------- 프로그램 ----------
export const programApi = {
  search: (params: ProgramSearchParams = {}) =>
    api.get<PageResponse<ProgramSummary>>('/programs', { params }),
  cities: () => api.get<CityCount[]>('/programs/cities'),
  detail: (programId: number, groupId?: number) =>
    api.get<ProgramDetail>(`/programs/${programId}`, { params: { groupId } }),
  eligible: (params: EligibleProgramParams) =>
    api.get<PageResponse<EligibleProgram>>('/programs/eligible', { params }),
  eligibility: (programId: number, groupId: number, careIds?: number[]) =>
    api.get<Eligibility>(`/programs/${programId}/eligibility`, { params: { groupId, careIds } }),
}

export const venueApi = {
  search: (params: { keyword?: string } & PageParams = {}) =>
    api.get<PageResponse<Venue>>('/venues', { params }),
  facilities: (venueId: number) => api.get<VenueFacilities>(`/venues/${venueId}/facilities`),
}

// ---------- 행사 관리 ----------
export const eventApi = {
  create: (body: EventCreateRequest) => api.post<ProgramDetail>('/events', body),
  update: (eventId: number, body: EventCreateRequest) => api.put<ProgramDetail>(`/events/${eventId}`, body),
  close: (eventId: number) => api.patch<ProgramDetail>(`/events/${eventId}/close`),
  dashboard: () => api.get<EventDashboard>('/events/summary'),
  myEvents: (params: { status?: ProgramStatus[] } & PageParams = {}) =>
    api.get<PageResponse<EventSummary>>('/events', { params }),

  uploadImages: (eventId: number, files: File[]) => {
    const form = new FormData()
    files.forEach((file) => form.append('images', file))
    return api.post<ProgramImage[]>(`/events/${eventId}/images`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  reorderImages: (eventId: number, imageIds: number[]) =>
    api.patch<ProgramImage[]>(`/events/${eventId}/images/order`, { imageIds }),
  deleteImage: (eventId: number, imageId: number) =>
    api.delete<ProgramImage[]>(`/events/${eventId}/images/${imageId}`),

  applications: (eventId: number, params: { status?: ApplicationStatus[] } & PageParams = {}) =>
    api.get<EventApplicationList>(`/events/${eventId}/applications`, { params }),
  application: (eventId: number, applicationId: number) =>
    api.get<EventApplicationDetail>(`/events/${eventId}/applications/${applicationId}`),
  updateSupportPrep: (
    eventId: number,
    applicationId: number,
    supportId: number,
    body: { prepStatus: PrepStatus; hostNote?: string },
  ) =>
    api.patch<EventApplicationDetail>(
      `/events/${eventId}/applications/${applicationId}/supports/${supportId}`,
      body,
    ),
  reply: (eventId: number, applicationId: number, body: string) =>
    api.post<EventApplicationDetail>(`/events/${eventId}/applications/${applicationId}/messages`, { body }),
  decide: (
    eventId: number,
    applicationId: number,
    body: { status: Extract<ApplicationStatus, 'CONFIRMED' | 'WAITING' | 'REJECTED'>; reason?: string },
  ) => api.patch<EventApplicationDetail>(`/events/${eventId}/applications/${applicationId}/status`, body),
  needs: (eventId: number) => api.get<EventNeeds>(`/events/${eventId}/needs`),

  /** 신청 명단 엑셀 파일을 내려받습니다. */
  async exportApplications(eventId: number, status?: ApplicationStatus[]) {
    const res = await http.get<Blob>(`/events/${eventId}/applications/export`, {
      params: { format: 'xlsx', status },
      responseType: 'blob',
    })
    const disposition = String(res.headers['content-disposition'] ?? '')
    const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition) ?? /filename="?([^";]+)"?/i.exec(disposition)
    const fileName = match ? decodeURIComponent(match[1]) : `applications-${eventId}.xlsx`
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  },
}

// ---------- 신청 ----------
export const applicationApi = {
  prepare: (body: PrepareApplicationRequest) => api.post<PreparedApplication>('/applications/prepare', body),
  markSubmitted: (applicationId: number, body: SubmittedRequest = {}) =>
    api.patch<MyApplicationDetail>(`/applications/${applicationId}/submitted`, body),
  sendInquiry: (applicationId: number, body: string) =>
    api.post<MyApplicationDetail>(`/applications/${applicationId}/messages`, { body }),
  cancel: (applicationId: number, reason?: string) =>
    api.patch<MyApplicationDetail>(`/applications/${applicationId}/cancel`, { reason }),
  list: (params: { status?: ApplicationStatus[] } & PageParams = {}) =>
    api.get<PageResponse<MyApplicationSummary>>('/applications', { params }),
  summary: () => api.get<MyApplicationCount>('/applications/summary'),
  get: (applicationId: number) => api.get<MyApplicationDetail>(`/applications/${applicationId}`),
  applyDirect: (programId: number, body: DirectApplicationRequest) =>
    api.post<Application>(`/programs/${programId}/applications`, body),
}

// ---------- 알림 ----------
export const notificationApi = {
  list: (params: PageParams = {}) => api.get<PageResponse<Notification>>('/notifications', { params }),
  unreadCount: () => api.get<{ unreadCount: number }>('/notifications/unread-count'),
  read: (notificationId: number) => api.patch<Notification>(`/notifications/${notificationId}/read`),
  readAll: () => api.patch<{ unreadCount: number }>('/notifications/read-all'),
}

// ---------- 지도 ----------
export const regionApi = {
  districts: (month?: YearMonthString) => api.get<DistrictStats>('/regions/districts', { params: { month } }),
  district: (district: District, month?: YearMonthString) =>
    api.get<DistrictDetail>(`/regions/districts/${district}`, { params: { month } }),
  markers: (params: { district?: District; month?: YearMonthString } = {}) =>
    api.get<Markers>('/regions/markers', { params }),
}
