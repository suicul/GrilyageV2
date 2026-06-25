'use client';

import Link from 'next/link';
import AuthModal from '@/components/auth-modal';
import { useAuth } from '@/lib/auth-context';
import Header from '@/components/header';

export default function TermsPage() {
  const { authModalOpen, setAuthModalOpen } = useAuth();

  return (
    <div className="page">
      <Header simple onAuthOpen={() => setAuthModalOpen((v) => !v)} />

      <main style={{ maxWidth: 800, margin: '100px auto 40px', padding: '0 20px', color: 'var(--text)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>Условия использования</h1>
        <p style={{ color: 'var(--wood)', fontSize: 13, marginBottom: 32 }}>Последнее обновление: 15 июня 2026 г.</p>

        <div style={{ display: 'grid', gap: 24, fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>1. Общие условия</h2>
            <p>Настоящие Условия использования регулируют порядок использования сайта <strong>grilyazh-omsk.ru</strong> и сервиса заказа продукции (далее — Сервис).</p>
            <p>Оформляя заказ, пользователь подтверждает, что ознакомлен и согласен с настоящими Условиями.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>2. Оформление заказа</h2>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Заказ считается принятым после подтверждения оператором.</li>
              <li>Состав, стоимость и сроки готовности уточняются при подтверждении.</li>
              <li>Изменение или отмена заказа возможны до начала приготовления.</li>
              <li>Сервис оставляет за собой право отказать в приёме заказа при отсутствии необходимых ингредиентов или производственной возможности.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>3. Оплата</h2>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Оплата возможна онлайн на сайте, картой при получении или наличными курьеру.</li>
              <li>Цены указаны в рублях с учётом НДС.</li>
              <li>Стоимость доставки рассчитывается отдельно, если сумма заказа меньше порога бесплатной доставки.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>4. Доставка и самовывоз</h2>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Самовывоз осуществляется по адресу: Омск, Харьковская, 7.</li>
              <li>Доставка выполняется по зоне обслуживания в Омске.</li>
              <li>Сроки доставки согласовываются при подтверждении заказа.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>5. Возврат и качество</h2>
            <p>В соответствии с законодательством РФ, продовольственные товары надлежащего качества не подлежат возврату или обмену. При обнаружении недостатков продукции просим связаться с нами для решения ситуации.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>6. Ответственность</h2>
            <p>Сервис не несёт ответственности за убытки, возникшие в результате:</p>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Предоставления пользователем недостоверной информации</li>
              <li>Несанкционированного доступа к учётной записи пользователя</li>
              <li>Обстоятельств непреодолимой силы</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>7. Изменение условий</h2>
            <p>Сервис оставляет за собой право вносить изменения в настоящие Условия. Актуальная версия всегда доступна на данной странице.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>8. Контакты</h2>
            <p>По всем вопросам: <a href="mailto:info@grilyazh-omsk.ru" style={{ color: '#f0cf86' }}>info@grilyazh-omsk.ru</a></p>
            <p>Телефон: <a href="tel:+73812900000" style={{ color: '#f0cf86' }}>+7 (3812) 90-00-00</a></p>
          </section>
        </div>
      </main>

      <footer id="contacts" className="footer">
        <div className="footer-grid">
          <div className="footer-left">
            <div className="footer-eyebrow">Контакты</div>
            <div className="footer-phone"><a href="tel:+73812900000">+7 (3812) 90-00-00</a></div>
            <div className="footer-addr">Омск, Харьковская, 7</div>
            <div className="footer-email"><a href="mailto:info@grilyazh-omsk.ru">info@grilyazh-omsk.ru</a></div>
            <div className="footer-hours">Пн–Пт 08:00–21:00<br />Сб–Вс 09:00–21:00</div>
            <div className="footer-links">
              <Link href="/privacy">Политика конфиденциальности</Link>
              <Link href="/terms">Условия использования</Link>
            </div>
          </div>
          <div className="footer-map">
            <div className="about-map" style={{ borderRadius: 28, overflow: 'hidden', height: '100%', minHeight: 300, background: '#1a1410' }}>
              <iframe title="Яндекс Карта" src="https://yandex.com/map-widget/v1/?ll=73.415716%2C54.946418&mode=poi&poi%5Bpoint%5D=73.414391%2C54.946248&poi%5Buri%5D=ymapsbm1%3A%2F%2Forg%3Foid%3D19567134820&z=18" width="100%" height="100%" style={{ border: 0, minHeight: 300 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>
        </div>
      </footer>

      {authModalOpen && <AuthModal />}
    </div>
  );
}
