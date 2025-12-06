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

// 초록색 체크마크 마커 SVG 생성 함수 (공공데이터용)
export function createCheckMarkerSvg(size: number = 40): string {
  const uniqueId = `check-${Date.now()}-${Math.random()}`.replace(/\./g, '_');
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const ringWidth = size * 0.12;
  const innerRadius = radius - ringWidth;
  
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
      
      <!-- 초록색 링 -->
      <circle cx="${cx}" cy="${cy}" r="${radius - ringWidth/2}" fill="none" stroke="#22c55e" stroke-width="${ringWidth}"/>
      
      <!-- 체크마크 -->
      <path d="M ${cx - size*0.22} ${cy} L ${cx - size*0.05} ${cy + size*0.18} L ${cx + size*0.25} ${cy - size*0.15}" 
            fill="none" stroke="#22c55e" stroke-width="${size * 0.1}" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

// 공공데이터 마커 SVG URL 반환
export function getPublicDataMarkerUrl(size: number = 40): string {
  const svg = createCheckMarkerSvg(size);
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
  
  // 공공데이터이고 5개 항목 데이터가 없으면 체크 마커 사용
  if (isPublicData && !isCluster && !hasAccessibilityData) {
    return createCheckMarkerSvg(size);
  }
  
  // 데이터가 없으면 회색 마커 (클러스터는 숫자 표시)
  if (total === 0) {
    const uniqueId = `empty-${Date.now()}-${Math.random()}`;
    const displayText = isCluster ? pointCount.toString() : "0";
    const fontSize = isCluster ? (pointCount >= 100 ? 12 : 14) : 12;
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
        <text x="${size/2}" y="${size/2 + fontSize/3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle">${displayText}</text>
      </svg>
    `;
  }
  
  const uniqueId = `pie-${Date.now()}-${Math.random()}`.replace(/\./g, '_');
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 3;
  
  const yesPercent = yesCount / total;
  
  // 100% 초록색인 경우 - 전체 원을 초록색으로
  if (yesPercent === 1) {
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
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#22c55e" stroke="white" stroke-width="3" filter="url(#shadow-${uniqueId})"/>
      </svg>
    `;
  }
  
  // 100% 빨간색인 경우 - 전체 원을 빨간색으로
  if (yesPercent === 0) {
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
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#ef4444" stroke="white" stroke-width="3" filter="url(#shadow-${uniqueId})"/>
      </svg>
    `;
  }
  
  const noPercent = noCount / total;
  
  // 파이 차트 세그먼트 생성 (중앙 구멍 없음)
  let segments = "";
  let startAngle = -90; // 12시 방향에서 시작
  
  // 초록색 (Yes) 세그먼트
  if (yesCount > 0) {
    const angle = yesPercent * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    segments += `<path d="M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z" fill="#22c55e"/>`;
    
    startAngle = endAngle;
  }
  
  // 빨간색 (No) 세그먼트
  if (noCount > 0) {
    const angle = noPercent * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    segments += `<path d="M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z" fill="#ef4444"/>`;
  }
  
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
      <!-- 외곽 원 (그림자용 + 흰색 테두리) -->
      <circle cx="${cx}" cy="${cy}" r="${radius}" fill="white" stroke="white" stroke-width="3" filter="url(#shadow-${uniqueId})"/>
      <!-- 파이 차트 세그먼트 -->
      ${segments}
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
