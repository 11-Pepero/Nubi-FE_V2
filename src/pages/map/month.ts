/** "yyyy-MM" 에 n달을 더합니다. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthNumber(month: string): number {
  return Number(month.split('-')[1])
}
