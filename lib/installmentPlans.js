export const INSTALLMENT_PLANS_KEY = 'installmentPlans';

export const isBudgetMonthKey = (key) => /^\d{4}-\d{2}$/.test(key);

export const addMonthsToKey = (monthKey, count) => {
  const [yearStr, monthStr] = monthKey.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + count, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getPlanEndMonth = (plan) => addMonthsToKey(plan.startMonth, plan.totalMonths - 1);

export const planAppliesToMonth = (plan, monthKey) => {
  if (!plan?.startMonth || !plan?.totalMonths) return false;
  const endMonth = getPlanEndMonth(plan);
  return monthKey >= plan.startMonth && monthKey <= endMonth;
};

export const getInstallmentPaymentId = (planId, monthKey) => `installment-${planId}-${monthKey}`;

export const getManualAutomaticPayments = (automaticPayments) =>
  (automaticPayments || []).filter((payment) => !payment.installmentPlanId);

export const monthHasUserData = (monthData) => {
  if (!monthData) return false;

  const accounts = monthData.bankAccounts?.length > 0
    ? monthData.bankAccounts
    : ((monthData.balance || 0) > 0 ? [{ amount: monthData.balance }] : []);
  const balance = accounts.reduce((sum, account) => sum + account.amount, 0);
  const reservedCash = monthData.reservedCash ?? monthData.cash ?? 0;
  const manualAutomatic = getManualAutomaticPayments(monthData.automaticPayments);

  return balance > 0
    || reservedCash > 0
    || (monthData.income || 0) > 0
    || (monthData.target || 0) > 0
    || manualAutomatic.length > 0
    || (monthData.creditPayments?.length || 0) > 0;
};

export const applyInstallmentPlansToMonth = (automaticPayments, plans, monthKey, hasUserData = true) => {
  const manualPayments = getManualAutomaticPayments(automaticPayments);

  if (!hasUserData) {
    return manualPayments;
  }

  const planPayments = (plans || [])
    .filter((plan) => planAppliesToMonth(plan, monthKey))
    .map((plan) => ({
      id: getInstallmentPaymentId(plan.id, monthKey),
      name: plan.name,
      amount: plan.monthlyAmount,
      installmentPlanId: plan.id,
    }));

  return [...manualPayments, ...planPayments];
};

export const syncInstallmentPlansAcrossAllData = (allData) => {
  const plans = allData[INSTALLMENT_PLANS_KEY] || [];

  Object.keys(allData).forEach((key) => {
    if (key === INSTALLMENT_PLANS_KEY || !isBudgetMonthKey(key)) return;

    const monthData = allData[key];
    if (!monthData || typeof monthData !== 'object') return;

    const hasUserData = monthHasUserData(monthData);

    monthData.automaticPayments = applyInstallmentPlansToMonth(
      monthData.automaticPayments,
      plans,
      key,
      hasUserData,
    );
  });

  return allData;
};

export const formatMonthKeyLabel = (monthKey, monthNames) => {
  const [yearStr, monthStr] = monthKey.split('-');
  const monthIndex = Number(monthStr) - 1;
  return `${monthNames[monthIndex] || monthStr} ${yearStr}`;
};

export const getPlanProgressLabel = (plan, monthKey) => {
  if (!planAppliesToMonth(plan, monthKey)) return null;
  const startYear = Number(plan.startMonth.split('-')[0]);
  const startMonth = Number(plan.startMonth.split('-')[1]);
  const currentYear = Number(monthKey.split('-')[0]);
  const currentMonth = Number(monthKey.split('-')[1]);
  const index = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
  return `${index}/${plan.totalMonths}`;
};
