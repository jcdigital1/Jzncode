/**
 * Formata timestamps de leitura de forma amigável:
 * Ex: "Hoje, 14:32" ou "16/09/2026 às 07:45" ou "Nunca lido"
 */
export function formatScanDate(val: any): string {
  if (!val) return 'Nunca lido';
  let date: Date;

  try {
    if (typeof val?.toDate === 'function') {
      date = val.toDate();
    } else if (typeof val?.toMillis === 'function') {
      date = new Date(val.toMillis());
    } else if (val?._seconds) {
      date = new Date(val._seconds * 1000);
    } else if (typeof val === 'string' || typeof val === 'number') {
      date = new Date(val);
    } else {
      date = new Date(val);
    }

    if (isNaN(date.getTime())) return 'Nunca lido';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (isToday) {
      return `Hoje, ${hours}:${minutes}`;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return 'Nunca lido';
  }
}
