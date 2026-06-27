import PublicShell from '@/components/public-shell';

const sectionStyle: React.CSSProperties = {
  padding: 24,
  borderRadius: 28,
  background: '#fffdf8',
  border: '1px solid #eadfcf',
  boxShadow: '0 12px 30px rgba(47,38,31,.06)',
};

export default function AboutPage() {
  return (
    <PublicShell headerStickyMode>
      <main className="page">

      <section className="hero" style={{
        marginTop: 18,
        borderRadius: 30,
        overflow: 'hidden',
        color: '#fff',
        background: 'linear-gradient(125deg, rgba(18,12,8,.94), rgba(35,24,17,.74)), url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80) center/cover no-repeat',
      }}>
        <div style={{ padding: '54px 34px 34px', maxWidth: 760 }}>
          <h1 style={{ margin: '10px 0 0', fontSize: 56, lineHeight: 1 }}>
            О производстве Грильяж
          </h1>
          <p style={{ margin: '16px 0 0', fontSize: 18, lineHeight: 1.66, color: 'rgba(255,255,255,.82)' }}>
            Грильяж Gastro-House — это кухня полного цикла, собственная пекарня и кондитерское направление. Мы делаем упор на понятный сервис, стабильное качество и удобный предзаказ с доставкой или самовывозом.
          </p>
        </div>
      </section>

      <div style={{ marginTop: 24, display: 'grid', gap: 18 }}>
        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Что важно о нас</h2>
          <div className="about-grid-3">
            <div className="about-card">
              <h3>Производство</h3>
              <p>Ежедневная работа кухни, пекарни и кондитерского направления с контролем сборки и упаковки заказов.</p>
            </div>
            <div className="about-card">
              <h3>Сервис</h3>
              <p>Самовывоз, доставка, предзаказ, понятные сроки готовности и быстрый контакт с гостем по каждому заказу.</p>
            </div>
            <div className="about-card">
              <h3>Фокус</h3>
              <p>Блюда на каждый день, выпечка, десерты, бизнес-ланчи и позиции для регулярного заказа домой или в офис.</p>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Производство и вакансии</h2>
          <div className="about-grid-2">
            <div className="about-card">
              <h3>Как организована работа</h3>
              <ul>
                <li>Кухня полного цикла с ежедневной подготовкой и сборкой блюд.</li>
                <li>Отдельные процессы для горячего цеха, выпечки и десертов.</li>
                <li>Контроль комплектности заказа перед выдачей и доставкой.</li>
                <li>Соблюдение температурного режима и аккуратной упаковки.</li>
              </ul>
            </div>
            <div className="about-card">
              <h3>Кого мы ищем</h3>
              <ul>
                <li>Повар горячего цеха</li>
                <li>Пекарь / кондитер</li>
                <li>Оператор заказов / администратор</li>
              </ul>
              <p>По вакансиям: <strong>+7 (3812) 90-00-00</strong>, <strong>info@grilyazh-omsk.ru</strong></p>
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Доставка, оплата и карта</h2>
          <div className="about-grid-2">
            <div className="about-card">
              <h3>Условия</h3>
              <ul>
                <li>Самовывоз доступен ежедневно в часы работы.</li>
                <li>Доставка выполняется по зоне обслуживания в Омске.</li>
                <li>Оплата: онлайн, картой при получении, наличными при доставке.</li>
                <li>Адрес точки выдачи: Омск, Харьковская, 7.</li>
                <li>Режим работы: Пн–Пт 08:00–21:00, Сб–Вс 09:00–21:00.</li>
              </ul>
            </div>
            <div className="about-map">
              <iframe
                title="Яндекс Карта: Грильяж"
                src="https://yandex.com/map-widget/v1/?ll=73.415716%2C54.946418&mode=poi&poi%5Bpoint%5D=73.414391%2C54.946248&poi%5Buri%5D=ymapsbm1%3A%2F%2Forg%3Foid%3D19567134820&z=18"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Юридическая информация</h2>
          <div className="legal">
            <div className="about-card">
              <h3>Политика конфиденциальности</h3>
              <p>При оформлении заказа могут обрабатываться имя, телефон, email, адрес доставки и комментарии, необходимые для исполнения заказа и обратной связи.</p>
            </div>
            <div className="about-card">
              <h3>Согласие на обработку персональных данных</h3>
              <p>Отправляя формы на сайте, пользователь подтверждает согласие на обработку персональных данных в объёме, необходимом для приёма, подтверждения и сопровождения заказа.</p>
            </div>
            <div className="about-card">
              <h3>Условия заказа и возврата</h3>
              <p>Состав заказа, стоимость, сроки готовности и формат получения уточняются при подтверждении. Для пищевой продукции действуют ограничения возврата по действующим нормам.</p>
            </div>
            <div className="about-card">
              <h3>Реквизиты</h3>
              <p>В боевой версии сюда добавляются фактические реквизиты организации: наименование, ИНН, ОГРН/ОГРНИП, юридический адрес и email для официальных обращений.</p>
            </div>
          </div>
          <div className="legal-note">
            Юридический блок сейчас сделан как корректная структура для макета. Перед публикацией на реальном сайте его нужно заполнить фактическими реквизитами и утверждёнными текстами документов.
          </div>
        </section>
      </div>

      <footer id="contacts" className="footer">
        <div className="footer-grid">
          <div className="footer-left">
            <div className="footer-eyebrow">Контакты</div>
            <div className="footer-brand">
              <img src="/logo.png" alt="Грильяж" style={{ width: 40, height: 40 }} />
              <div><span>Грильяж</span></div>
            </div>
            <div className="contact-list">
              <div>
                <div className="contact-label">Режим работы</div>
                <div className="contact-box work">
                  <div className="work-row"><span>Пн–Пт:</span><span>08:00–21:00</span></div>
                  <div className="work-row"><span>Сб–Вс:</span><span>09:00–21:00</span></div>
                </div>
              </div>
              <div>
                <div className="contact-label">Телефон</div>
                <div className="contact-box"><a href="tel:+73812900000">+7 (3812) 90-00-00</a></div>
              </div>
              <div>
                <div className="contact-label">Почта</div>
                <div className="contact-box"><a href="mailto:info@grilyazh-omsk.ru">info@grilyazh-omsk.ru</a></div>
              </div>
              <div>
                <div className="contact-label">Адрес</div>
                <div className="contact-box">Омск, Харьковская, 7</div>
              </div>
            </div>
            <div className="socials">
              <a className="social vk" href="https://vk.com/" target="_blank" rel="noopener noreferrer" aria-label="VK">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.05 7.56c.13 6.29 3.27 10.07 8.78 10.07h.31v-3.6c2.03.2 3.56 1.67 4.18 3.6h2.86c-.8-2.91-2.92-4.51-4.24-5.12 1.32-.76 3.18-2.61 3.62-4.95h-2.6c-.57 1.9-2.29 3.75-3.82 3.91V7.56h-2.6v6.86c-1.55-.39-3.5-2.38-3.59-6.86H3.05z" /></svg>
              </a>
              <a className="social tg" href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 4.6c.3-1.4-.5-1.9-1.6-1.5L2.8 9.8c-1.2.5-1.2 1.1-.2 1.4l4.5 1.4 10.4-6.6c.5-.3 1-.1.6.2l-8.4 7.6-.3 4.4c.4 0 .6-.2.8-.4l2.2-2.1 4.5 3.3c.8.4 1.4.2 1.6-.8L21.9 4.6z" /></svg>
              </a>
              <a className="social max" href="#" aria-label="Max"><span className="max-glyph" aria-hidden="true" /></a>
            </div>
          </div>
          <div className="footer-right">
            <div className="footer-map">
              <iframe src="https://yandex.ru/map-widget/v1/?ll=73.3638%2C54.9914&mode=search&oid=19567134820&ol=biz&z=16" title="Грильяж на карте" style={{ border: 0 }} allowFullScreen loading="lazy" />
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Грильяж</span>
          <div>
            <a href="/privacy">Политика конфиденциальности</a>
            {' · '}
            <a href="/terms">Условия использования</a>
          </div>
        </div>
      </footer>

    </main>
    </PublicShell>
  );
}
