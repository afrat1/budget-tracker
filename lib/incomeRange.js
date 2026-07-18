const round2 = (num) => Math.round(num * 100) / 100;

export const normalizeIncomeRange = (minValue, maxValue) => {
  const min = round2(Number(minValue) || 0);
  const max = round2(Number(maxValue) || 0);
  if (min === 0 && max === 0) return { min: 0, max: 0 };
  if (max === 0 && min > 0) return { min, max: min };
  if (min === 0 && max > 0) return { min: max, max };
  if (min > max) return { min: max, max: min };
  return { min, max };
};

/** Resolve income min/max from month payload (legacy `income` only supported). */
export const getIncomeRange = (monthData) => {
  if (!monthData) return { min: 0, max: 0 };

  const legacy = monthData.income || 0;
  const hasMin = monthData.incomeMin != null;
  const hasMax = monthData.incomeMax != null;

  // Only legacy field present
  if (!hasMin && !hasMax) {
    return normalizeIncomeRange(legacy, legacy);
  }

  const min = hasMin ? Number(monthData.incomeMin) || 0 : 0;
  const max = hasMax ? Number(monthData.incomeMax) || 0 : 0;

  // Both stored as 0 but legacy income exists (don't wipe real income)
  if (min === 0 && max === 0 && legacy > 0) {
    return normalizeIncomeRange(legacy, legacy);
  }

  if (!hasMin) return normalizeIncomeRange(max || legacy, max || legacy);
  if (!hasMax) return normalizeIncomeRange(min || legacy, min || legacy);
  return normalizeIncomeRange(min, max);
};

export const getAccountsBalance = (monthData) => {
  if (!monthData) return 0;
  if (monthData.bankAccounts?.length > 0) {
    return round2(monthData.bankAccounts.reduce((sum, account) => sum + (account.amount || 0), 0));
  }
  return round2(monthData.balance || 0);
};

/** Bank balance range: min = booked accounts, max = projectedBalanceMax when set. */
export const getBalanceRange = (monthData) => {
  const balanceMin = getAccountsBalance(monthData);
  const projectedMax = monthData?.projectedBalanceMax;
  if (projectedMax != null && round2(projectedMax) !== balanceMin) {
    const max = round2(projectedMax);
    return max >= balanceMin
      ? { min: balanceMin, max }
      : { min: max, max: balanceMin };
  }
  return { min: balanceMin, max: balanceMin };
};

export const hasIncomeRange = (incomeMin, incomeMax) => {
  const { min, max } = normalizeIncomeRange(incomeMin, incomeMax);
  return max > min;
};

export const formatMoneyRange = (min, max, formatNumber) => {
  const a = round2(min);
  const b = round2(max);
  if (a === b) return `${formatNumber(a)} ₺`;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${formatNumber(lo)} – ${formatNumber(hi)} ₺`;
};

export const calculateRemainingRange = (monthData) => {
  const { min: balanceMin, max: balanceMax } = getBalanceRange(monthData);
  const { min: incomeMin, max: incomeMax } = getIncomeRange(monthData);
  const reservedCash = monthData?.reservedCash ?? monthData?.cash ?? 0;
  const totalAutomatic = round2((monthData?.automaticPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0));
  const totalCredit = round2((monthData?.creditPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0));
  const expenses = round2(totalAutomatic + totalCredit);

  const remainingMin = round2(balanceMin + incomeMin - reservedCash - expenses);
  const remainingMax = round2(balanceMax + incomeMax - reservedCash - expenses);

  return {
    min: Math.min(remainingMin, remainingMax),
    max: Math.max(remainingMin, remainingMax),
  };
};

export const buildIncomeFields = (incomeMin, incomeMax) => {
  const { min, max } = normalizeIncomeRange(incomeMin, incomeMax);
  return {
    incomeMin: min,
    incomeMax: max,
    income: max,
  };
};
