'use client';

import { useState } from 'react';
import MoneyRangeDisplay from './MoneyRangeDisplay';

const formatNumber = (num) => {
  if (num === 0) return '0';
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

const formatInputNumber = (num) => {
  if (num === 0) return '';
  const [intPart, decPart] = num.toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decPart === '00') {
    return formattedInt;
  }
  return `${formattedInt},${decPart}`;
};

export default function BalanceInput({ bankAccounts, onChange, projectedBalanceMax = null }) {
  const [modalMode, setModalMode] = useState(null); // 'summary' | 'edit' | null
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({ name: '', amount: '' });

  const total = bankAccounts.reduce((sum, account) => sum + account.amount, 0);
  const round2 = (num) => Math.round(num * 100) / 100;
  const totalRounded = round2(total);
  const maxRounded = projectedBalanceMax != null ? round2(projectedBalanceMax) : totalRounded;
  const hasBalanceRange = maxRounded !== totalRounded;

  const resetForm = () => {
    setEditingAccount(null);
    setFormData({ name: '', amount: '' });
  };

  const handleOpenSummary = () => {
    resetForm();
    setModalMode('summary');
  };

  const handleOpenEdit = (e) => {
    e?.stopPropagation?.();
    resetForm();
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setModalMode(null);
    resetForm();
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      amount: formatInputNumber(account.amount),
    });
  };

  const handleDelete = (id) => {
    onChange(bankAccounts.filter((account) => account.id !== id));
    if (editingAccount?.id === id) resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;

    const amount = parseNumber(formData.amount);
    if (editingAccount) {
      onChange(
        bankAccounts.map((account) =>
          account.id === editingAccount.id
            ? { ...account, name: formData.name, amount }
            : account
        )
      );
    } else {
      onChange([
        ...bankAccounts,
        {
          id: Date.now() + Math.random(),
          name: formData.name,
          amount,
        },
      ]);
    }
    resetForm();
  };

  const handleAmountChange = (e) => {
    let raw = e.target.value;
    raw = raw.replace(/[^\d.,]/g, '');

    const parts = raw.split(',');
    if (parts.length > 2) {
      raw = parts[0] + ',' + parts.slice(1).join('');
    }
    if (parts.length === 2 && parts[1].length > 2) {
      raw = parts[0] + ',' + parts[1].slice(0, 2);
    }

    setFormData({ ...formData, amount: raw });
  };

  const noteText = (() => {
    if (bankAccounts.length === 0) return 'Özet için tıkla · hesap eklemek için Düzenle';
    if (hasBalanceRange) return 'Min = muhafazakâr · Max = iyimser · özet için tıkla';
    if (bankAccounts.length === 1) return `${bankAccounts[0].name} · özet için tıkla`;
    return `${bankAccounts[0].name} (+${bankAccounts.length - 1} hesap daha) · özet için tıkla`;
  })();

  return (
    <>
      <div
        className="card balance-card-clickable input-grid-card"
        onClick={handleOpenSummary}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenSummary();
          }
        }}
      >
        <div className="card-title input-grid-card-title balance-card-title-row">
          <span className="balance-card-title-left">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            Ana Hesap Bakiyesi
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm balance-card-edit-btn"
            onClick={handleOpenEdit}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Düzenle
          </button>
        </div>

        <div className="input-group">
          <label>{hasBalanceRange ? 'Devreden Bakiye' : 'Toplam Bakiye'}</label>
          <div className="balance-card-amount-display">
            {hasBalanceRange ? (
              <MoneyRangeDisplay
                min={Math.min(totalRounded, maxRounded)}
                max={Math.max(totalRounded, maxRounded)}
                formatNumber={formatNumber}
                size="sm"
              />
            ) : (
              `${formatNumber(totalRounded)} ₺`
            )}
          </div>
        </div>

        <p className="input-grid-card-note">{noteText}</p>
      </div>

      {modalMode && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal balance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === 'summary' ? 'Banka Hesapları Özeti' : 'Banka Hesaplarını Düzenle'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal} type="button">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {bankAccounts.length > 0 ? (
              <div className="balance-account-list">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="balance-account-item">
                    <div className="balance-account-info">
                      <div className="balance-account-name">{account.name}</div>
                      <div className="balance-account-amount">{formatNumber(account.amount)} ₺</div>
                    </div>
                    {modalMode === 'edit' && (
                      <div className="payment-item-actions">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleEdit(account)}
                          type="button"
                          title="Düzenle"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleDelete(account.id)}
                          type="button"
                          title="Sil"
                          style={{ color: 'var(--danger)' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <p>Henüz banka hesabı eklenmedi</p>
              </div>
            )}

            <div className="balance-modal-total">
              <span>Toplam Bakiye</span>
              <span className="balance-modal-total-value">{formatNumber(totalRounded)} ₺</span>
            </div>

            {hasBalanceRange && (
              <div className="balance-modal-range-note">
                İyimser senaryo (max): {formatNumber(maxRounded)} ₺
              </div>
            )}

            {modalMode === 'summary' ? (
              <div className="balance-modal-actions">
                <button type="button" className="btn btn-primary btn-full" onClick={handleOpenEdit}>
                  Hesapları Düzenle
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
                <div className="input-group">
                  <label>{editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Banka adı (örn: Ziraat, Garanti)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ marginBottom: '12px' }}
                  />
                  <div className="input-currency">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="input"
                      placeholder="0"
                      value={formData.amount}
                      onChange={handleAmountChange}
                    />
                    <span className="currency">₺</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {editingAccount && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={resetForm}
                    >
                      İptal
                    </button>
                  )}
                  <button type="submit" className="btn btn-primary btn-sm">
                    {editingAccount ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
