const eurFormatter = new Intl.NumberFormat("sl-SI", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(amount: number): string {
  return eurFormatter.format(amount);
}
