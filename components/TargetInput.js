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

export default function TargetInput({ value, onChange }) {
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
    <div className="card" style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}>
      <div className="card-title" style={{ color: 'var(--accent-secondary)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
        </svg>
        Hedef Tasarruf
      </div>
      <div className="input-group">
        <label>Bir Sonraki Ay İçin Hedef</label>
        <div className="input-currency">
          <input
            type="text"
            className="input"
            placeholder="0"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
          />
          <span className="currency">₺</span>
        </div>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '8px' }}>
        Bir sonraki aya bırakmak istediğiniz minimum tutar
      </p>
    </div>
  );
}
