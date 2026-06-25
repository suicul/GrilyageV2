/** Форматирование цены из копеек: 39000 → "390 ₽" */
export function formatPrice(kopecks: number): string {
  const rubles = Math.floor(kopecks / 100);
  const remainder = kopecks % 100;
  const rublesStr = rubles.toLocaleString('ru-RU');
  return remainder === 0
    ? `${rublesStr} ₽`
    : `${rublesStr},${String(remainder).padStart(2, '0')} ₽`;
}

/** Форматирование цены из рублей + копеек: (1500, 0) → "1 500 ₽" */
export function formatProductPrice(rubles: number, kopecks: number): string {
  const rublesStr = rubles.toLocaleString('ru-RU');
  return kopecks === 0
    ? `${rublesStr} ₽`
    : `${rublesStr},${String(kopecks).padStart(2, '0')} ₽`;
}

/** Перевод рублей + копеек в копейки для расчётов */
export function toKopecks(rubles: number, kopecks: number): number {
  return rubles * 100 + Math.max(0, Math.min(99, kopecks));
}

/**
 * Нормализация текста для поиска (как в макете): нижний регистр, ё→е, трим.
 */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().replace(/ё/g, 'е').trim();
}

/** Маска телефона +7 (XXX) XXX-XX-XX (как в макете checkout). */
export function maskPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const p = digits.slice(1);
  let out = '+7';
  if (p.length > 0) out += ` (${p.slice(0, 3)}`;
  if (p.length >= 3) out += ')';
  if (p.length > 3) out += ` ${p.slice(3, 6)}`;
  if (p.length > 6) out += `-${p.slice(6, 8)}`;
  if (p.length > 8) out += `-${p.slice(8, 10)}`;
  return out;
}

/** Чистый E.164-формат для хранения: +7XXXXXXXXXX или null если не 11 цифр. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length !== 11 || !digits.startsWith('7')) return null;
  return `+${digits}`;
}
