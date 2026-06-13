'use client';

import { useEffect, useRef } from 'react';

const YANDEX_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY || '';

export default function MapSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);

  useEffect(() => {
    if (mapInitialized.current || !containerRef.current) return;
    mapInitialized.current = true;

    // Загружаем скрипт Yandex Maps API
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=ru_RU&load=package.full`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) return;
      window.ymaps.ready(() => {
        if (!containerRef.current) return;

        const map = new window.ymaps.Map(containerRef.current, {
          center: [54.9914, 73.3638],
          zoom: 16,
          controls: ['zoomControl', 'geolocationControl'],
        });

        // Отключаем ч/б фильтр (если был) — карта полноцветная
        map.options.set('suppressMapOpen', true);

        // Кастомный пин с логотипом
        const placemark = new window.ymaps.Placemark([54.9914, 73.3638], {
          hintContent: 'Грильяж',
          balloonContent: '<strong>Грильяж</strong><br/>Омск, Харьковская, 7<br/>Пн–Пт 08:00–21:00 · Сб–Вс 09:00–21:00',
        }, {
          iconLayout: 'default#image',
          iconImageHref: '/logo.png',
          iconImageSize: [48, 48],
          iconImageOffset: [-24, -48],
          iconImageShape: { type: 'Circle', coordinates: [24, 24], radius: 24 },
        });

        map.geoObjects.add(placemark);
        // Сужаем область карты под маркер
        map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
      });
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup: удаляем скрипт при размонтировании (необязательно)
    };
  }, []);

  return (
    <section className="map-section">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div className="map-overlay">
        <h2>Как нас найти</h2>
        <p>Омск, Харьковская, 7</p>
        <p className="map-hint">Пн–Пт 08:00–21:00 · Сб–Вс 09:00–21:00</p>
      </div>
    </section>
  );
}

// Расширяем Window для ymaps
declare global {
  interface Window {
    ymaps: any;
  }
}
