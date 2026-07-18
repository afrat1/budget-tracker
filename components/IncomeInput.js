'use client';

import { useState, useEffect } from 'react';
import { normalizeIncomeRange } from '../lib/incomeRange';

const formatNumber = (num) => {
  if (num === 0) return '';
  const [intPart, decPart] = num.toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decPart === '00') {
    return formattedInt;
  }
  return `${formattedInt},${decPart}`;
};

const parseNumber = (str) => {
  const normalized = String(str || '').replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
};

const sanitizeAmountInput = (raw) => {
  let value = raw.replace(/[^\d.,]/g, '');
  const parts = value.split(',');
  if (parts.length > 2) {
    value = `${parts[0]},${parts.slice(1).join('')}`;
  }
  if (parts.length === 2 && parts[1].length > 2) {
    value = `${parts[0]},${parts[1].slice(0, 2)}`;
  }
  return value;
};

export default function IncomeInput({ incomeMin, incomeMax, onChange }) {
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');

  useEffect(() => {
    const range = normalizeIncomeRange(incomeMin, incomeMax);
    setMinValue(range.min ? formatNumber(range.min) : '');
    setMaxValue(range.max ? formatNumber(range.max) : '');
  }, [incomeMin, incomeMax]);

  const handleMinChange = (e) => {
    const raw = sanitizeAmountInput(e.target.value);
    setMinValue(raw);
    onChange({ min: parseNumber(raw), max: parseNumber(maxValue) });
  };

  const handleMaxChange = (e) => {
    const raw = sanitizeAmountInput(e.target.value);
    setMaxValue(raw);
    onChange({ min: parseNumber(minValue), max: parseNumber(raw) });
  };

  const handleBlur = () => {
    const range = normalizeIncomeRange(parseNumber(minValue), parseNumber(maxValue));
    setMinValue(range.min ? formatNumber(range.min) : '');
    setMaxValue(range.max ? formatNumber(range.max) : '');
    onChange(range);
  };

  return (
    <div className="card input-grid-card income-input-card">
      <div className="card-title input-grid-card-title" style={{ color: 'var(--success)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Gelecek Ay Geliri
      </div>
      <div className="income-range-row">
        <div className="input-group">
          <label>Min</label>
          <div className="input-currency">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="input"
              placeholder="0"
              value={minValue}
              onChange={handleMinChange}
              onBlur={handleBlur}
              style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}
            />
            <span className="currency">₺</span>
          </div>
        </div>
        <div className="input-group">
          <label>Max</label>
          <div className="input-currency">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              className="input"
              placeholder="0"
              value={maxValue}
              onChange={handleMaxChange}
              onBlur={handleBlur}
              style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}
            />
            <span className="currency">₺</span>
          </div>
        </div>
      </div>
      <p className="input-grid-card-note">
        Beklenen maaş/gelir aralığı. Aynı değer girersen tek rakam gibi çalışır.
      </p>
    </div>
  );
}
