// 도넛 차트 마커 SVG 생성 함수

interface DonutMarkerProps {
  yesCount: number;
  noCount: number;
  size?: number;
  isCluster?: boolean;
  pointCount?: number;
  isPublicData?: boolean;
  hasAccessibilityData?: boolean;
}

// 태극 문양 SVG 생성 함수 (공공데이터용) - 정부 심볼 스타일
export function createTaegukMarkerSvg(size: number = 40): string {
  const uniqueId = `taeguk-${Date.now()}-${Math.random()}`.replace(/\./g, '_');
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const scale = radius / 50;
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
          <feOffset dx="0" dy="1" result="offsetblur"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      
      <!-- 배경 원 (흰색 + 그림자) -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="white" filter="url(#shadow-${uniqueId})"/>
      
      <!-- 태극 문양 (정부 심볼 스타일 - 흰 공간 포함) -->
      <g transform="translate(${cx}, ${cy}) scale(${scale})">
        <!-- 빨간색 곡선 (상단 오른쪽) -->
        <path d="M 8,-38 
                 C 30,-32 42,-10 38,15 
                 C 35,28 24,38 10,40
                 C 0,36 -5,28 -5,18
                 C -5,8 2,0 12,0
                 C 22,0 28,-10 24,-22
                 C 20,-32 12,-38 8,-38 Z" fill="#C8102E"/>
        
        <!-- 파란색 곡선 (하단 왼쪽) -->
        <path d="M -8,38 
                 C -30,32 -42,10 -38,-15 
                 C -35,-28 -24,-38 -10,-40
                 C 0,-36 5,-28 5,-18
                 C 5,-8 -2,0 -12,0
                 C -22,0 -28,10 -24,22
                 C -20,32 -12,38 -8,38 Z" fill="#003366"/>
      </g>
    </svg>
  `;
}

// 공공데이터 마커 SVG URL 반환
export function getPublicDataMarkerUrl(size: number = 40): string {
  const svg = createTaegukMarkerSvg(size);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function createDonutMarkerSvg({
  yesCount,
  noCount,
  size = 44,
  isCluster = false,
  pointCount = 1,
  isPublicData = false,
  hasAccessibilityData = false
}: DonutMarkerProps): string {
  const total = yesCount + noCount;
  
  // 공공데이터이고 5개 항목 데이터가 없으면 태극 마커 사용
  if (isPublicData && !isCluster && !hasAccessibilityData) {
    return createTaegukMarkerSvg(size);
  }
  
  // 데이터가 없으면 회색 마커
  if (total === 0) {
    const uniqueId = `empty-${Date.now()}-${Math.random()}`;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 3}" fill="#9ca3af" stroke="white" stroke-width="3" filter="url(#shadow-${uniqueId})"/>
        <text x="${size/2}" y="${size/2 + 4}" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">?</text>
      </svg>
    `;
  }
  
  const uniqueId = `donut-${Date.now()}-${Math.random()}`.replace(/\./g, '_');
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = size / 2 - 3;
  const innerRadius = isCluster ? size / 3 : size / 3;
  
  const yesPercent = yesCount / total;
  const noPercent = noCount / total;
  
  // 도넛 차트 세그먼트 생성
  let segments = "";
  let startAngle = -90; // 12시 방향에서 시작
  
  // 초록색 (Yes) 세그먼트
  if (yesCount > 0) {
    const angle = yesPercent * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1Outer = cx + outerRadius * Math.cos(startRad);
    const y1Outer = cy + outerRadius * Math.sin(startRad);
    const x2Outer = cx + outerRadius * Math.cos(endRad);
    const y2Outer = cy + outerRadius * Math.sin(endRad);
    const x1Inner = cx + innerRadius * Math.cos(startRad);
    const y1Inner = cy + innerRadius * Math.sin(startRad);
    const x2Inner = cx + innerRadius * Math.cos(endRad);
    const y2Inner = cy + innerRadius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    segments += `<path d="M${x1Outer},${y1Outer} A${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2Outer},${y2Outer} L${x2Inner},${y2Inner} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${x1Inner},${y1Inner} Z" fill="#22c55e"/>`;
    
    startAngle = endAngle;
  }
  
  // 빨간색 (No) 세그먼트
  if (noCount > 0) {
    const angle = noPercent * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1Outer = cx + outerRadius * Math.cos(startRad);
    const y1Outer = cy + outerRadius * Math.sin(startRad);
    const x2Outer = cx + outerRadius * Math.cos(endRad);
    const y2Outer = cy + outerRadius * Math.sin(endRad);
    const x1Inner = cx + innerRadius * Math.cos(startRad);
    const y1Inner = cy + innerRadius * Math.sin(startRad);
    const x2Inner = cx + innerRadius * Math.cos(endRad);
    const y2Inner = cy + innerRadius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    segments += `<path d="M${x1Outer},${y1Outer} A${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2Outer},${y2Outer} L${x2Inner},${y2Inner} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${x1Inner},${y1Inner} Z" fill="#ef4444"/>`;
  }
  
  // 중앙 텍스트 (클러스터일 경우 개수, 아니면 비율)
  const fontSize = isCluster ? (pointCount >= 100 ? 12 : 14) : 10;
  const displayText = isCluster ? pointCount.toString() : `${Math.round(yesPercent * 100)}%`;
  const textColor = yesPercent >= 0.5 ? "#16a34a" : "#dc2626";
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <!-- 외곽 원 (그림자용) -->
      <circle cx="${cx}" cy="${cy}" r="${outerRadius}" fill="white" stroke="white" stroke-width="3" filter="url(#shadow-${uniqueId})"/>
      <!-- 도넛 차트 세그먼트 -->
      ${segments}
      <!-- 중앙 흰색 원 -->
      <circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="white"/>
      <!-- 중앙 텍스트 -->
      <text x="${cx}" y="${cy + fontSize/3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${textColor}" text-anchor="middle">${displayText}</text>
    </svg>
  `;
}

// 클러스터용 큰 도넛 마커
export function createClusterDonutMarker(
  yesCount: number,
  noCount: number,
  pointCount: number
): string {
  let size = 48;
  if (pointCount >= 100) {
    size = 64;
  } else if (pointCount >= 30) {
    size = 56;
  } else if (pointCount >= 10) {
    size = 52;
  }
  
  return createDonutMarkerSvg({
    yesCount,
    noCount,
    size,
    isCluster: true,
    pointCount
  });
}
