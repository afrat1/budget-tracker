'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BalanceInput from '../components/BalanceInput';
import CashInput from '../components/CashInput';
import IncomeInput from '../components/IncomeInput';
import TargetInput from '../components/TargetInput';
import PaymentList from '../components/PaymentList';
import Summary from '../components/Summary';

const round2 = (num) => Math.round(num * 100) / 100;

const getMonthKeyFromDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getAccountsFromMonthData = (monthData) => {
  if (!monthData) return [];
  if (monthData.bankAccounts?.length > 0) return monthData.bankAccounts;
  if ((monthData.balance || 0) > 0) {
    return [{ amount: monthData.balance }];
  }
  return [];
};

const monthHasStoredData = (monthData) => {
  if (!monthData) return false;
  const balance = round2(getAccountsFromMonthData(monthData).reduce((sum, account) => sum + account.amount, 0));
  const reservedCash = monthData.reservedCash ?? monthData.cash ?? 0;
  return balance > 0
    || reservedCash > 0
    || (monthData.income || 0) > 0
    || (monthData.target || 0) > 0
    || (monthData.automaticPayments?.length || 0) > 0
    || (monthData.creditPayments?.length || 0) > 0;
};

const calculateMonthRemaining = (monthData) => {
  const balance = round2(getAccountsFromMonthData(monthData).reduce((sum, account) => sum + account.amount, 0));
  const reservedCash = monthData.reservedCash ?? monthData.cash ?? 0;
  const income = monthData.income || 0;
  const totalAutomatic = round2((monthData.automaticPayments || []).reduce((sum, payment) => sum + payment.amount, 0));
  const totalCredit = round2((monthData.creditPayments || []).reduce((sum, payment) => sum + payment.amount, 0));
  const totalAvailable = round2(balance + income - reservedCash);
  return round2(totalAvailable - totalAutomatic - totalCredit);
};

const applyDevredenBakiye = (monthData, amount) => {
  const roundedAmount = round2(amount);
  return {
    ...monthData,
    bankAccounts: [{
      id: Date.now() + Math.random(),
      name: 'Devreden Bakiye',
      amount: roundedAmount,
    }],
    balance: roundedAmount,
  };
};

const cascadeBalanceToFutureMonths = (allData) => {
  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  while (true) {
    const currentKey = getMonthKeyFromDate(cursor);
    const currentData = allData[currentKey];

    if (!monthHasStoredData(currentData)) break;

    const remaining = calculateMonthRemaining(currentData);
    const nextCursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const nextKey = getMonthKeyFromDate(nextCursor);
    const nextData = allData[nextKey];

    if (!monthHasStoredData(nextData)) break;

    allData[nextKey] = applyDevredenBakiye(nextData, remaining);
    cursor = nextCursor;
  }
};

