/** Цена продукта — рубли + копейки для удобного ввода */
export interface ProductPrice {
  priceRubles: number;
  priceKopecks: number;
}

/** Полная цена в копейках (для расчётов) */
export interface PriceInKopecks {
  price: number;
}
