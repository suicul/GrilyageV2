'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const VOWELS = new Set('аеёиоуыэюяaeiouyАЕЁИОУЫЭЮЯAEIOUY');
const BAD_PATTERNS = ['йцукен', 'цукенг', 'укенгш', 'кенгшщ', 'фывапр', 'ывапро', 'вапрол', 'апролд', 'ячсмит', 'чсмить', 'жэъхзъ', 'эъхзъщ'];

function isValidName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return 'Имя должно содержать минимум 2 символа';
  if (trimmed.length > 50) return 'Имя слишком длинное';
  if (!/^[а-яёa-z\s\-]+$/i.test(trimmed)) return 'Имя может содержать только буквы, пробел и дефис';
  if (/([а-яёa-z])\1{2,}/i.test(trimmed.replace(/\s/g, ''))) return 'Слишком много повторяющихся букв';
  if (![...trimmed].some((ch) => VOWELS.has(ch))) return 'Имя должно содержать хотя бы одну гласную';
  const lower = trimmed.toLowerCase().replace(/\s/g, '');
  for (const pat of BAD_PATTERNS) {
    if (lower.includes(pat)) return 'Пожалуйста, введите реальное имя';
  }
  return null;
}

type AuthMode = 'phone' | 'email' | 'social-email-otp';

