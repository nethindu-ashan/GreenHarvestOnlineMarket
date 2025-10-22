export function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (Number.isNaN(num)) return 'Rs 0.00';
  return 'Rs ' + num.toFixed(2);
}

export default formatCurrency;