export default function Home() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [reservedCash, setReservedCash] = useState(0);
  const [income, setIncome] = useState(0);
  const [target, setTarget] = useState(0);
  const [automaticPayments, setAutomaticPayments] = useState([]);
  const [creditPayments, setCreditPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error'
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenModalMode, setTokenModalMode] = useState('set'); // 'set' | 'renew'
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [hasGitHubToken, setHasGitHubToken] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const allDataRef = useRef({}); // Working copy: server data + unsaved drafts
  const serverDataLoadedRef = useRef(false);
  const skipAutoCascadeRef = useRef(true);

  const CORRECT_PASSWORD = 'afkaya48';

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const getMonthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const isViewingCurrentCalendarMonth = useCallback((date) => {
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }, []);

  const getBalanceTotal = (accounts) =>
    Math.round(accounts.reduce((sum, account) => sum + account.amount, 0) * 100) / 100;

  const migrateMonthData = (monthData) => {
    if (monthData.bankAccounts?.length > 0) {
      return monthData.bankAccounts;
    }

    const legacyBalance = monthData.balance || 0;
    if (legacyBalance > 0) {
      return [{
        id: Date.now() + Math.random(),
        name: 'Ana Hesap',
        amount: legacyBalance,
      }];
    }

    return [];
  };

  const buildMonthPayload = (accounts, reservedCashValue, incomeValue, targetValue, automatic, credit) => ({
    bankAccounts: accounts,
    balance: getBalanceTotal(accounts),
    reservedCash: reservedCashValue,
    income: incomeValue,
    target: targetValue,
    automaticPayments: automatic,
    creditPayments: credit,
  });

  // Get base path for GitHub Pages
  const getBasePath = () => {
    if (typeof window === 'undefined') return '';
    // Check if we're on GitHub Pages (has /budget-tracker in path)
    return window.location.pathname.startsWith('/budget-tracker') ? '/budget-tracker' : '';
  };

  const encodeBudgetPayload = (allData) => {
    const json = JSON.stringify(allData, null, 2);
    return btoa(unescape(encodeURIComponent(json)));
  };

  // Load all budget data from public/budget.json (only on first load / F5)
  const loadAllData = useCallback(async (force = false) => {
    if (serverDataLoadedRef.current && !force) {
      return allDataRef.current;
    }

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
      serverDataLoadedRef.current = true;
      return data;
    } catch (err) {
      console.error('Error loading all data:', err);
      return allDataRef.current;
    }
  }, []);

  const persistCurrentMonthDraft = useCallback(() => {
    const monthKey = getMonthKey(currentMonth);
    allDataRef.current[monthKey] = buildMonthPayload(
      bankAccounts,
      reservedCash,
      income,
      target,
      automaticPayments,
      creditPayments,
    );
  }, [currentMonth, bankAccounts, reservedCash, income, target, automaticPayments, creditPayments]);

  const runAutoCascade = useCallback(() => {
    if (!isViewingCurrentCalendarMonth(currentMonth)) return;

    persistCurrentMonthDraft();
    const allData = { ...allDataRef.current };
    cascadeBalanceToFutureMonths(allData);
    allDataRef.current = allData;
  }, [currentMonth, isViewingCurrentCalendarMonth, persistCurrentMonthDraft]);

  // Save data - GitHub Actions ile otomatik commit
  // CORS nedeniyle browser'dan direkt GitHub API çağrısı çalışmaz
  // Bu yüzden GitHub Actions workflow'unu tetikliyoruz
  const saveDataToGitHub = useCallback(async (allData) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('budget_data', JSON.stringify(allData));
        localStorage.setItem('budget_data_updated', new Date().toISOString());

        const token = localStorage.getItem('github_token');

        if (!token) {
          console.log('GitHub token not found. Data saved to localStorage only.');
          return { success: true, savedToLocalStorage: true, needsToken: true };
        }

        try {
          const repo = 'afrat1/budget-tracker';
          const response = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              event_type: 'update-budget',
              client_payload: {
                data_b64: encodeBudgetPayload(allData),
              },
            }),
          });

          if (response.ok) {
            console.log('GitHub Actions workflow tetiklendi.');
            return { success: true, workflowTriggered: true };
          }

          const error = await response.json().catch(() => ({}));
          const message = error.message || `HTTP ${response.status}`;
          console.error('GitHub API error:', message, error);
          return { success: false, savedToLocalStorage: true, error: message };
        } catch (apiErr) {
          console.error('GitHub API call failed:', apiErr);
          return { success: false, savedToLocalStorage: true, error: apiErr.message };
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Error saving data:', err);
      throw err;
    }
  }, []);

  // Load data for current month from working copy (drafts survive month navigation)
  const loadMonthData = useCallback(async (date) => {
    setIsLoaded(false);
    const monthKey = getMonthKey(date);
    console.log('Loading month data for:', monthKey);

    try {
      if (!serverDataLoadedRef.current) {
        await loadAllData();
      }

      const allData = allDataRef.current;
      const monthData = allData[monthKey] || {
        balance: 0,
        bankAccounts: [],
        income: 0,
        target: 0,
        automaticPayments: [],
        creditPayments: [],
      };

      const accounts = migrateMonthData(monthData);
      setBankAccounts(accounts);
      setReservedCash(monthData.reservedCash ?? monthData.cash ?? 0);
      setIncome(monthData.income || 0);
      setTarget(monthData.target || 0);
      setAutomaticPayments(monthData.automaticPayments || []);
      setCreditPayments(monthData.creditPayments || []);

      setTimeout(() => setIsLoaded(true), 0);
    } catch (err) {
      console.error('Error loading data:', err);
      setBankAccounts([]);
      setReservedCash(0);
      setIncome(0);
      setTarget(0);
      setAutomaticPayments([]);
      setCreditPayments([]);
      setIsLoaded(true);
    }
  }, [loadAllData]);

  // Check authentication and token on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem('budget_authenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
      setHasGitHubToken(!!localStorage.getItem('github_token'));
    }
  }, []);

  const openTokenModal = (mode = 'set') => {
    setTokenModalMode(mode);
    setTokenInput('');
    setTokenError('');
    setShowTokenInput(true);
  };

  const handleSaveToken = async () => {
    const token = tokenInput.trim();
    if (!token) {
      setTokenError('Token boş olamaz');
      return;
    }

    setTokenSaving(true);
    setTokenError('');

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      localStorage.setItem('github_token', token);
      setHasGitHubToken(true);
      setShowTokenInput(false);
      setTokenInput('');
    } catch (err) {
      setTokenError(err.message || 'Token geçersiz veya süresi dolmuş');
    } finally {
      setTokenSaving(false);
    }
  };

  const handleRemoveToken = () => {
    if (window.confirm('Kayıtlı GitHub token silinsin mi? Kaydet butonu yalnızca tarayıcıya yedekler.')) {
      localStorage.removeItem('github_token');
      setHasGitHubToken(false);
    }
  };

  // Load data when month changes (including initial load)
  useEffect(() => {
    skipAutoCascadeRef.current = true;
    if (isAuthenticated) {
      console.log('useEffect triggered, currentMonth:', getMonthKey(currentMonth));
      loadMonthData(currentMonth);
    }
  }, [currentMonth, loadMonthData, isAuthenticated]);

  // Current ayda değişiklik olunca gelecek aylara otomatik devret
  useEffect(() => {
    if (!isAuthenticated || !isLoaded || !isViewingCurrentCalendarMonth(currentMonth)) return;

    if (skipAutoCascadeRef.current) {
      skipAutoCascadeRef.current = false;
      return;
    }

    runAutoCascade();
  }, [
    bankAccounts,
    reservedCash,
    income,
    target,
    automaticPayments,
    creditPayments,
    isAuthenticated,
    isLoaded,
    currentMonth,
    isViewingCurrentCalendarMonth,
    runAutoCascade,
  ]);

  // Handle password submission
  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      if (typeof window !== 'undefined') {
        localStorage.setItem('budget_authenticated', 'true');
      }
    } else {
      setPasswordError('Yanlış şifre!');
      setPassword('');
    }
  };

  // Save data - commit working copy to GitHub (only via Kaydet button)
  const saveData = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      persistCurrentMonthDraft();
      const allData = { ...allDataRef.current };

      const result = await saveDataToGitHub(allData);

      if (result.workflowTriggered) {
        setSaveStatus('success');
      } else if (result.needsToken) {
        setSaveStatus('localStorage');
      } else if (result.error) {
        setSaveStatus('error');
      } else if (result.savedToLocalStorage) {
        setSaveStatus('localStorage');
      } else {
        setSaveStatus('success');
      }
    } catch (err) {
      console.error('Error saving data:', err);
      setSaveStatus('error');
    }
    setIsSaving(false);
    setTimeout(() => setSaveStatus(null), 8000);
  }, [persistCurrentMonthDraft, saveDataToGitHub]);

  const handleSave = () => {
    if (!isLoaded || isSaving) return;
    saveData();
  };

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

  const handleMoveAutomaticToCredit = (payment) => {
    setAutomaticPayments(automaticPayments.filter((p) => p.id !== payment.id));
    setCreditPayments([
      ...creditPayments,
      {
        ...payment,
        id: Date.now(),
        type: 'credit',
      },
    ]);
  };

  const handleMoveCreditToAutomatic = (payment) => {
    setCreditPayments(creditPayments.filter((p) => p.id !== payment.id));
    setAutomaticPayments([
      ...automaticPayments,
      {
        ...payment,
        id: Date.now(),
        type: 'automatic',
      },
    ]);
  };

  // Minimum tarih: Ocak 2026
  const minYear = 2026;
  const minMonth = 0; // Ocak = 0
  const canGoPrev = currentMonth.getFullYear() > minYear || 
    (currentMonth.getFullYear() === minYear && currentMonth.getMonth() > minMonth);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    persistCurrentMonthDraft();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    persistCurrentMonthDraft();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleCopyAutomaticToNextMonth = async () => {
    const nextMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const nextMonthKey = getMonthKey(nextMonthDate);
    const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    if (window.confirm(`Otomatik ödemeleri ${monthNames[nextMonthDate.getMonth()]} ayına kopyalamak istiyor musunuz?`)) {
      try {
        persistCurrentMonthDraft();
        const allData = allDataRef.current;
        const nextMonthData = allData[nextMonthKey] || {
          balance: 0,
          bankAccounts: [],
          income: 0,
          target: 0,
          automaticPayments: [],
          creditPayments: [],
        };

        const copiedPayments = automaticPayments.map(p => ({
          ...p,
          id: Date.now() + Math.random() * 1000,
        }));

        allData[nextMonthKey] = {
          ...nextMonthData,
          automaticPayments: [...(nextMonthData.automaticPayments || []), ...copiedPayments],
        };
        allDataRef.current = allData;

        alert(`${automaticPayments.length} otomatik ödeme ${monthNames[nextMonthDate.getMonth()]} ayına kopyalandı. Kaydet butonuna basarak commit edin.`);
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
        persistCurrentMonthDraft();
        const allData = allDataRef.current;
        const nextMonthData = allData[nextMonthKey] || {
          balance: 0,
          bankAccounts: [],
          income: 0,
          target: 0,
          automaticPayments: [],
          creditPayments: [],
        };

        const copiedPayments = creditPayments.map(p => ({
          ...p,
          id: Date.now() + Math.random() * 1000,
        }));

        allData[nextMonthKey] = {
          ...nextMonthData,
          creditPayments: [...(nextMonthData.creditPayments || []), ...copiedPayments],
        };
        allDataRef.current = allData;

        alert(`${creditPayments.length} kredi taksiti ${monthNames[nextMonthDate.getMonth()]} ayına kopyalandı. Kaydet butonuna basarak commit edin.`);
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
        persistCurrentMonthDraft();
        const allData = allDataRef.current;
        const nextMonthData = allData[nextMonthKey] || {
          balance: 0,
          bankAccounts: [],
          income: 0,
          target: 0,
          automaticPayments: [],
          creditPayments: [],
        };

        const transferredAccounts = [{
          id: Date.now() + Math.random(),
          name: 'Devreden Bakiye',
          amount,
        }];

        allData[nextMonthKey] = {
          ...nextMonthData,
          bankAccounts: transferredAccounts,
          balance: amount,
        };
        allDataRef.current = allData;

        alert(`${amount.toFixed(2).replace('.', ',')} ₺ ${nextMonthName} ayına aktarıldı. Kaydet butonuna basarak commit edin.`);
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
        persistCurrentMonthDraft();
        const allData = allDataRef.current;
        const sourceData = allData[fromKey];

        if (sourceData) {
          const copiedData = {
            bankAccounts: [],
            balance: 0,
            reservedCash: 0,
            income: sourceData.income,
            target: sourceData.target || 0,
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

          setBankAccounts([]);
          setReservedCash(0);
          setIncome(copiedData.income || 0);
          setTarget(copiedData.target || 0);
          setAutomaticPayments(copiedData.automaticPayments || []);
          setCreditPayments(copiedData.creditPayments || []);
        } else {
          allData[toKey] = {
            balance: 0,
            bankAccounts: [],
            reservedCash: 0,
            income: 0,
            target: 0,
            automaticPayments: [],
            creditPayments: [],
          };
          allDataRef.current = allData;
        }

        alert('Ödemeler kopyalandı. Kaydet butonuna basarak commit edin.');
      } catch (err) {
        console.error('Error copying data:', err);
      }
    }
  };

  const handleClearMonth = () => {
    if (window.confirm(`${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()} verilerini silmek istediğinizden emin misiniz?`)) {
      setBankAccounts([]);
      setReservedCash(0);
      setIncome(0);
      setTarget(0);
      setAutomaticPayments([]);
      setCreditPayments([]);
    }
  };

  // Show password screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        padding: '24px'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          padding: '32px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          maxWidth: '400px',
          width: '100%',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ 
            marginTop: 0, 
            marginBottom: '24px',
            textAlign: 'center',
            fontSize: '1.5rem',
            fontWeight: 700
          }}>
            Bütçe Yönetimi
          </h1>
          <p style={{ 
            color: 'var(--text-muted)', 
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '0.875rem'
          }}>
            Devam etmek için şifre girin
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="Şifre"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: passwordError ? '2px solid var(--error)' : '1px solid var(--border-color)',
                fontSize: '1rem',
                marginBottom: passwordError ? '8px' : '16px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            {passwordError && (
              <p style={{ 
                color: 'var(--error)', 
                fontSize: '0.875rem',
                marginTop: 0,
                marginBottom: '16px'
              }}>
                {passwordError}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Giriş Yap
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        gap: '24px'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ 
          color: 'var(--text-secondary)',
          fontSize: '1rem',
          fontWeight: 500
        }}>
          Yükleniyor...
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const balance = getBalanceTotal(bankAccounts);
  const hasData = monthHasStoredData({
    bankAccounts,
    balance,
    reservedCash,
    income,
    target,
    automaticPayments,
    creditPayments,
  });

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

      <div className="input-grid">
        <BalanceInput bankAccounts={bankAccounts} onChange={setBankAccounts} />
        <CashInput value={reservedCash} onChange={setReservedCash} />
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
          onMoveToOther={handleMoveAutomaticToCredit}
          type="automatic"
        />
        <PaymentList
          payments={creditPayments}
          onAdd={handleAddCredit}
          onDelete={handleDeleteCredit}
          onEdit={handleEditCredit}
          onReorder={handleReorderCredit}
          onCopyToNextMonth={handleCopyCreditToNextMonth}
          onMoveToOther={handleMoveCreditToAutomatic}
          type="credit"
        />
      </div>

      <div style={{ marginTop: '32px' }}>
        <Summary
          balance={balance}
          reservedCash={reservedCash}
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
            GitHub kaydı başarısız (tarayıcıda yedek var). Token veya Actions izinlerini kontrol et.
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
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
              {tokenModalMode === 'renew' ? 'GitHub Token Yenile' : 'GitHub Token Ayarla'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {tokenModalMode === 'renew'
                ? 'Yeni token eskisinin yerine geçer. Süresi dolmuş veya hata alıyorsan buradan yenileyebilirsin.'
                : 'Otomatik commit için GitHub Personal Access Token gerekli.'}
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              <a 
                href="https://github.com/settings/tokens/new" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
              >
                🔗 Yeni token oluştur (GitHub&apos;a gider)
              </a>
              <br />
              <span style={{ fontSize: '0.75rem', display: 'block', marginTop: '8px' }}>
                Note: &quot;Budget Tracker&quot; | Expiration: İstediğiniz süre | Scopes: <strong>repo</strong> (tümünü seçin)
              </span>
            </p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Token&apos;ı buraya yapıştırın:
            </p>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setTokenError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !tokenSaving) {
                  handleSaveToken();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: tokenError ? '2px solid var(--error)' : '1px solid var(--border-color)',
                marginBottom: tokenError ? '8px' : '16px',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
              autoFocus
            />
            {tokenError && (
              <p style={{
                color: 'var(--error)',
                fontSize: '0.875rem',
                marginTop: 0,
                marginBottom: '16px',
              }}>
                {tokenError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowTokenInput(false)}
                disabled={tokenSaving}
              >
                İptal
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSaveToken}
                disabled={tokenSaving}
              >
                {tokenSaving ? 'Doğrulanıyor...' : tokenModalMode === 'renew' ? 'Token Yenile' : 'Kaydet'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '16px', marginBottom: 0 }}>
              Token kaydedilmeden önce GitHub API ile doğrulanır.
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
          onClick={handleSave}
          disabled={isSaving || !isLoaded}
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
        <p>Verileriniz <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>public/budget.json</code> dosyasında ay bazlı saklanır. Ay değiştirirken taslaklar bellekte kalır; F5 ile sunucudaki son kayıt yüklenir.</p>
        <p style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!hasGitHubToken ? (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => openTokenModal('set')}
              style={{ fontSize: '0.875rem' }}
            >
              🔑 GitHub Token Ayarla
            </button>
          ) : (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => openTokenModal('renew')}
                style={{ fontSize: '0.875rem' }}
              >
                🔄 GitHub Token Yenile
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRemoveToken}
                style={{ fontSize: '0.875rem' }}
              >
                🗑️ Token Sil
              </button>
            </>
          )}
        </p>
      </footer>
    </main>
  );
}
