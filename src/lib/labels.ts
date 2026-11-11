// 백엔드 enum을 화면에 보여줄 한국어로 바꿉니다.
import type {
  CheckAnswer,
  DocumentType,
  ReviewReaction,
  ApplicationStatus,
  ApplicationStep,
  ApplyMethod,
  District,
  EligibilityResult,
  FacilityStatus,
  FacilityType,
  ItemResult,
  JudgementBasis,
  NotificationType,
  OrganizationType,
  PrepStatus,
  ProgramCategory,
  ProgramStatus,
  SupportCategory,
} from '@/api/types'

export const SUPPORT_CATEGORY_LABEL: Record<SupportCategory, string> = {
  MOBILITY: '이동',
  TOILET: '화장실',
  COMPANION: '동반',
  COMMUNICATION: '의사소통',
  ENVIRONMENT: '환경',
  MEAL: '식사',
  REST: '휴식',
  TIME: '시간',
  ETC: '기타',
}

export const SUPPORT_CATEGORY_ORDER: SupportCategory[] = [
  'MOBILITY',
  'TOILET',
  'COMPANION',
  'COMMUNICATION',
  'ENVIRONMENT',
  'MEAL',
  'REST',
  'TIME',
  'ETC',
]

export const DISTRICT_LABEL: Record<District, string> = {
  CHEOIN: '처인구',
  GIHEUNG: '기흥구',
  SUJI: '수지구',
}

export const ORGANIZATION_TYPE_LABEL: Record<OrganizationType, string> = {
  DAY_CARE: '주간보호센터',
  WELFARE_CENTER: '장애인복지관',
  GROUP_HOME: '공동생활가정',
  WORKSHOP: '보호작업장',
  PUBLIC: '공공기관',
}

export const PROGRAM_CATEGORY_LABEL: Record<ProgramCategory, string> = {
  CULTURE: '문화',
  SPORTS: '체육',
  EDUCATION: '교육',
  HEALTH: '건강',
  BENEFIT: '혜택',
}

export const PROGRAM_STATUS_LABEL: Record<ProgramStatus, string> = {
  DRAFT: '임시 저장',
  OPEN: '공개 중',
  CLOSED: '신청 마감',
  ENDED: '끝난 행사',
}

export const APPLY_METHOD_LABEL: Record<ApplyMethod, string> = {
  DIRECT: '앱에서 바로 신청',
  ONLINE: '온라인 접수',
  PHONE: '전화 접수',
  PAPER: '서면 접수',
}

/** 신청한 기관 입장의 상태 이름 */
/** 신청 방법 이름. 수집 공고는 신청 방법을 몰라서 null이에요. */
export function applyMethodLabel(method: ApplyMethod | null | undefined): string {
  return method ? APPLY_METHOD_LABEL[method] : '원문 공고'
}

/** 신청 현황 등에서 쓰는, 신청한 기관 입장의 상태 이름 */
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  PREPARING: '준비 중',
  SUBMITTED: '접수 기다림',
  INQUIRY: '문의 있음',
  WAITING: '대기',
  CONFIRMED: '참여 예정',
  REJECTED: '거절',
  ATTENDED: '다녀왔어요',
  CANCELLED: '취소',
}

/** 주최 기관 입장의 상태 이름 */
export const HOST_APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  PREPARING: '준비 중',
  SUBMITTED: '새 신청',
  INQUIRY: '문의 있음',
  WAITING: '대기',
  CONFIRMED: '확정',
  REJECTED: '거절',
  ATTENDED: '다녀감',
  CANCELLED: '취소',
}

export const APPLICATION_STEP_LABEL: Record<ApplicationStep, string> = {
  PREPARE: '준비',
  SUBMIT: '접수',
  ATTEND: '참여',
  REVIEW: '후기',
  ENDED: '종료',
}

export const PREP_STATUS_LABEL: Record<PrepStatus, string> = {
  PENDING: '준비 전',
  READY: '준비함',
  CHECK: '확인 필요',
}

export const ELIGIBILITY_RESULT_LABEL: Record<EligibilityResult, string> = {
  ELIGIBLE: '참여 가능',
  CHECK: '확인 필요',
  NOT: '어려움',
}

export const ITEM_RESULT_LABEL: Record<ItemResult, string> = {
  MET: '충족',
  MISSING: '없음',
  UNKNOWN: '확인 필요',
  NOTE: '참고',
}

export const JUDGEMENT_BASIS_LABEL: Record<JudgementBasis, string> = {
  HOST: '주최 확인',
  REVIEW: '후기',
  AI: '공고 분석',
  VENUE_FACILITY: '장소 편의시설',
}

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  ELEVATOR: '엘리베이터',
  ACCESSIBLE_TOILET: '장애인 화장실',
  RAMP: '경사로',
  NO_STEP: '턱 없음',
  PARKING: '장애인 주차',
  BRAILLE_BLOCK: '점자 블록',
}

export const FACILITY_STATUS_LABEL: Record<FacilityStatus, string> = {
  YES: '있음',
  NO: '없음',
  UNKNOWN: '확인 안 됨',
}

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  NEW_APPLICATION: '새 신청',
  APPLICATION_DECIDED: '신청 결과',
  CARE_CHANGED: '케어 변경',
  DEADLINE: '마감 알림',
  NEW_PROGRAM: '새 프로그램',
  NEW_REVIEW: '새 후기',
}

// ---------- 후기 (화면 15, 16) ----------
export const REVIEW_REACTION_LABEL: Record<ReviewReaction, string> = {
  ENJOYED: '즐거워했어요',
  WANT_AGAIN: '다시 가고 싶어요',
  HAD_DIFFICULTY: '조금 힘들어했어요',
  SHORT_BREAKS: '쉬는 시간이 부족했어요',
  LONG_DISTANCE: '이동 거리가 길었어요',
}

/** 공고에 적힌 대로였나요? */
export const CHECK_ANSWER_LABEL: Record<CheckAnswer, string> = {
  YES: '그랬어요',
  NO: '아니었어요',
  UNKNOWN: '몰라요',
}

// ---------- AI 신청서 (화면 08) ----------
export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  FORM: '프로그램 참가 신청서',
  INQUIRY: '문의 문자',
  CALL_SCRIPT: '통화할 때 이렇게 말해요',
}
