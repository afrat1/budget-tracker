'use client';

import { useState, useEffect } from 'react';

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
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
};

export default function IncomeInput({ value, onChange }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(value ? formatNumber(value) : '');
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value;
    raw = raw.replace(/[^\d.,]/g, '');
    
    const parts = raw.split(',');
    if (parts.length > 2) {
      raw = parts[0] + ',' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
      raw = parts[0] + ',' + parts[1].slice(0, 2);
    }
    
    setInputValue(raw);
    onChange(parseNumber(raw));
  };

  const handleBlur = () => {
    const num = parseNumber(inputValue);
    setInputValue(num ? formatNumber(num) : '');
  };

  return (
    <div className="card" style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}>
      <div className="card-title" style={{ color: 'var(--success)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Gelecek Ay Geliri
      </div>
      <div className="input-group">
        <label>Beklenen Maaş / Gelir</label>
        <div className="input-currency">
          <input
            type="text"
            className="input"
            placeholder="0"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            style={{ borderColor: 'rgba(34, 197, 94, 0.3)' }}
          />
          <span className="currency">₺</span>
        </div>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '8px' }}>
        Bir sonraki ayın başında gelecek maaş/gelir miktarı
      </p>
    </div>
  );
}
