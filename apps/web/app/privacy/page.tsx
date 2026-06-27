import Link from 'next/link';
import PublicShell from '@/components/public-shell';

export default function PrivacyPage() {
  return (
    <PublicShell headerSimple>
      <div className="page">

      <main style={{ maxWidth: 800, margin: '100px auto 40px', padding: '0 20px', color: 'var(--text)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>Политика конфиденциальности</h1>
        <p style={{ color: 'var(--wood)', fontSize: 13, marginBottom: 32 }}>Последнее обновление: 15 июня 2026 г.</p>

        <div style={{ display: 'grid', gap: 24, fontSize: 15, lineHeight: 1.7, color: 'var(--text)' }}>
          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>1. Общие положения</h2>
            <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта <strong>grilyazh-omsk.ru</strong> (далее — Оператор).</p>
            <p>Используя сайт, пользователь выражает согласие с условиями настоящей Политики.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>2. Какие данные собираются</h2>
            <p>При оформлении заказа и регистрации на сайте могут обрабатываться:</p>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Имя, фамилия</li>
              <li>Номер телефона</li>
              <li>Адрес электронной почты</li>
              <li>Адрес доставки</li>
              <li>Комментарии к заказу</li>
              <li>История заказов</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>3. Цели обработки</h2>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Приём, обработка и выполнение заказов</li>
              <li>Связь с пользователем по вопросам заказа</li>
              <li>Предоставление информации о статусе заказа</li>
              <li>Улучшение качества обслуживания</li>
              <li>Предоставление доступа к личному кабинету</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>4. Правовые основания</h2>
            <p>Обработка персональных данных осуществляется в соответствии с Федеральным законом № 152-ФЗ «О персональных данных» и Уставом Оператора.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>5. Хранение и защита</h2>
            <p>Персональные данные хранятся на территории Российской Федерации. Оператор принимает необходимые организационные и технические меры для защиты данных от несанкционированного доступа, изменения, раскрытия или уничтожения.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>6. Срок хранения</h2>
            <p>Персональные данные хранятся до момента отказа пользователя от обработки либо до ликвидации Оператора. Данные, необходимые для исполнения налогового законодательства, хранятся в течение установленного законом срока.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>7. Права пользователя</h2>
            <ul style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
              <li>Получить информацию об обработке своих персональных данных</li>
              <li>Требовать уточнения, блокирования или уничтожения данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
              <li>Обжаловать действия Оператора в уполномоченном органе</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#f4e1b3' }}>8. Контактная информация</h2>
            <p>По вопросам обработки персональных данных обращайтесь:</p>
            <p>Email: <a href="mailto:info@grilyazh-omsk.ru" style={{ color: '#f0cf86' }}>info@grilyazh-omsk.ru</a></p>
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

    </div>
    </PublicShell>
  );
}
