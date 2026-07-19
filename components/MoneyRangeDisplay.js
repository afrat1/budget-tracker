'use client';

const round2 = (num) => Math.round(num * 100) / 100;

export default function MoneyRangeDisplay({
  min,
  max,
  formatNumber,
  size = 'md',
  showLabels = true,
}) {
  const lo = round2(Math.min(min, max));
  const hi = round2(Math.max(min, max));

  const formatSigned = (num) => {
    const absFormatted = formatNumber(Math.abs(num));
    if (num < 0) return `−${absFormatted}`;
    return absFormatted;
  };

  if (lo === hi) {
    return (
      <span className={`money-range-single money-range-${size} ${lo < 0 ? 'is-negative' : 'is-positive'}`}>
        {formatSigned(lo)} ₺
      </span>
    );
  }

  return (
    <div className={`money-range money-range-${size}`} role="group" aria-label="Min ve max tutar">
      <div className={`money-range-item ${lo < 0 ? 'is-negative' : 'is-positive'}`}>
        {showLabels && <span className="money-range-label">Min</span>}
        <span className="money-range-value">{formatSigned(lo)} ₺</span>
      </div>
      <div className={`money-range-item ${hi < 0 ? 'is-negative' : 'is-positive'}`}>
        {showLabels && <span className="money-range-label">Max</span>}
        <span className="money-range-value">{formatSigned(hi)} ₺</span>
      </div>
    </div>
  );
}
