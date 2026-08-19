/** Formátuje sumu s medzerou ako oddeľovačom tisícov, bodkou ako desatinnou čiarkou (napr. 53960.25 -> "53 960.25"). */
export function formatThousands(n: number): string {
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSpaces}.${decPart}`;
}
