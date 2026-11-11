# Nubi-FE

Nubi 웹 프론트엔드 (기관 담당자용)

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (디자인 토큰은 `src/index.css`의 `@theme`, Figma 변수 이름과 같음)
- React Router, TanStack Query, axios
- 백엔드: [Nubi-BE](https://github.com/11-Pepero/Nubi-BE) (`/api/v1`)

## 로컬 실행

1. Nubi-BE를 띄웁니다 (기본 `http://localhost:8080`).
2. 프론트를 띄웁니다.

   ```bash
   npm install
   npm run dev
   ```

3. http://localhost:5173

개발 서버는 `/api`, `/uploads` 요청을 백엔드로 넘깁니다(`vite.config.ts`의 proxy). 백엔드 주소가 다르면 `.env.example`을 `.env`로 복사해 `VITE_PROXY_TARGET`을 바꿉니다.

배포처럼 프론트와 백엔드 출처가 다르면 `VITE_API_BASE_URL`에 백엔드 주소를 넣고, 백엔드 `CORS_ALLOWED_ORIGINS`에 프론트 주소를 추가합니다.

## 구조

```
src/
  api/          client.ts(axios, 토큰 재발급, 공통 응답 벗기기) · endpoints.ts(컨트롤러별 API) · types.ts(백엔드 DTO 타입)
  auth/         로그인 상태, 토큰 저장, 로그인 필요 라우트
  components/   ui(공통 컴포넌트) · layout(사이드바, 알림 패널)
  lib/          enum 한국어 라벨, 날짜 포맷, React Query 키, 선택한 참여 그룹
  pages/        화면 (번호는 Figma Frame 7 기준, 주소 표는 src/router.tsx 위 주석)
```

## 인증

- 로그인/가입 응답의 액세스·리프레시 토큰을 localStorage에 저장하고 `Authorization: Bearer`로 보냅니다.
- 401이 오면 `/auth/refresh`로 한 번 재발급하고 다시 요청합니다. 실패하면 로그아웃합니다.
- 실시간 알림은 `GET /api/v1/notifications/stream?token=` (SSE)로 받습니다.
