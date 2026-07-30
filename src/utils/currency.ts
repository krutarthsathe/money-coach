const formatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
});

export const formatCad = (value: number) =>
  formatter.format(Number.isFinite(value) ? Math.max(0, value) : 0);
