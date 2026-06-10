import { describe, expect, it } from 'vitest';
import {
  BASE_DELIVERY_COST_KOPECKS,
  canTransition,
  DeliveryMode,
  FREE_DELIVERY_THRESHOLD_KOPECKS,
  getDeliveryCost,
  ORDER_STATUS_TRANSITIONS,
  OrderStatus,
} from './constants';

describe('getDeliveryCost', () => {
  it('самовывоз всегда бесплатный', () => {
    expect(getDeliveryCost(0, DeliveryMode.PICKUP)).toBe(0);
    expect(getDeliveryCost(10_000, DeliveryMode.PICKUP)).toBe(0);
    expect(getDeliveryCost(1_000_000, DeliveryMode.PICKUP)).toBe(0);
  });

  it('доставка ниже порога стоит 199 ₽', () => {
    expect(getDeliveryCost(0, DeliveryMode.DELIVERY)).toBe(BASE_DELIVERY_COST_KOPECKS);
    expect(getDeliveryCost(149_999, DeliveryMode.DELIVERY)).toBe(BASE_DELIVERY_COST_KOPECKS);
  });

  it('доставка от 1500 ₽ (включительно) бесплатна', () => {
    expect(getDeliveryCost(FREE_DELIVERY_THRESHOLD_KOPECKS, DeliveryMode.DELIVERY)).toBe(0);
    expect(getDeliveryCost(150_001, DeliveryMode.DELIVERY)).toBe(0);
  });
});

describe('статусная машина заказа', () => {
  it('NEW → CONFIRMED и CANCELLED разрешены', () => {
    expect(canTransition(OrderStatus.NEW, OrderStatus.CONFIRMED)).toBe(true);
    expect(canTransition(OrderStatus.NEW, OrderStatus.CANCELLED)).toBe(true);
  });

  it('NEW → COMPLETED запрещён (нельзя перепрыгнуть)', () => {
    expect(canTransition(OrderStatus.NEW, OrderStatus.COMPLETED)).toBe(false);
  });

  it('COOKING ветвится на DELIVERING и READY_FOR_PICKUP', () => {
    expect(canTransition(OrderStatus.COOKING, OrderStatus.DELIVERING)).toBe(true);
    expect(canTransition(OrderStatus.COOKING, OrderStatus.READY_FOR_PICKUP)).toBe(true);
  });

  it('терминальные статусы не имеют переходов', () => {
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.COMPLETED]).toHaveLength(0);
    expect(ORDER_STATUS_TRANSITIONS[OrderStatus.CANCELLED]).toHaveLength(0);
  });

  it('обратные переходы запрещены', () => {
    expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.NEW)).toBe(false);
    expect(canTransition(OrderStatus.DELIVERING, OrderStatus.COOKING)).toBe(false);
  });

  it('каждый статус присутствует в карте переходов', () => {
    for (const status of Object.values(OrderStatus)) {
      expect(ORDER_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });
});
