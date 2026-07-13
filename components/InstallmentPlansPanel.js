'use client';

import { useState } from 'react';
import {
  formatMonthKeyLabel,
  getPlanEndMonth,
} from '../lib/installmentPlans';

const formatNumber = (num) => {
  const [intPart, decPart] = Number(num).toFixed(2).split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart === '00' ? formattedInt : `${formattedInt},${decPart}`;
};

const parseNumber = (str) => {
  const normalized = String(str).replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
};

const emptyForm = (defaultStartMonth) => ({
  name: '',
  monthlyAmount: '',
  startMonth: defaultStartMonth,
  totalMonths: '20',
});

export default function InstallmentPlansPanel({
  isOpen,
  onClose,
  plans,
  onSavePlans,
  monthNames,
  defaultStartMonth,
}) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(defaultStartMonth));

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm(defaultStartMonth));
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      monthlyAmount: formatNumber(plan.monthlyAmount),
      startMonth: plan.startMonth,
      totalMonths: String(plan.totalMonths),
    });
  };

  const handleDelete = (planId) => {
    if (!window.confirm('Bu taksit planını silmek istiyor musunuz? Verisi olan aylardan otomatik ödemeler kaldırılır.')) {
      return;
    }
    onSavePlans(plans.filter((plan) => plan.id !== planId));
    if (editingId === planId) resetForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const monthlyAmount = parseNumber(form.monthlyAmount);
    const totalMonths = parseInt(form.totalMonths, 10);

    if (!name || monthlyAmount <= 0 || !form.startMonth || totalMonths < 1) return;

    const payload = {
      id: editingId || Date.now(),
      name,
      monthlyAmount,
      startMonth: form.startMonth,
      totalMonths,
    };

    if (editingId) {
      onSavePlans(plans.map((plan) => (plan.id === editingId ? payload : plan)));
    } else {
      onSavePlans([...plans, payload]);
    }

    resetForm();
  };

  const handleAmountChange = (e) => {
    let raw = e.target.value.replace(/[^\d.,]/g, '');
    const parts = raw.split(',');
    if (parts.length > 2) raw = `${parts[0]},${parts.slice(1).join('')}`;
    if (parts.length === 2 && parts[1].length > 2) raw = `${parts[0]},${parts[1].slice(0, 2)}`;
    setForm({ ...form, monthlyAmount: raw });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal installment-plans-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Taksit Planları</h3>
          <button className="modal-close" onClick={onClose} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="installment-plans-intro">
          Uzun vadeli taksitlerinizi planlayın. Sadece verisi olan aylara otomatik ödemelere eklenir;
          yeni ay açtığınızda plan hâlâ geçerliyse kendiliğinden görünür.
        </p>

        {plans.length > 0 && (
          <div className="installment-plans-list">
            {plans.map((plan) => (
              <div key={plan.id} className="installment-plan-card">
                <div className="installment-plan-card-main">
                  <div className="installment-plan-name">{plan.name}</div>
                  <div className="installment-plan-meta">
                    {formatNumber(plan.monthlyAmount)} ₺/ay · {plan.totalMonths} ay
                  </div>
                  <div className="installment-plan-range">
                    {formatMonthKeyLabel(plan.startMonth, monthNames)}
                    {' → '}
                    {formatMonthKeyLabel(getPlanEndMonth(plan), monthNames)}
                  </div>
                </div>
                <div className="installment-plan-card-actions">
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleEdit(plan)}>
                    Düzenle
                  </button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleDelete(plan.id)}>
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="installment-plan-form">
          <h4 className="installment-plan-form-title">
            {editingId ? 'Planı Düzenle' : 'Yeni Taksit Planı'}
          </h4>
          <div className="input-group">
            <label>Taksit adı</label>
            <input
              type="text"
              className="input"
              placeholder="örn: Araba taksiti"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>Aylık taksit</label>
            <div className="input-currency">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="input"
                placeholder="0"
                value={form.monthlyAmount}
                onChange={handleAmountChange}
              />
              <span className="currency">₺</span>
            </div>
          </div>
          <div className="installment-plan-form-row">
            <div className="input-group">
              <label>Başlangıç ayı</label>
              <input
                type="month"
                className="input"
                value={form.startMonth}
                min="2026-01"
                onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
              />
            </div>
            <div className="input-group">
              <label>Taksit sayısı</label>
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="360"
                className="input"
                value={form.totalMonths}
                onChange={(e) => setForm({ ...form, totalMonths: e.target.value })}
              />
            </div>
          </div>
          <div className="installment-plan-form-actions">
            {editingId && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={resetForm}>
                İptal
              </button>
            )}
            <button className="btn btn-primary btn-sm" type="submit">
              {editingId ? 'Güncelle' : 'Plan Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
