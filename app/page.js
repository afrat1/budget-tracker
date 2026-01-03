'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BalanceInput from '../components/BalanceInput';
import CashInput from '../components/CashInput';
import IncomeInput from '../components/IncomeInput';
import TargetInput from '../components/TargetInput';
import PaymentList from '../components/PaymentList';
import Summary from '../components/Summary';

export default function Home() {
  const [balance, setBalance] = useState(0);
  const [cash, setCash] = useState(0);
  const [income, setIncome] = useState(0);
  const [target, setTarget] = useState(0);
  const [automaticPayments, setAutomaticPayments] = useState([]);
  const [creditPayments, setCreditPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error'
  const [showTokenInput, setShowTokenInput] = useState(false);
  const skipSaveRef = useRef(true); // Initial load skip
  const allDataRef = useRef({}); // Cache all data

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const getMonthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Get base path for GitHub Pages
  const getBasePath = () => {
    if (typeof window === 'undefined') return '';
    // Check if we're on GitHub Pages (has /budget-tracker in path)
    return window.location.pathname.startsWith('/budget-tracker') ? '/budget-tracker' : '';
  };

  // Load all budget data from public/budget.json
  const loadAllData = useCallback(async () => {
    try {
      const basePath = getBasePath();
      const res = await fetch(`${basePath}/budget.json?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      allDataRef.current = data;
      return data;
    } catch (err) {
      console.error('Error loading all data:', err);
      return {};
    }
  }, []);

  // Save data using GitHub API - direkt commit
  const saveDataToGitHub = useCallback(async (allData) => {
    try {
      const repo = 'afrat1/budget-tracker';
      const owner = 'afrat1';
      const path = 'public/budget.json';
      const branch = 'main';
      
      // GitHub token - environment variable'dan al
      // Not: NEXT_PUBLIC_ prefix'i client-side'da görünür yapar (güvenlik riski)
      // Production'da GitHub Secrets kullanılmalı veya serverless function
      const token = typeof window !== 'undefined' 
        ? (window.GITHUB_TOKEN || localStorage.getItem('github_token') || '')
        : '';
      
      if (typeof window !== 'undefined') {
        // localStorage'a kaydet (backup)
        localStorage.setItem('budget_data', JSON.stringify(allData));
        localStorage.setItem('budget_data_updated', new Date().toISOString());
        
        // Token yoksa sadece localStorage'a kaydet
        if (!token) {
          console.log('GitHub token not found. Data saved to localStorage only.');
          console.log('To enable auto-commit, set GITHUB_TOKEN in localStorage or environment variable.');
          return { success: true, savedToLocalStorage: true };
        }
        
        try {
          // 1. Mevcut dosyanın SHA'sını al (update için gerekli)
          const getFileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
            {
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
              },
            }
          );
          
          let sha = null;
          if (getFileResponse.ok) {
            const fileData = await getFileResponse.json();
            sha = fileData.sha;
          }
          
          // 2. Dosyayı güncelle (veya oluştur)
          const content = JSON.stringify(allData, null, 2);
          const encodedContent = btoa(unescape(encodeURIComponent(content)));
          
          const updateResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Update budget data - ${new Date().toISOString()}`,
                content: encodedContent,
                branch: branch,
                sha: sha, // Update için gerekli, yeni dosya için null
              }),
            }
          );
          
          if (updateResponse.ok) {
            const result = await updateResponse.json();
            console.log('✅ Budget data committed to GitHub successfully!');
            
            // data/budget.json'u da güncelle (sync için)
            const dataPath = 'data/budget.json';
            const dataGetResponse = await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${dataPath}?ref=${branch}`,
              {
                headers: {
                  'Authorization': `token ${token}`,
                  'Accept': 'application/vnd.github.v3+json',
                },
              }
            );
            
            let dataSha = null;
            if (dataGetResponse.ok) {
              const dataFileData = await dataGetResponse.json();
              dataSha = dataFileData.sha;
            }
            
            await fetch(
              `https://api.github.com/repos/${owner}/${repo}/contents/${dataPath}`,
              {
                method: 'PUT',
                headers: {
                  'Authorization': `token ${token}`,
                  'Accept': 'application/vnd.github.v3+json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: `Update budget data - ${new Date().toISOString()}`,
                  content: encodedContent,
                  branch: branch,
                  sha: dataSha,
                }),
              }
            );
            
            return { success: true, committed: true };
          } else {
            const error = await updateResponse.json();
            console.error('GitHub API error:', error);
            throw new Error(error.message || 'Failed to commit to GitHub');
          }
        } catch (apiErr) {
          console.error('GitHub API call failed:', apiErr);
          // Hata olsa bile localStorage'a kaydedildi
          return { success: true, savedToLocalStorage: true, error: apiErr.message };
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error saving to GitHub:', err);
      throw err;
    }
  }, []);

  // Load data for current month from public/budget.json
  const loadMonthData = useCallback(async (date) => {
    setIsLoaded(false);
    const monthKey = getMonthKey(date);
    console.log('Loading month data for:', monthKey);
    
    try {
      // Load all data if not cached
      if (Object.keys(allDataRef.current).length === 0) {
        await loadAllData();
      }
      
      const allData = allDataRef.current;
      const monthData = allData[monthKey] || {
        balance: 0,
        cash: 0,
        income: 0,
        target: 0,
        automaticPayments: [],
        creditPayments: [],
      };
      
      setBalance(monthData.balance || 0);
      setCash(monthData.cash || 0);
      setIncome(monthData.income || 0);
      setTarget(monthData.target || 0);
      setAutomaticPayments(monthData.automaticPayments || []);
      setCreditPayments(monthData.creditPayments || []);
      
      setTimeout(() => {
        setIsLoaded(true);
        skipSaveRef.current = true;
      }, 0);
    } catch (err) {
      console.error('Error loading data:', err);
      setBalance(0);
      setCash(0);
      setIncome(0);
      setTarget(0);
      setAutomaticPayments([]);
      setCreditPayments([]);
      setIsLoaded(true);
    }
  }, [loadAllData]);

  // Load data when month changes (including initial load)
  useEffect(() => {
    console.log('useEffect triggered, currentMonth:', getMonthKey(currentMonth));
    loadMonthData(currentMonth);
  }, [currentMonth, loadMonthData]);

  // Save data - update local cache and save to GitHub
  const saveData = useCallback(async (data) => {
    setIsSaving(true);
    const monthKey = getMonthKey(currentMonth);
    try {
      // Reload all data to get latest
      const allData = await loadAllData();
      
      // Update the month data
      allData[monthKey] = data;
      allDataRef.current = allData;
      
      // Save to GitHub (will use GitHub Actions or API)
      await saveDataToGitHub(allData);
      
    } catch (err) {
      console.error('Error saving data:', err);
    }
    setIsSaving(false);
  }, [currentMonth, loadAllData, saveDataToGitHub]);

  // Auto-save when data changes
  useEffect(() => {
    if (isLoaded && !skipSaveRef.current) {
      const timeoutId = setTimeout(() => {
        saveData({
          balance,
          cash,
          income,
          target,
          automaticPayments,
          creditPayments,
        });
      }, 1000); // 1 second debounce
      return () => clearTimeout(timeoutId);
    }
  }, [balance, cash, income, target, automaticPayments, creditPayments, isLoaded, saveData]);

  const handleAddAutomatic = (payment) => {
    setAutomaticPayments([...automaticPayments, payment]);
  };

  const handleDeleteAutomatic = (id) => {
    setAutomaticPayments(automaticPayments.filter(p => p.id !== id));
  };

  const handleEditAutomatic = (updatedPayment) => {
    setAutomaticPayments(automaticPayments.map(p => 
      p.id === updatedPayment.id ? updatedPayment : p
    ));
  };

  const handleReorderAutomatic = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= automaticPayments.length) return;
    const newPayments = [...automaticPayments];
    const [moved] = newPayments.splice(fromIndex, 1);
    newPayments.splice(toIndex, 0, moved);
    setAutomaticPayments(newPayments);
  };

  const handleAddCredit = (payment) => {
    setCreditPayments([...creditPayments, payment]);
  };

  const handleDeleteCredit = (id) => {
    setCreditPayments(creditPayments.filter(p => p.id !== id));
  };

  const handleEditCredit = (updatedPayment) => {
    setCreditPayments(creditPayments.map(p => 
      p.id === updatedPayment.id ? updatedPayment : p
    ));
  };

  const handleReorderCredit = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= creditPayments.length) return;
    const newPayments = [...creditPayments];
    const [moved] = newPayments.splice(fromIndex, 1);
    newPayments.splice(toIndex, 0, moved);
    setCreditPayments(newPayments);
  };

  // Minimum tarih: Ocak 2026
  const minYear = 2026;
  const minMonth = 0; // Ocak = 0
  const canGoPrev = currentMonth.getFullYear() > minYear || 
    (currentMonth.getFullYear() === minYear && currentMonth.getMonth() > minMonth);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleCopyAutomaticToNextMonth = async () => {
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const nextMonthKey = getMonthKey(nextMonthDate);
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    if (window.confirm(`Otomatik ödemeleri ${monthNames[nextMonthDate.getMonth()]} ayına kopyalamak istiyor musunuz?`)) {
      try {
        // Get all data
        const allData = await loadAllData();
        const nextMonthData = allData[nextMonthKey] || {
          balance: 0,
          cash: 0,
          income: 0,
          target: 0,
          automaticPayments: [],
          creditPayments: [],
        };
        
        // Add current automatic payments with new IDs
        const copiedPayments = automaticPayments.map(p => ({
          ...p,
          id: Date.now() + Math.random() * 1000,
        }));
        
        // Merge with existing or create new
        const updatedData = {
          ...nextMonthData,
          automaticPayments: [...(nextMonthData.automaticPayments || []), ...copiedPayments],
        };
        
        // Update all data
        allData[nextMonthKey] = updatedData;
        allDataRef.current = allData;
        await saveDataToGitHub(allData);
        
        alert(`${automaticPayments.length} otomatik ödeme ${monthNames[nextMonthDate.getMonth()]} ayına kopyalandı!`);
      } catch (err) {
        console.error('Error copying payments:', err);
      }
    }
  };

  const handleCopyCreditToNextMonth = async () => {
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const nextMonthKey = getMonthKey(nextMonthDate);
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    if (window.confirm(`Kredi taksitlerini ${monthNames[nextMonthDate.getMonth()]} ayına kopyalamak istiyor musunuz?`)) {
      try {
        // Get all data
        const allData = await loadAllData();
        const nextMonthData = allData[nextMonthKey] || {
          balance: 0,
          cash: 0,
          income: 0,
          target: 0,
          automaticPayments: [],
          creditPayments: [],
        };
        
        const copiedPayments = creditPayments.map(p => ({
          ...p,
          id: Date.now() + Math.random() * 1000,
        }));
        
        const updatedData = {
          ...nextMonthData,
          creditPayments: [...(nextMonthData.creditPayments || []), ...copiedPayments],
        };
        
        // Update all data
        allData[nextMonthKey] = updatedData;
        allDataRef.current = allData;
        await saveDataToGitHub(allData);
        
        alert(`${creditPayments.length} kredi taksiti ${monthNames[nextMonthDate.getMonth()]} ayına kopyalandı!`);
      } catch (err) {
        console.error('Error copying payments:', err);
      }
    }
  };

  const handleTransferToNextMonth = async (amount) => {
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const nextMonthKey = getMonthKey(nextMonthDate);
    const currentMonthName = months[currentMonth.getMonth()];
    const nextMonthName = months[nextMonthDate.getMonth()];

    if (window.confirm(`${currentMonthName}'dan kalan ${amount.toFixed(2).replace('.', ',')} ₺'yi ${nextMonthName} ayının banka bakiyesine aktarmak istiyor musunuz?`)) {
      try {
        // Get all data
        const allData = await loadAllData();
        const nextMonthData = allData[nextMonthKey] || {
          balance: 0,
          cash: 0,
          income: 0,
          target: 0,
          automaticPayments: [],
          creditPayments: [],
        };
        
        const updatedData = {
          ...nextMonthData,
          balance: amount,
        };
        
        // Update all data
        allData[nextMonthKey] = updatedData;
        allDataRef.current = allData;
        await saveDataToGitHub(allData);
        
        alert(`${amount.toFixed(2).replace('.', ',')} ₺ ${nextMonthName} ayına aktarıldı!`);
      } catch (err) {
        console.error('Error transferring balance:', err);
      }
    }
  };

  const handleCopyFromPrevMonth = async () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const fromKey = getMonthKey(prevMonth);
    const toKey = getMonthKey(currentMonth);

    if (window.confirm(`${months[prevMonth.getMonth()]} ayındaki ödemeleri ${months[currentMonth.getMonth()]} ayına kopyalamak istiyor musunuz?`)) {
      try {
        // Get all data
        const allData = await loadAllData();
        const sourceData = allData[fromKey];
        
        if (sourceData) {
          // Copy data but generate new IDs for payments
          const copiedData = {
            balance: 0, // Start fresh with balance
            cash: 0, // Start fresh with cash
            income: sourceData.income, // Keep same income
            target: sourceData.target || 0, // Keep same target
            automaticPayments: sourceData.automaticPayments.map(p => ({
              ...p,
              id: Date.now() + Math.random() * 1000,
            })),
            creditPayments: sourceData.creditPayments.map(p => ({
              ...p,
              id: Date.now() + Math.random() * 1000,
            })),
          };
          
          allData[toKey] = copiedData;
          allDataRef.current = allData;
          await saveDataToGitHub(allData);
          
          // Update UI
          setBalance(copiedData.balance || 0);
          setCash(copiedData.cash || 0);
          setIncome(copiedData.income || 0);
          setTarget(copiedData.target || 0);
          setAutomaticPayments(copiedData.automaticPayments || []);
          setCreditPayments(copiedData.creditPayments || []);
        } else {
          // Empty month
          allData[toKey] = {
            balance: 0,
            cash: 0,
            income: 0,
            target: 0,
            automaticPayments: [],
            creditPayments: [],
          };
          allDataRef.current = allData;
          await saveDataToGitHub(allData);
        }
      } catch (err) {
        console.error('Error copying data:', err);
      }
    }
  };

  const handleClearMonth = () => {
    if (window.confirm(`${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()} verilerini silmek istediğinizden emin misiniz?`)) {
      setBalance(0);
      setCash(0);
      setIncome(0);
      setTarget(0);
      setAutomaticPayments([]);
      setCreditPayments([]);
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>
      </div>
    );
  }

  const hasData = balance > 0 || cash > 0 || income > 0 || target > 0 || automaticPayments.length > 0 || creditPayments.length > 0;

  return (
    <main className="container">
      <header className="header">
        <h1>Bütçe Yönetimi</h1>
        <p>Aylık ödemelerinizi takip edin, ay sonundaki bakiyenizi görün</p>
      </header>

      <div className="month-selector">
        <button 
          className="month-btn" 
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          style={{ opacity: canGoPrev ? 1 : 0.3 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="current-month" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span>{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
          {(() => {
            const now = new Date();
            const isToday = currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear();
            return isToday ? (
              <span style={{ 
                fontSize: '0.625rem', 
                background: 'var(--success)', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Şu an bu aydasınız
              </span>
            ) : null;
          })()}
        </span>
        <button className="month-btn" onClick={handleNextMonth}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {!hasData && (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          marginBottom: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
        }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Bu ay için henüz veri yok
          </p>
          <button className="btn btn-primary" onClick={handleCopyFromPrevMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
            Önceki Aydan Kopyala
          </button>
        </div>
      )}

      {/* 2x2 grid: Bakiye, Nakit / Gelir, Hedef */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '24px',
        marginBottom: '32px'
      }}>
        <BalanceInput value={balance} onChange={setBalance} />
        <CashInput value={cash} onChange={setCash} />
        <IncomeInput value={income} onChange={setIncome} />
        <TargetInput value={target} onChange={setTarget} />
      </div>

      <div className="main-grid">
        <PaymentList
          payments={automaticPayments}
          onAdd={handleAddAutomatic}
          onDelete={handleDeleteAutomatic}
          onEdit={handleEditAutomatic}
          onReorder={handleReorderAutomatic}
          onCopyToNextMonth={handleCopyAutomaticToNextMonth}
          type="automatic"
        />
        <PaymentList
          payments={creditPayments}
          onAdd={handleAddCredit}
          onDelete={handleDeleteCredit}
          onEdit={handleEditCredit}
          onReorder={handleReorderCredit}
          onCopyToNextMonth={handleCopyCreditToNextMonth}
          type="credit"
        />
      </div>

      <div style={{ marginTop: '32px' }}>
        <Summary
          balance={balance}
          cash={cash}
          income={income}
          target={target}
          automaticPayments={automaticPayments}
          creditPayments={creditPayments}
          currentMonth={currentMonth}
          onTransferToNextMonth={handleTransferToNextMonth}
        />
      </div>

      <div style={{ 
        marginTop: '32px', 
        display: 'flex', 
        justifyContent: 'center',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {isSaving && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Kaydediliyor...
          </span>
        )}
        {saveStatus === 'success' && (
          <span style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>
            ✅ GitHub&apos;a commit edildi!
          </span>
        )}
        {saveStatus === 'localStorage' && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            💾 localStorage&apos;a kaydedildi (GitHub token gerekli)
          </span>
        )}
        {saveStatus === 'error' && (
          <span style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
            ❌ Hata oluştu, localStorage&apos;a kaydedildi
          </span>
        )}
        {showTokenInput && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card)',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            zIndex: 1000,
            minWidth: '400px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>GitHub Token Ayarla</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Otomatik commit için GitHub Personal Access Token gerekli. Token&apos;ı buraya girin:
            </p>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              id="github-token-input"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                marginBottom: '16px',
                fontSize: '0.875rem'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowTokenInput(false)}
              >
                İptal
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const token = document.getElementById('github-token-input').value;
                  if (token) {
                    localStorage.setItem('github_token', token);
                    setShowTokenInput(false);
                    alert('Token kaydedildi! Artık değişiklikler otomatik olarak GitHub&apos;a commit edilecek.');
                  }
                }}
              >
                Kaydet
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px', marginBottom: 0 }}>
              Token oluşturmak için: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (repo yetkisi gerekli)
            </p>
          </div>
        )}
        {showTokenInput && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999
            }}
            onClick={() => setShowTokenInput(false)}
          />
        )}
        <button 
          className="btn btn-primary btn-sm" 
          onClick={() => saveData({
            balance,
            cash,
            income,
            target,
            automaticPayments,
            creditPayments,
          })}
          disabled={isSaving}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Kaydet
        </button>
        {hasData && (
          <button className="btn btn-ghost btn-sm" onClick={handleCopyFromPrevMonth}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
            Önceki Aydan Kopyala
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={handleClearMonth}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Bu Ayı Temizle
        </button>
      </div>

      <footer style={{ 
        textAlign: 'center', 
        marginTop: '48px', 
        paddingTop: '24px', 
        borderTop: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.875rem'
      }}>
        <p>Verileriniz <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>public/budget.json</code> dosyasında ay bazlı saklanır</p>
        {!localStorage.getItem('github_token') && (
          <p style={{ marginTop: '12px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowTokenInput(true)}
              style={{ fontSize: '0.875rem' }}
            >
              🔑 GitHub Token Ayarla (Otomatik commit için)
            </button>
          </p>
        )}
      </footer>
    </main>
  );
}