export default function AuthModal() {
  const { user, authModalOpen, setAuthModalOpen, login, logout, phoneLogin, socialLogin, sendEmailOtp, verifyEmailOtp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('phone');
  const [registrationName, setRegistrationName] = useState('');
  const [nameError, setNameError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [_showCode, _setShowCode] = useState('');

  const [emailOtpStep, setEmailOtpStep] = useState<'email' | 'code'>('email');
  const [emailOtpCode, setEmailOtpCode] = useState('');

  const vkContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { setOtpSent(false); setShowCode(''); };
  }, []);

  useEffect(() => {
    if (!authModalOpen) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if ((window as any).VKIDSDK && vkContainerRef.current) {
        clearInterval(interval);
        renderVkOAuthList();
      } else if (attempts > 20) {
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [authModalOpen]);

  const renderVkOAuthList = () => {
    if (!vkContainerRef.current || !(window as any).VKIDSDK) return;
    const VKIDSDK = (window as any).VKIDSDK;
    try {
      if (!(window as any).__vkConfigInited) {
        VKIDSDK.Config.init({
          app: Number(window.__ENV?.VK_CLIENT_ID || process.env.NEXT_PUBLIC_VK_CLIENT_ID),
          redirectUrl: window.location.origin + '/auth/vk/callback',
          responseMode: VKIDSDK.ConfigResponseMode.Callback,
          source: VKIDSDK.ConfigSource.LOWCODE,
          scope: 'email,phone',
        });
        (window as any).__vkConfigInited = true;
      }
      const oAuth = new VKIDSDK.OAuthList();
      oAuth.render({
        container: vkContainerRef.current,
        oauthList: ['vkid', 'ok_ru', 'mail_ru'],
      })
        .on(VKIDSDK.WidgetEvents.ERROR, () => {})
        .on(VKIDSDK.OAuthListInternalEvents.LOGIN_SUCCESS, async (payload: any) => {
          try {
            const data = await VKIDSDK.Auth.exchangeCode(payload.code, payload.device_id);
            await socialLogin('vk', data.access_token);
            setAuthModalOpen(false);
          } catch {
            setError('Ошибка авторизации');
          }
        });
    } catch {}
  };

  const handleSendCode = async () => {
    const nameErr = isValidName(registrationName);
    if (nameErr) { setError(nameErr); return; }
    setNameError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Введите корректный номер телефона');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const normalized = '+' + digits;
      const res = await fetch('/api/v1/auth/social/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? 'Ошибка отправки кода');
      }
      setOtpSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки кода');
    }
    setSubmitting(false);
  };

  const handleVerifyCode = async () => {
    if (!otpCode) { setError('Введите код'); return; }
    setError('');
    setSubmitting(true);
    try {
      const digits = '+' + phone.replace(/\D/g, '');
      await phoneLogin(digits, otpCode, registrationName.trim());
      setAuthModalOpen(false);
      resetPhoneState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код');
    }
    setSubmitting(false);
  };

  const resetPhoneState = () => {
    setOtpSent(false);
    setOtpCode('');
    setShowCode('');
    setRegistrationName('');
    setNameError('');
    setError('');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      setAuthModalOpen(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    }
    setSubmitting(false);
  };

  const handleEmailOtpSend = async () => {
    if (!email) { setError('Введите email'); return; }
    setError('');
    setSubmitting(true);
    try {
      await sendEmailOtp(email);
      setEmailOtpStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отправки кода');
    }
    setSubmitting(false);
  };

  const handleEmailOtpVerify = async () => {
    if (!emailOtpCode) { setError('Введите код'); return; }
    setError('');
    setSubmitting(true);
    try {
      await verifyEmailOtp(email, emailOtpCode);
      setAuthModalOpen(false);
      setEmail('');
      setEmailOtpCode('');
      setEmailOtpStep('email');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неверный код');
    }
    setSubmitting(false);
  };

  const handleYandexLogin = () => {
    const clientId = window.__ENV?.YANDEX_CLIENT_ID || process.env.NEXT_PUBLIC_YANDEX_CLIENT_ID;
    if (!clientId) { setError('Яндекс ID не настроен'); return; }
    const redirectUri = window.location.origin + '/auth/yandex/callback';
    const state = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    localStorage.setItem('yandex_oauth_state', state);
    window.open(
      `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      '_blank', 'width=600,height=600'
    );
  };

  const handleLogout = async () => {
    await logout();
    setAuthModalOpen(false);
  };

  if (!authModalOpen) return null;

  return (
    <>
      <div className="auth-overlay" onClick={() => setAuthModalOpen(false)} />
      <div className="auth-modal">
        <button className="close" onClick={() => setAuthModalOpen(false)}>×</button>

        {user ? (
          <div className="auth-body" style={{ paddingTop: 24 }}>
            <div className="auth-user-info">
              <p style={{ fontWeight: 700, margin: '0 0 8px', fontSize: 18 }}>{user.name}</p>
              <p style={{ color: 'rgba(255,255,255,.62)', margin: '0 0 20px', fontSize: 14 }}>{user.phone || user.email || ''}</p>
              <Link href="/cabinet" onClick={() => setAuthModalOpen(false)}>
                <button className="auth-submit" type="button">Личный кабинет</button>
              </Link>
              <button className="auth-submit" type="button" onClick={handleLogout}
                style={{ background: 'rgba(255,70,70,.2)', color: '#ff6b6b', boxShadow: 'none', marginTop: 8 }}>
                Выйти
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-head">
              <div className="auth-kicker">Личный кабинет</div>
              <div className="auth-title">
                {mode === 'phone' ? 'Вход по телефону' :
                 mode === 'social-email-otp' ? 'Вход по email' :
                 'Вход по email и паролю'}
              </div>
            </div>

            <div className="auth-social-top">
              <div ref={vkContainerRef} style={{ flex: 1, minHeight: 48 }} />
              <button className="social-btn yandex" type="button" onClick={handleYandexLogin}>
                <span>Яндекс ID</span>
              </button>
            </div>

            <div className="auth-divider"><span>или</span></div>

            <div className="auth-body">
              <div className="auth-mode-tabs">
                <button className={`auth-mode-tab ${mode === 'phone' ? 'active' : ''}`}
                  onClick={() => { setMode('phone'); setError(''); resetPhoneState(); }}>Телефон</button>
                <button className={`auth-mode-tab ${mode === 'social-email-otp' ? 'active' : ''}`}
                  onClick={() => { setMode('social-email-otp'); setError(''); setEmailOtpStep('email'); }}>Email</button>
                <button className={`auth-mode-tab ${mode === 'email' ? 'active' : ''}`}
                  onClick={() => { setMode('email'); setError(''); }}>Пароль</button>
              </div>

              {mode === 'phone' ? (
                <div>
                  {!otpSent ? (
                    <>
                      <p>Введите имя и номер телефона — если аккаунт не найден, он будет создан автоматически.</p>
                      <div className="auth-form">
                        <div className="auth-field">
                          <label>Имя</label>
                          <input className="auth-input" type="text" placeholder="Как к вам обращаться"
                            value={registrationName} onChange={(e) => { setRegistrationName(e.target.value); setNameError(isValidName(e.target.value) ?? ''); }} />
                          {nameError && <p className="auth-error" style={{ fontSize: 12, marginTop: 2 }}>{nameError}</p>}
                        </div>
                        <div className="auth-field">
                          <label>Номер телефона</label>
                          <input className="auth-input" type="tel" placeholder="+7 (___) ___-__-__"
                            value={phone} onChange={(e) => setPhone(e.target.value)}
                            onFocus={(e) => { if (!e.target.value) setPhone('+7 '); }} />
                        </div>
                        <button className="auth-submit" type="button" onClick={handleSendCode} disabled={submitting}>
                          {submitting ? 'Отправка...' : 'Получить код'}
                        </button>
                        {error && <p className="auth-error">{error}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Введите код из SMS (в разработке — код показан ниже)</p>
                      <div className="auth-form">
                        <div className="auth-field">
                          <label>Код из SMS</label>
                          <input className="auth-input" type="text" placeholder="000000"
                            value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6} inputMode="numeric" />
                        </div>
                        <button className="auth-submit" type="button" onClick={handleVerifyCode} disabled={submitting}>
                          {submitting ? 'Проверка...' : 'Войти'}
                        </button>
                        {error && <p className="auth-error">{error}</p>}
                        <button className="auth-submit" type="button" onClick={resetPhoneState}
                          style={{ marginTop: 8, background: 'rgba(255,255,255,.08)', color: '#fff', boxShadow: 'none' }}>
                          Назад
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : mode === 'social-email-otp' ? (
                <div>
                  {emailOtpStep === 'email' ? (
                    <>
                      <p>Введите email — мы отправим код для входа.</p>
                      <div className="auth-form">
                        <div className="auth-field">
                          <label>Email</label>
                          <input className="auth-input" type="email" placeholder="mail@example.com"
                            value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <button className="auth-submit" type="button" onClick={handleEmailOtpSend} disabled={submitting}>
                          {submitting ? 'Отправка...' : 'Получить код'}
                        </button>
                        {error && <p className="auth-error">{error}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>Введите код, отправленный на {email}</p>
                      <div className="auth-form">
                        <div className="auth-field">
                          <label>Код из письма</label>
                          <input className="auth-input" type="text" placeholder="000000"
                            value={emailOtpCode} onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength={6} inputMode="numeric" />
                        </div>
                        <button className="auth-submit" type="button" onClick={handleEmailOtpVerify} disabled={submitting}>
                          {submitting ? 'Проверка...' : 'Войти'}
                        </button>
                        {error && <p className="auth-error">{error}</p>}
                        <button className="auth-submit" type="button" onClick={() => { setEmailOtpStep('email'); setError(''); }}
                          style={{ marginTop: 8, background: 'rgba(255,255,255,.08)', color: '#fff', boxShadow: 'none' }}>
                          Назад
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <p>Войдите с email и паролем, чтобы сохранять заказы и историю покупок.</p>
                  <form className="auth-form" onSubmit={handleEmailSubmit}>
                    <div className="auth-field">
                      <label>Email</label>
                      <input className="auth-input" type="email" placeholder="mail@example.com" value={email}
                        onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="auth-field">
                      <label>Пароль</label>
                      <input className="auth-input" type="password" placeholder="Введите пароль" value={password}
                        onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                    </div>
                    <button className="auth-submit" type="submit" disabled={submitting}>
                      {submitting ? 'Подождите...' : 'Войти в аккаунт'}
                    </button>
                    {error && <p className="auth-error">{error}</p>}
                  </form>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

declare global {
  interface Window {
    __ENV?: Record<string, string>;
  }
}
