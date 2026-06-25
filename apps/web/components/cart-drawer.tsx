'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCart } from '@/lib/cart-context';
import { formatPrice, maskPhone, DeliveryMode, FREE_DELIVERY_THRESHOLD_KOPECKS, getDeliveryCost } from '@grilyage/shared';
import { useAuth } from '@/lib/auth-context';

export default function CartDrawer() {
  const { cart, cartQty, cartOpen, closeCart, changeQty, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(DeliveryMode.PICKUP);
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user?.name) setCustomerName(user.name);
    if (user?.email) setEmail(user.email);
    if (user?.phone) setPhone(user.phone);
  }, [user]);
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const deliveryCost = getDeliveryCost(subtotal, deliveryMode);
  const total = subtotal + deliveryCost;

  const _deliveryProgress = deliveryMode === DeliveryMode.PICKUP
    ? 100
    : Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD_KOPECKS) * 100));

  const handleCheckout = useCallback(() => {
    if (checkoutMode) return;
    closeCart();
    setCheckoutMode(true);
    window.dispatchEvent(new CustomEvent('grilyazh-checkout-open'));
  }, [checkoutMode, closeCart]);

  async function submitOrder() {
    if (!customerName.trim() || !phone.trim()) {
      setToast('Заполните имя и телефон');
      return;
    }
    if (deliveryMode === DeliveryMode.DELIVERY && !address.trim()) {
      setToast('Укажите адрес доставки');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        items: cart.map((item) => ({ productId: item.slug || item.name, qty: item.qty })),
        deliveryMode,
        paymentMethod: 'CASH',
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim() || undefined,
        address: deliveryMode === DeliveryMode.DELIVERY ? address.trim() : undefined,
        comment: comment.trim() || undefined,
      };
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Ошибка сервера' }));
        setToast(err.message || 'Не удалось оформить заказ');
        setSubmitting(false);
        return;
      }
      const order = await res.json();
      window.localStorage.setItem('grilyazh-last-order', JSON.stringify(order));
      clearCart();
      closeCart();
      setCheckoutMode(false);
      setToast(`Заказ №${order.number || order.id} принят. Оператор свяжется с вами.`);
    } catch {
      setToast('Не удалось отправить заказ. Проверьте подключение к интернету.');
    }
    setSubmitting(false);
  }

  const closeAll = useCallback(() => {
    closeCart();
    setCheckoutMode(false);
  }, [closeCart]);

  return (
    <>
      <div className={`overlay ${cartOpen || checkoutMode ? 'open' : ''}`} onClick={closeAll} />
      <aside className={`cart ${cartOpen || checkoutMode ? 'open' : ''}`} aria-label="Корзина">
        {!checkoutMode ? (
          <>
            <header>
              <div>
                <h2>Корзина</h2>
                <p>{cartQty} позиций</p>
              </div>
              <button onClick={closeCart}>×</button>
            </header>
            <div className="cart-list">
              {cart.length === 0 ? (
                <p className="empty">Корзина пока пустая</p>
              ) : (
                cart.map((item) => (
                  <div className="cart-item" key={item.name}>
                    <img src={item.image} alt="" />
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.weight} · {formatPrice(item.price)}
                      </small>
                      <div>
                        <button onClick={() => changeQty(item.name, -1)}>−</button>
                        <span>{item.qty}</span>
                        <button onClick={() => changeQty(item.name, 1)}>+</button>
                      </div>
                    </div>
                    <b>{formatPrice(item.price * item.qty)}</b>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <div className="summary">
                <p>
                  <span>Сумма</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </p>
                <button onClick={handleCheckout}>Оформить заказ</button>
              </div>
            )}
          </>
        ) : (
          <>
            <header>
              <div>
                <h2>Оформление заказа</h2>
                <p>{cartQty} позиций · {formatPrice(subtotal)}</p>
              </div>
              <button onClick={closeAll}>×</button>
            </header>
            <div className="checkout">
              <div className="toggle">
                <button
                  className={deliveryMode === DeliveryMode.PICKUP ? 'active' : ''}
                  onClick={() => setDeliveryMode(DeliveryMode.PICKUP)}
                >
                  Самовывоз
                </button>
                <button
                  className={deliveryMode === DeliveryMode.DELIVERY ? 'active' : ''}
                  onClick={() => setDeliveryMode(DeliveryMode.DELIVERY)}
                >
                  Доставка
                </button>
              </div>
              <label>
                Имя
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Как к вам обращаться"
                />
              </label>
              <label>
                Телефон
                <input
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="+7 (___) ___-__-__"
                />
              </label>
              <label>
                Email (для чека)
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ваш@email. ru"
                />
              </label>
              <label>
                {deliveryMode === DeliveryMode.PICKUP ? 'Точка самовывоза' : 'Адрес доставки'}
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={deliveryMode === DeliveryMode.PICKUP ? 'Харьковская, 7' : 'Улица, дом, квартира'}
                />
              </label>
              <label>
                Комментарий
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Время, пожелания, приборы"
                />
              </label>
              <p className="total">
                <span>К оплате</span>
                <strong>{formatPrice(total)}</strong>
              </p>
              <button onClick={submitOrder} disabled={submitting}>
                {submitting ? 'Отправка...' : 'Подтвердить заказ'}
              </button>
              <button className="ghost" onClick={() => setCheckoutMode(false)}>
                Назад в корзину
              </button>
            </div>
          </>
        )}
      </aside>
      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}
