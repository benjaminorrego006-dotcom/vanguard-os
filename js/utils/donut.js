export const renderDonut = (segments, balanceAmount, isEmpty) => {
  const getCoords = (percent) => [
    Math.cos(2 * Math.PI * percent / 100),
    Math.sin(2 * Math.PI * percent / 100)
  ];

  let accumulated = 0;
  const slices = segments.map(seg => {
    if (seg.percent <= 0) return '';
    const [startX, startY] = getCoords(accumulated);
    const [endX, endY] = getCoords(accumulated + seg.percent);
    const largeArc = seg.percent > 50 ? 1 : 0;
    accumulated += seg.percent;
    return `<path d="M ${startX} ${startY} A 1 1 0 ${largeArc} 1 ${endX} ${endY}" fill="none" stroke="${seg.color}" stroke-width="0.3" stroke-linecap="round"></path>`;
  }).join('');

  return `
    <svg viewBox="-1.1 -1.1 2.2 2.2" style="transform: rotate(-90deg); width: 100%; height: 100%;">
      ${slices}
    </svg>
  `;
};