'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const METRICA_ID = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID;

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

export default function YandexMetrica({ nonce }: { nonce?: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (METRICA_ID && typeof window.ym === 'function') {
      window.ym(Number(METRICA_ID), 'hit', pathname);
    }
  }, [pathname]);

  if (!METRICA_ID) return null;

  return (
    <Script
      id="yandex-metrica"
      strategy="afterInteractive"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');

          ym(${METRICA_ID}, 'init', {
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true,
            webvisor: true,
          });
        `,
      }}
    />
  );
}
