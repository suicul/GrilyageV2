'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

const NETWORK_META: Record<string, { name: string; color: string; gradient: string; icon: string; desc: string }> = {
  vk: {
    name: 'ВКонтакте',
    color: '#4a76a8',
    gradient: 'linear-gradient(135deg,#4a76a8,#6a96c8)',
    icon: 'VK',
    desc: 'Следите за новинками, акциями и событиями в нашей группе.',
  },
  tg: {
    name: 'Telegram',
    color: '#0088cc',
    gradient: 'linear-gradient(135deg,#0088cc,#00a0e6)',
    icon: 'TG',
    desc: 'Подпишитесь на наш канал — новости, акции и секретные предложения.',
  },
  max: {
    name: 'MAX',
    color: '#e040a0',
    gradient: 'linear-gradient(135deg,#e040a0,#f060c0)',
    icon: 'MAX',
    desc: 'Доставляем через MAX — скоро в этом приложении.',
  },
};

export default function SocialStubPage() {
  const params = useParams();
  const network = (params?.network as string) || '';
  const meta = NETWORK_META[network];

  if (!meta) {
    return (
      <main className="page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <h1>Страница не найдена</h1>
        <Link href="/" style={{ color: 'var(--gold)', fontWeight: 700 }}>На главную</Link>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1800, width: 'calc(100% - 28px)', maxWidth: 1472, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px', borderRadius: 28, background: 'rgba(24,17,12,.72)', backdropFilter: 'blur(14px)', color: '#fff' }}>
        <Link href="/" style={{ fontWeight: 700, color: '#e9d7a8', letterSpacing: '.16em' }}>ГРИЛЬЯЖ</Link>
        <Link href="/" style={{ color: 'rgba(255,255,255,.72)', fontSize: 13 }}>← На главную</Link>
      </header>

      {/* Hero */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 24, padding: 40, textAlign: 'center',
        background: meta.gradient,
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.15)',
          display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 900, color: '#fff',
          backdropFilter: 'blur(8px)',
        }}>
          {meta.icon}
        </div>
        <h1 style={{ margin: 0, color: '#fff', fontSize: 36 }}>{meta.name}</h1>
        <p style={{ margin: 0, color: 'rgba(255,255,255,.85)', fontSize: 16, maxWidth: 400, lineHeight: 1.6 }}>
          {meta.desc}
        </p>
        <div style={{
          padding: '14px 28px', borderRadius: 999, background: 'rgba(255,255,255,.2)',
          color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '.04em',
          backdropFilter: 'blur(8px)',
        }}>
          СКОРО ЗДЕСЬ БУДЕТ ССЫЛКА
        </div>
        <Link href="/" style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,.3)' }}>
          Вернуться на сайт
        </Link>
      </div>
    </main>
  );
}
