'use client';

import { useState } from 'react';

export default function PaymentList({ payments, onAdd, onDelete, onEdit, onReorder, onCopyToNextMonth, type }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [newPayment, setNewPayment] = useState({ name: '', amount: '' });

  const typeConfig = {
    automatic: {
      title: 'Otomatik Ödemeler',
      subtitle: 'Fatura, abonelik, aidat vb.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
        </svg>
      ),
    },
    credit: {
      title: 'Kredi Taksitleri',
      subtitle: 'Banka kredileri, kredi kartı taksitleri',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
  };

  const config = typeConfig[type];

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPayment.name && newPayment.amount) {
      if (editingPayment) {
        // Edit mode
        onEdit({
          ...editingPayment,
          name: newPayment.name,
          amount: parseNumber(newPayment.amount),
        });
      } else {
        // Add mode
        onAdd({
          id: Date.now(),
          name: newPayment.name,
          amount: parseNumber(newPayment.amount),
          type,
        });
      }
      handleCloseModal();
    }
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
    
    setNewPayment({ ...newPayment, amount: raw });
  };

  const handleOpenAdd = () => {
    setEditingPayment(null);
    setNewPayment({ name: '', amount: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (payment) => {
    setEditingPayment(payment);
    setNewPayment({ 
      name: payment.name, 
      amount: formatNumber(payment.amount) 
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPayment(null);
    setNewPayment({ name: '', amount: '' });
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <div className="card">
        <div className="card-title">
          {config.icon}
          {config.title}
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {config.subtitle}
        </p>

        {payments.length > 0 ? (
          <div className="payment-list">
            {payments.map((payment, index) => (
              <div key={payment.id} className="payment-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '12px' }}>
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => onReorder && onReorder(index, index - 1)}
                    disabled={index === 0}
                    title="Yukarı"
                    style={{ padding: '4px', opacity: index === 0 ? 0.3 : 1 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => onReorder && onReorder(index, index + 1)}
                    disabled={index === payments.length - 1}
                    title="Aşağı"
                    style={{ padding: '4px', opacity: index === payments.length - 1 ? 0.3 : 1 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
                <div className="payment-item-info" style={{ flex: 1 }}>
                  <span className="payment-item-name">{payment.name}</span>
                  <span className="payment-item-type">{type === 'automatic' ? 'OTOMATİK ÖDEME' : 'KREDİ TAKSİTİ'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="payment-item-amount">-{formatNumber(payment.amount)} ₺</span>
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => handleOpenEdit(payment)}
                    title="Düzenle"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => onDelete(payment.id)}
                    title="Sil"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Henüz ödeme eklenmedi</p>
          </div>
        )}

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            Toplam: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{formatNumber(totalPayments)} ₺</span>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {payments.length > 0 && onCopyToNextMonth && (
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={onCopyToNextMonth}
                title="Sonraki Aya Kopyala"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                Sonraki Aya
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="16" height="16">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Ekle
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingPayment ? 'Düzenle' : 'Yeni'} {type === 'automatic' ? 'Otomatik Ödeme' : 'Kredi Taksiti'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Ödeme Adı</label>
                <input
                  type="text"
                  className="input"
                  placeholder={type === 'automatic' ? 'örn: Elektrik Faturası' : 'örn: Ev Kredisi'}
                  value={newPayment.name}
                  onChange={(e) => setNewPayment({ ...newPayment, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="input-group">
                <label>Aylık Tutar</label>
                <div className="input-currency">
                  <input
                    type="text"
                    className="input"
                    placeholder="0"
                    value={newPayment.amount}
                    onChange={handleAmountChange}
                  />
                  <span className="currency">₺</span>
                </div>
              </div>
              <button type="submit" className="btn btn-success btn-full" style={{ marginTop: '8px' }}>
                {editingPayment ? 'Güncelle' : 'Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
