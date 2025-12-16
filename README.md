# 대의 MAP

> **"누구나 원하는 장소 어디든 안전하고 편리하게"** > 휠체어 사용자를 위한 실시간 접근성 지도 커뮤니티
> https://safedd.lovable.app

![프로젝트 로고]([./assets/logo.png](https://github.com/bokjeongman/Daeeui/blob/main/src/assets/kakao_impact_logo.png))

## 프로젝트 소개 (Project Overview)

**대의**는 휠체어 사용자가 겪는 정보 부재와 이동 제약 문제를 해결하기 위한 서비스입니다. 기존 지도 앱들이 제공하지 못하는 **'도보 경로 상의 실시간 장애물(턱, 경사로 등) 정보'**를 사용자가 직접 제보하고, 이를 지도 위에 시각화하여 공유하는 커뮤니티형 지도 서비스입니다.

### 문제 인식 (Problem)
* **정보의 부족:** 로드뷰는 차도 위주라 실제 휠체어가 다니는 도보의 턱이나 경사를 확인하기 어렵습니다.
* **불확실성:** 지도 정보와 실제 현장의 차이로 인해 휠체어 진입 가능 여부를 최악의 상황에는 일일이 전화로 확인해야 합니다.
* **불편함:** 상세 경로를 텍스트로 직접 공유해야 하는 번거로움이 있습니다.

### 솔루션 (Solution)
* **실시간 제보:** 사용자가 직접 경사로, 엘리베이터, 턱 유무 등을 제보하여 데이터화합니다.
* **직관적 시각화:** 이동 경로상에 존재하는 베리어(Barrier) 정보를 지도에 오버레이(Overlay)하여 미리 파악할 수 있습니다.

---

## 주요 기능 (Key Features)

| 기능 | 설명 |
| :--- | :--- |
| **실시간 접근성 제보** | 간단한 터치로 경사로, 엘리베이터, 장애인 화장실 유무 등을 지도에 등록 |
| **경로상 장벽 시각화** | TMAP API 기반 도보 경로 위에 장애물 정보를 오버레이하여 안전한 경로 탐색 지원 |
| **커뮤니티 및 후기** | 장소별 접근성 후기 공유 및 '좋아요', '정보 수정' 기능 제공 |
| **맞춤형 필터링** | 사용자가 원하는 접근성 정보(턱 없음, 자동문 등)만 선택하여 지도에 표시 |
| **높은 접근성 (PWA)** | 별도 앱 설치 없이 웹 브라우저에서 앱처럼 사용 가능 (PWA 지원) |
| **간편 로그인** | 카카오, 구글 계정 연동(SSO)으로 진입 장벽 최소화 |

---

## 기술 스택 (Tech Stack)

### Front-end
* **TypeScript** 
* **React**
* **PWA (Progressive Web App)**

### Back-end & Infra
* **Supabase** (PostgreSQL, Serverless)
* **Real-time Database:** 실시간 데이터 반영
* **Storage:** 제보 사진 저장 및 관리
* **Authentication:** 소셜 로그인 인증 구현

### Map Engine
* **TMAP API:** 도보 경로 데이터 실시간 반환 및 오버레이 구현

---

### 설치 및 실행 (Installation)

1. 리포지토리 클론
   ```bash
   git clone [https://github.com/bokjeongman/safedd.git](https://github.com/bokjeongman/safedd.git)

2. 프로젝트 폴더로 이동
   ```bash
   cd safedd

3. 패키지 설치
   ```bash
   npm install
   # 또는 yarn install

4. 환경 변수 설정 프로젝트 루트에 .env 파일을 생성하고 필요한 키를 입력
   ```bash
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   REACT_APP_TMAP_API_KEY=your_tmap_api_key

5. 개발 서버 실행
   ```bash
   npm run dev
   # 또는 yarn dev
   
---

## 팀원 소개 (Team Members)

| 이름 | 역할 | 소속 |
| :--- | :--- | :--- |
| **송태규** | **Team Leader / PM** | AI·소프트웨어학부 (AI) |
| **강관규** | **Planning** | 경영학과 |
| **신민정** | **Front-end** | 기계·스마트·산업공학부 |
| **이시온** | **Front-end** | 컴퓨터공학과 |
| **한수민** | **Back-end** | AI·소프트웨어학부 (SW) |

---

## 로드맵 (Roadmap)

**2025.12:** 초기 데이터 확보 및 기능 고도화
**협력 확장:** 무의, 분당 IL센터 등 유관 기관과 협력하여 데이터 배포
**기능 개선:** 사용자 피드백 기반 UI/UX 개선
**콘텐츠 도입:** 무장애숲길, 테마맵 등 특화 콘텐츠 추가 예정

---

## Acknowledgement

본 프로젝트는 카카오임팩트 테크포임팩트 프로그램을 통해 개발되었습니다.

![카카오임팩트 로고]([./assets/kakao_impact_logo.png](https://github.com/bokjeongman/Daeeui/blob/main/src/assets/logo.png))

---

## License

License
Copyright (c) 2025 대의
Developed with support from Kakao Impact Tech for Impact Program.

This project is licensed under the MIT License.

See the LICENSE file for details.
