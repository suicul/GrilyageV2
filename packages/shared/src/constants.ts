/**
 * Денежные значения хранятся в КОПЕЙКАХ (integer).
 * Источник значений: дизайн-макет grilyazh_mockup.html.
 */

/** Бесплатная доставка от 1500 ₽ */
export const FREE_DELIVERY_THRESHOLD_KOPECKS = 150_000;

/** Базовая стоимость доставки 199 ₽ */
export const BASE_DELIVERY_COST_KOPECKS = 19_900;

/** Расчёт стоимости доставки по сумме корзины (в копейках). */
export function getDeliveryCost(itemsTotalKopecks: number, mode: DeliveryMode): number {
  if (mode === DeliveryMode.PICKUP) return 0;
  return itemsTotalKopecks >= FREE_DELIVERY_THRESHOLD_KOPECKS ? 0 : BASE_DELIVERY_COST_KOPECKS;
}

export enum DeliveryMode {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export enum PaymentMethod {
  /** Наличными при получении */
  CASH = 'CASH',
  /** Картой курьеру/на кассе при получении */
  CARD_ON_DELIVERY = 'CARD_ON_DELIVERY',
  // ONLINE — зарезервировано под будущий платёжный шлюз (v2)
}

export enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  COOKING = 'COOKING',
  DELIVERING = 'DELIVERING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Валидные переходы статусной машины заказа. */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  [OrderStatus.NEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.COOKING, OrderStatus.CANCELLED],
  [OrderStatus.COOKING]: [
    OrderStatus.DELIVERING,
    OrderStatus.READY_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.DELIVERING]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export enum StaffRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

/** Часы работы (из макета about.html) */
export const WORKING_HOURS = {
  weekdays: { open: '08:00', close: '21:00' },
  weekends: { open: '09:00', close: '21:00' },
} as const;
