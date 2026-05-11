export const formatCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

export const formatNumber = (value: number, opts: Intl.NumberFormatOptions = {}) =>
  new Intl.NumberFormat("en-US", opts).format(value);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const maskAccount = (acct: string) => {
  if (acct.length <= 4) return acct;
  return `•••• ${acct.slice(-4)}`;
};
