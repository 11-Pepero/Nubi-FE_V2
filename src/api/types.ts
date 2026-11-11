// Nubi-BE DTO 타입. 백엔드 record/DTO와 필드 이름을 그대로 맞춥니다.
// LocalDateTime은 "2026-11-09T14:00:00" 형태의 문자열, YearMonth는 "2026-11" 문자열입니다.

export type DateTimeString = string
export type YearMonthString = string

// ---------- 공통 ----------
export interface GlobalErrorResponse {
  code: string
  message: string
}

export interface GlobalResponse<T> {
  success: boolean
  data: T
  error: GlobalErrorResponse | null
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageParams {
  page?: number
  size?: number
}

// ---------- enum ----------
export type ApplicationStatus =
  | 'PREPARING'
  | 'SUBMITTED'
  | 'INQUIRY'
  | 'WAITING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'ATTENDED'
  | 'CANCELLED'
export type ApplicationStep = 'PREPARE' | 'SUBMIT' | 'ATTEND' | 'REVIEW' | 'ENDED'
export type PrepStatus = 'PENDING' | 'READY' | 'CHECK'
export type MemberRole = 'ADMIN' | 'STAFF'
export type OrganizationType = 'DAY_CARE' | 'WELFARE_CENTER' | 'GROUP_HOME' | 'WORKSHOP' | 'PUBLIC'
export type District = 'CHEOIN' | 'GIHEUNG' | 'SUJI'
export type ApplyMethod = 'DIRECT' | 'ONLINE' | 'PHONE' | 'PAPER'
export type ConditionSource = 'AI' | 'HOST' | 'REVIEW'
export type ConditionStatus = 'PROVIDED' | 'NOT_PROVIDED' | 'UNKNOWN'
export type EligibilityResult = 'ELIGIBLE' | 'CHECK' | 'NOT'
export type FacilitySource = 'PUBLIC_DATA' | 'HOST' | 'REVIEW'
export type FacilityStatus = 'YES' | 'NO' | 'UNKNOWN'
export type FacilityType = 'ELEVATOR' | 'ACCESSIBLE_TOILET' | 'RAMP' | 'NO_STEP' | 'PARKING' | 'BRAILLE_BLOCK'
export type ItemResult = 'MET' | 'MISSING' | 'UNKNOWN' | 'NOTE'
export type JudgementBasis = 'HOST' | 'REVIEW' | 'AI' | 'VENUE_FACILITY'
export type ProgramCategory = 'CULTURE' | 'SPORTS' | 'EDUCATION' | 'HEALTH' | 'BENEFIT'
export type ProgramStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ENDED'
export type SupportCategory =
  | 'MOBILITY'
  | 'TOILET'
  | 'COMPANION'
  | 'COMMUNICATION'
  | 'ENVIRONMENT'
  | 'MEAL'
  | 'REST'
  | 'TIME'
  | 'ETC'
export type NotificationType =
  | 'NEW_APPLICATION'
  | 'APPLICATION_DECIDED'
  | 'CARE_CHANGED'
  | 'DEADLINE'
  | 'NEW_PROGRAM'
  | 'NEW_REVIEW'
export type NotificationTargetType = 'APPLICATION' | 'PROGRAM' | 'REVIEW'

// ---------- 인증 / 기관 ----------
export interface LoginRequest {
  email: string
  password: string
}

export interface SignUpRequest {
  orgName: string
  type: OrganizationType
  address: string
  email: string
  password: string
  phone?: string
  latitude?: number
  longitude?: number
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  memberId: number
  email: string
  role: MemberRole
  organizationId: number
  organizationName: string
}

export interface MyOrganization {
  organizationId: number
  name: string
  type: OrganizationType
  district: District | null
  address: string
  phone: string | null
  member: {
    memberId: number
    name: string | null
    email: string
    role: MemberRole
    phone: string | null
  }
}

export interface MyOrganizationUpdateRequest {
  name?: string
  address?: string
  phone?: string
}

// ---------- 지원 관리 ----------
export interface SupportTag {
  id: number
  code: string
  label: string
}

export interface SupportCategoryGroup {
  category: SupportCategory
  label: string
  tags: SupportTag[]
}

export interface GroupSupport {
  supportTagId: number
  category: SupportCategory
  code: string
  label: string
  quantity: number | null
  ratio: string | null
  note: string | null
}

export interface Group {
  id: number
  name: string
  memberCount: number
  careCount: number
  eligibleCount: number
  checkCount: number
  supports: GroupSupport[]
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

export interface GroupSupportRequest {
  supportTagId: number
  quantity?: number | null
  /** "1:2" 형태 */
  ratio?: string | null
  note?: string | null
}

export interface GroupRequest {
  name: string
  memberCount: number
  supports?: GroupSupportRequest[]
}

export interface SupportCount {
  supportTagId: number
  category: SupportCategory
  code: string
  label: string
  count: number
}

export interface GroupSummary {
  groupCount: number
  memberCount: number
  supports: SupportCount[]
}

export interface CareItem {
  id: number
  supportTagId: number | null
  category: SupportCategory | null
  code: string | null
  label: string | null
  content: string | null
}

export interface CareItemRequest {
  supportTagId?: number | null
  content?: string | null
}

export interface CareCheck {
  careId: number
  alias: string
  supportTagId: number | null
  code: string | null
  label: string | null
  content: string | null
  result: ItemResult
  basis: JudgementBasis | null
  evidence: string | null
}

export interface JudgementImpact {
  applied: boolean
  affectedCount: number
  programs: {
    programId: number
    title: string
    startAt: DateTimeString
    resultWithout: EligibilityResult
    resultWith: EligibilityResult
    checks: CareCheck[]
  }[]
}

export interface CarePerson {
  id: number
  alias: string
  groupId: number | null
  groupName: string | null
  items: CareItem[]
  memo: string | null
  applyToJudgement: boolean
  judgementImpact: JudgementImpact | null
  createdAt: DateTimeString
  updatedAt: DateTimeString
}

export interface CarePersonCreateRequest {
  alias: string
  groupId?: number | null
  items?: CareItemRequest[]
  memo?: string | null
  applyToJudgement?: boolean
}

export type CarePersonUpdateRequest = Omit<CarePersonCreateRequest, 'groupId'>

// ---------- 프로그램 ----------
export interface VenueSummary {
  venueId: number
  name: string
  district: District | null
}

export interface Venue {
  venueId: number
  name: string
  address: string | null
  district: District | null
  latitude: number | null
  longitude: number | null
}

export interface ProgramImage {
  imageId: number
  url: string
  sortOrder: number
}

export interface FacilitySourceInfo {
  source: FacilitySource
  status: FacilityStatus
  verifiedAt: DateTimeString | null
}

export interface Facility {
  facilityType: FacilityType
  status: FacilityStatus
  sources: FacilitySourceInfo[]
}

export interface VenueFacilities {
  venueId: number
  name: string
  facilities: Facility[]
}

export interface EligibilityItem {
  supportTagId: number
  category: SupportCategory
  code: string
  label: string
  quantity: number | null
  ratio: string | null
  result: ItemResult
  basis: JudgementBasis | null
  evidence: string | null
  confidence: number | null
}

export interface EligibilityReasons {
  capacityExceeded: boolean
  items: EligibilityItem[]
  careChecks: CareCheck[]
}

export interface Eligibility {
  programId: number
  groupId: number
  result: EligibilityResult
  reasons: EligibilityReasons
}

export interface ProgramSummary {
  programId: number
  title: string
  category: ProgramCategory | null
  hostName: string | null
  status: ProgramStatus
  /** 수집 공고는 null (신청 방법을 모름) */
  applyMethod: ApplyMethod | null
  startAt: DateTimeString
  endAt: DateTimeString | null
  deadlineAt: DateTimeString | null
  capacity: number | null
  thumbnailUrl: string | null
  /** 수집 공고의 원문 페이지 (원문 보기). 기관이 올린 행사는 null */
  sourceUrl: string | null
  /** 경기도 시·군 이름 (예: 용인시). 모르면 null */
  city: string | null
  venue: VenueSummary | null
}

export interface ProgramDetail {
  programId: number
  title: string
  category: ProgramCategory | null
  hostName: string | null
  hostOrganizationId: number | null
  description: string | null
  status: ProgramStatus
  /** 수집 공고는 null (신청 방법을 모름) */
  applyMethod: ApplyMethod | null
  applyUrl: string | null
  /** 수집 공고의 원문 페이지 (원문 보기). 기관이 올린 행사는 null */
  sourceUrl: string | null
  contactPhone: string | null
  /** 경기도 시·군 이름 (예: 용인시). 모르면 null */
  city: string | null
  startAt: DateTimeString
  endAt: DateTimeString | null
  deadlineAt: DateTimeString | null
  capacity: number | null
  images: ProgramImage[]
  venue: Venue | null
  facilities: Facility[]
  eligibility: Eligibility | null
}

export interface EligibleProgram {
  program: ProgramSummary
  result: EligibilityResult
  metCount: number
  missingCount: number
  unknownCount: number
  careCheckCount: number
}

export interface ProgramSearchParams extends PageParams {
  keyword?: string
  category?: ProgramCategory
  district?: District
  /** 경기도 시·군 이름 (예: 수원시) */
  city?: string
  month?: YearMonthString
  applyMethod?: ApplyMethod
  accessibleOnly?: boolean
}

export interface EligibleProgramParams extends PageParams {
  groupId: number
  careIds?: number[]
  result?: EligibilityResult
  month?: YearMonthString
  /** 경기도 시·군 이름 (예: 수원시) */
  city?: string
}

/** 지역 필터 항목 */
export interface CityCount {
  city: string
  count: number
}

// ---------- 행사 관리 ----------
export interface EventConditionRequest {
  supportTagId: number
  status?: ConditionStatus
  evidence?: string
}

export interface EventCreateRequest {
  title: string
  category?: ProgramCategory | null
  description?: string | null
  venueId?: number | null
  startAt: DateTimeString
  endAt?: DateTimeString | null
  deadlineAt?: DateTimeString | null
  capacity?: number | null
  contactPhone?: string | null
  /** DRAFT(임시 저장) 또는 OPEN(공개하기) */
  status: 'DRAFT' | 'OPEN'
  conditions?: EventConditionRequest[]
}

export interface EventDashboard {
  ongoingEventCount: number
  pastEventCount: number
  draftEventCount: number
  newApplicationCount: number
  upcomingParticipantCount: number
  upcomingCompanionCount: number
}

export interface EventSummary {
  eventId: number
  title: string
  category: ProgramCategory | null
  status: ProgramStatus
  startAt: DateTimeString
  endAt: DateTimeString | null
  deadlineAt: DateTimeString | null
  capacity: number | null
  thumbnailUrl: string | null
  venue: VenueSummary | null
  applicationOrgCount: number
  participantCount: number
  newApplicationCount: number
}

// ---------- 신청 ----------
export interface SupportSnapshot {
  applicationSupportId: number
  supportTagId: number
  category: SupportCategory
  code: string
  label: string
  quantity: number | null
  prepStatus: PrepStatus
  hostNote: string | null
}

export interface CareSnapshot {
  carePersonId: number | null
  alias: string
  content: string | null
}

export interface ApplicationMessage {
  messageId: number
  senderOrganizationId: number
  senderOrganizationName: string
  fromHost: boolean
  body: string
  createdAt: DateTimeString
}

export interface Application {
  applicationId: number
  programId: number
  programTitle: string
  groupId: number | null
  groupName: string | null
  participantCount: number
  companionCount: number
  transport: string | null
  channel: ApplyMethod | null
  status: ApplicationStatus
  submittedAt: DateTimeString | null
  supports: SupportSnapshot[]
  cares: CareSnapshot[]
}

export interface DirectApplicationRequest {
  groupId: number
  careIds?: number[]
  participantCount?: number
  companionCount?: number
  transport?: string
  message?: string
}

export interface PrepareApplicationRequest {
  programId: number
  groupId: number
  careIds?: number[]
  participantCount?: number
  companionCount?: number
}

export interface PreparedApplication {
  application: Application
  channel: {
    applyMethod: ApplyMethod
    hostName: string | null
    contactPhone: string | null
    applyUrl: string | null
    deadlineAt: DateTimeString | null
  }
}

export interface SubmittedRequest {
  channel?: ApplyMethod
  submittedAt?: DateTimeString
}

export interface MyApplicationSummary {
  applicationId: number
  programId: number
  programTitle: string
  hostName: string | null
  startAt: DateTimeString
  venueName: string | null
  applyMethod: ApplyMethod
  applyUrl: string | null
  groupName: string | null
  participantCount: number
  companionCount: number
  channel: ApplyMethod | null
  status: ApplicationStatus
  step: ApplicationStep
  submittedAt: DateTimeString | null
}

export interface MyApplicationCount {
  total: number
  preparing: number
  waiting: number
  upcoming: number
  upcomingThisWeek: number
  attended: number
  statusCounts: Partial<Record<ApplicationStatus, number>>
}

export interface MyApplicationDetail {
  applicationId: number
  status: ApplicationStatus
  step: ApplicationStep
  channel: ApplyMethod | null
  submittedAt: DateTimeString | null
  decidedAt: DateTimeString | null
  program: {
    programId: number
    title: string
    hostName: string | null
    startAt: DateTimeString
    endAt: DateTimeString | null
    venueName: string | null
    venueAddress: string | null
    applyMethod: ApplyMethod
    applyUrl: string | null
    contactPhone: string | null
  }
  groupName: string | null
  participantCount: number
  companionCount: number
  transport: string | null
  supports: SupportSnapshot[]
  cares: CareSnapshot[]
  messages: ApplicationMessage[]
}

export interface EventApplicationSummary {
  applicationId: number
  organizationId: number
  organizationName: string
  groupName: string | null
  contactName: string | null
  participantCount: number
  companionCount: number
  supports: SupportSnapshot[]
  careCount: number
  status: ApplicationStatus
  submittedAt: DateTimeString | null
}

export interface EventApplicationList {
  capacity: number | null
  applicantOrgCount: number
  participantCount: number
  companionCount: number
  newApplicationCount: number
  statusCounts: Partial<Record<ApplicationStatus, number>>
  applications: PageResponse<EventApplicationSummary>
}

export interface EventApplicationDetail {
  applicationId: number
  status: ApplicationStatus
  channel: ApplyMethod | null
  submittedAt: DateTimeString | null
  decidedAt: DateTimeString | null
  organizationId: number
  organizationName: string
  organizationPhone: string | null
  contact: { name: string | null; phone: string | null } | null
  groupName: string | null
  participantCount: number
  companionCount: number
  transport: string | null
  supports: SupportSnapshot[]
  cares: CareSnapshot[]
  messages: ApplicationMessage[]
}

export interface EventNeeds {
  capacity: number | null
  participantCount: number
  companionCount: number
  newApplicationCount: number
  readyItemCount: number
  items: {
    supportTagId: number
    category: SupportCategory
    code: string
    label: string
    totalQuantity: number
    prepStatus: PrepStatus
    breakdown: {
      applicationId: number
      applicationSupportId: number
      organizationName: string
      groupName: string | null
      quantity: number
      prepStatus: PrepStatus
    }[]
    hostNotes: string[]
  }[]
  cares: { applicationId: number; alias: string; organizationName: string; content: string | null }[]
  arrivals: {
    applicationId: number
    organizationName: string
    groupName: string | null
    transport: string | null
    participantCount: number
    companionCount: number
    status: ApplicationStatus
  }[]
}

// ---------- 알림 ----------
export interface Notification {
  notificationId: number
  type: NotificationType
  title: string
  body: string | null
  targetType: NotificationTargetType | null
  targetId: number | null
  read: boolean
  createdAt: DateTimeString
}

// ---------- 지도 ----------
export interface DistrictStat {
  district: District
  name: string
  facilityCount: number
  registeredDisabled: number
  facilitiesPerThousand: number
  programCount: number
  accessibleProgramCount: number
  programsPerFacility: number | null
}

export interface DistrictStats {
  month: YearMonthString
  districts: DistrictStat[]
}

export interface EmdStat {
  emdCode: string
  emdName: string
  facilityCount: number
  registeredDisabled: number
  programCount: number
  accessibleProgramCount: number
}

export interface DistrictDetail {
  month: YearMonthString
  summary: DistrictStat
  emds: EmdStat[]
}

export interface Markers {
  month: YearMonthString
  facilities: {
    name: string
    facilityType: string
    district: District | null
    emdName: string | null
    latitude: number
    longitude: number
  }[]
  programs: {
    programId: number
    title: string
    startAt: DateTimeString
    venueName: string | null
    district: District | null
    accessible: boolean
    latitude: number
    longitude: number
  }[]
}
