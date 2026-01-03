'use client';

import { useState, useEffect } from 'react';

// Türkçe para formatı: 1.234,56 (binlik: nokta, ondalık: virgül)
const formatNumber = (num) => {
  if (num === 0) return '';
  const [intPart, decPart] = num.toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // Ondalık kısmı sadece varsa göster
  if (decPart === '00') {
    return formattedInt;
  }
  return `${formattedInt},${decPart}`;
};

const parseNumber = (str) => {
  // Noktaları kaldır (binlik ayracı), virgülü noktaya çevir (ondalık)
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
};

export default function BalanceInput({ value, onChange }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(value ? formatNumber(value) : '');
  }, [value]);

  const handleChange = (e) => {
    let raw = e.target.value;
    
    // Sadece rakam, nokta ve virgül kabul et
    raw = raw.replace(/[^\d.,]/g, '');
    
    // Birden fazla virgül varsa sadece ilkini tut
    const parts = raw.split(',');
    if (parts.length > 2) {
      raw = parts[0] + ',' + parts.slice(1).join('');
    }
    
    // Virgülden sonra max 2 hane
    if (parts.length === 2 && parts[1].length > 2) {
      raw = parts[0] + ',' + parts[1].slice(0, 2);
    }
    
    setInputValue(raw);
    onChange(parseNumber(raw));
  };

  const handleBlur = () => {
    // Focus kaybedildiğinde formatla
    const num = parseNumber(inputValue);
    setInputValue(num ? formatNumber(num) : '');
  };

  return (
    <div className="card">
      <div className="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        Ana Hesap Bakiyesi
      </div>
      <div className="input-group">
        <label>Mevcut Bakiye</label>
        <div className="input-currency">
          <input
            type="text"
            className="input"
            placeholder="0"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
          />
          <span className="currency">₺</span>
        </div>
      </div>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '8px' }}>
        Ay başındaki hesap bakiyenizi girin (örn: 1.234,56)
      </p>
    </div>
  );
}
