import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import CookieConsent from '@/components/cookie-consent';
import BottomNav from '@/components/bottom-nav';
import CartDrawer from '@/components/cart-drawer';
import ChatWidget from '@/components/chat-widget';
import YandexMetrica from '@/components/yandex-metrica';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Грильяж — доставка и самовывоз',
  description: 'Гастрохаус «Грильяж»: блюда, выпечка и десерты с доставкой и самовывозом в Омске.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#20170f',
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? '';

  return (
    <html lang="ru" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <Script
          src="https://unpkg.com/@vkid/sdk@2.6.5/dist-sdk/umd/index.js"
          strategy="lazyOnload"
          nonce={nonce}
        />
        <YandexMetrica nonce={nonce} />
        <AuthProvider>
          <CartProvider>
            {children}
            <CookieConsent />
            <BottomNav />
            <CartDrawer />
            <ChatWidget />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
