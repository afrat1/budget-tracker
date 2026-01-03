'use client';

export default function Summary({ balance, cash, income, target, automaticPayments, creditPayments, currentMonth, onTransferToNextMonth }) {
  // Türkçe para formatı: 1.234,56
  const formatNumber = (num) => {
    // Floating point düzeltmesi için 2 ondalık basamağa yuvarla
    const fixed = Math.abs(num).toFixed(2);
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (decPart === '00') {
      return formattedInt;
    }
    return `${formattedInt},${decPart}`;
  };

  // Floating point düzeltmesi
  const round2 = (num) => Math.round(num * 100) / 100;

  const totalAutomatic = round2(automaticPayments.reduce((sum, p) => sum + p.amount, 0));
  const totalCredit = round2(creditPayments.reduce((sum, p) => sum + p.amount, 0));
  const totalExpenses = round2(totalAutomatic + totalCredit);
  const totalBalance = round2(balance + cash); // Banka + Nakit
  const totalAvailable = round2(totalBalance + income);
  const remaining = round2(totalAvailable - totalExpenses);
  
  // Hedef tasarruf hesaplaması
  const spendableAmount = round2(remaining - target); // Hedef sonrası harcayabileceğiniz miktar

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const nextMonthName = months[nextMonth.getMonth()];
  const nextMonthYear = nextMonth.getFullYear();

  return (
    <div className="card summary-card">
      <div className="card-title">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
        Bütçe Özeti
      </div>

      <div className="summary-top-grid">
        <div className="summary-item">
          <div className="summary-item-label">Banka + Nakit</div>
          <div className="summary-item-value income">{formatNumber(totalBalance)} ₺</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">Gelecek Gelir</div>
          <div className="summary-item-value" style={{ color: 'var(--success)' }}>+{formatNumber(income)} ₺</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">Toplam Gider</div>
          <div className="summary-item-value expense">-{formatNumber(totalExpenses)} ₺</div>
        </div>
        <div className="summary-item">
          <div className="summary-item-label">Hedef Tasarruf</div>
          <div className="summary-item-value" style={{ color: 'var(--accent-secondary)' }}>{formatNumber(target)} ₺</div>
        </div>
      </div>

      <div className="summary-middle-flex">
        <div style={{ flex: 1, padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Otomatik Ödemeler</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>{formatNumber(totalAutomatic)} ₺</div>
        </div>
        <div style={{ flex: 1, padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Kredi Taksitleri</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)' }}>{formatNumber(totalCredit)} ₺</div>
        </div>
        <div style={{ flex: 1, padding: '16px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)', minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Toplam Kullanılabilir</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>{formatNumber(totalAvailable)} ₺</div>
        </div>
      </div>

      <div className="summary-divider"></div>

      {/* Kalan Para */}
      <div className="remaining-balance">
        <div className="remaining-balance-label">
          {nextMonthName} {nextMonthYear} Ödemeler Sonrası Kalan Para
        </div>
        <div className={`remaining-balance-value ${remaining >= 0 ? 'positive' : 'negative'}`}>
          {remaining >= 0 ? '' : '-'}{formatNumber(remaining)} ₺
        </div>
        <div className="remaining-balance-note">
          Mevcut bakiye + gelecek gelir - tüm ödemeler
        </div>
        {remaining > 0 && onTransferToNextMonth && (
          <button 
            className="btn btn-success" 
            onClick={() => onTransferToNextMonth(remaining)}
            style={{ marginTop: '16px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
            Sonraki Aya Aktar ({formatNumber(remaining)} ₺)
          </button>
        )}
      </div>

      {/* Hedef Hesaplaması */}
      {target > 0 && (
        <>
          <div className="summary-divider"></div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }} className="summary-target-grid">
            {/* Hedefe Göre Harcama Limiti */}
            <div style={{
              padding: '20px',
              background: spendableAmount >= 0 ? 'rgba(139, 92, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${spendableAmount >= 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {spendableAmount >= 0 ? 'Ek Harcama Yapabilirsiniz' : 'Hedef İçin Eksik'}
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: spendableAmount >= 0 ? 'var(--accent-secondary)' : 'var(--danger)',
              }}>
                {spendableAmount >= 0 ? '' : '-'}{formatNumber(spendableAmount)} ₺
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                {spendableAmount >= 0
                  ? `${formatNumber(target)} ₺ hedefini tutturduktan sonra`
                  : `Hedefinize ulaşmak için ${formatNumber(Math.abs(spendableAmount))} ₺ daha tasarruf edin`
                }
              </div>
            </div>

            {/* Hedef Durumu */}
            <div style={{
              padding: '20px',
              background: remaining >= target ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${remaining >= target ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Hedef Durumu
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 800,
                color: remaining >= target ? 'var(--success)' : 'var(--warning)',
              }}>
                {remaining >= target ? '✓ Hedefe Ulaştınız' : '⚠ Hedef Altında'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Hedef: {formatNumber(target)} ₺ | Kalan: {formatNumber(remaining)} ₺
              </div>
            </div>
          </div>
        </>
      )}

      {remaining < 0 && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--danger)" width="24" height="24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '4px' }}>Dikkat!</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Mevcut bakiye ve gelecek geliriniz ödemeleri karşılamak için yeterli değil. Ek {formatNumber(Math.abs(remaining))} ₺ gerekiyor.
            </div>
          </div>
        </div>
      )}

      {remaining >= 0 && remaining > 0 && target === 0 && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--success)" width="24" height="24" style={{ flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '4px' }}>Harika!</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Tüm ödemeler sonrasında {formatNumber(remaining)} ₺ paranız kalacak.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
