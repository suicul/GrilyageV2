import { describe, expect, it } from 'vitest';
import { formatPrice, maskPhone, normalizePhone, normalizeSearchText } from './format';

describe('formatPrice', () => {
  it('целые рубли без копеек', () => {
    expect(formatPrice(39_000)).toBe('390 ₽');
    expect(formatPrice(19_900)).toBe('199 ₽');
  });

  it('копейки добавляются через запятую', () => {
    expect(formatPrice(39_050)).toBe('390,50 ₽');
    expect(formatPrice(105)).toBe('1,05 ₽');
  });

  it('тысячи с разделителем ru-RU', () => {
    const result = formatPrice(150_000);
    // 1500 ₽; разделитель тысяч — неразрывный пробел в ru-RU
    expect(result.replace(/\u00a0|\u202f/g, ' ')).toBe('1 500 ₽');
  });

  it('ноль', () => {
    expect(formatPrice(0)).toBe('0 ₽');
  });
});

describe('normalizeSearchText', () => {
  it('нижний регистр и ё→е', () => {
    expect(normalizeSearchText('СлоЁная')).toBe('слоеная');
  });
  it('трим пробелов', () => {
    expect(normalizeSearchText('  торт  ')).toBe('торт');
  });
});

describe('maskPhone', () => {
  it('полный номер с 9', () => {
    expect(maskPhone('9991234567')).toBe('+7 (999) 123-45-67');
  });
  it('номер начинающийся с 8 конвертируется', () => {
    expect(maskPhone('89991234567')).toBe('+7 (999) 123-45-67');
  });
  it('номер с +7', () => {
    expect(maskPhone('+79991234567')).toBe('+7 (999) 123-45-67');
  });
  it('частичный ввод', () => {
    expect(maskPhone('999')).toBe('+7 (999)');
  });
  it('пустая строка', () => {
    expect(maskPhone('')).toBe('+7');
  });
});

describe('normalizePhone', () => {
  it('валидные форматы → E.164', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('+79991234567');
    expect(normalizePhone('89991234567')).toBe('+79991234567');
    expect(normalizePhone('+79991234567')).toBe('+79991234567');
  });
  it('невалидные → null', () => {
    expect(normalizePhone('123')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('+1 555 0100')).toBeNull();
  });
});
