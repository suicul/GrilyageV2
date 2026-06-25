'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { io, Socket } from 'socket.io-client';

type Message = {
  id: string;
  senderType: string;
  senderId: string;
  text: string;
  createdAt: string;
};

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!open || !user) return;
    const init = async () => {
      try {
        const res = await fetch('/api/v1/mobile/chat/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        if (!res.ok) return;
        const room = await res.json();
        const rid = room.id;
        setRoomId(rid);

        const msgRes = await fetch(`/api/v1/mobile/chat/rooms/${rid}/messages`, {
          credentials: 'include',
        });
        if (msgRes.ok) setMessages(await msgRes.json());

        const s = io('https://grillyage.ru/chat', {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          auth: { token: '' },
        });
        s.on('connect', () => s.emit('chat.join', rid));
        s.on('chat.message', (msg: Message) => {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });
        socketRef.current = s;
      } catch {}
    };
    init();
    return () => { socketRef.current?.disconnect(); socketRef.current = null; };
  }, [open, user]);

  const sendMessage = async () => {
    if (!text.trim() || !roomId || sending) return;
    setSending(true);
    try {
      await fetch(`/api/v1/mobile/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: text.trim() }),
      });
      setText('');
    } catch {}
    setSending(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 60, height: 60, borderRadius: '50%', border: 'none',
          background: '#d6b06a', color: '#1a1a2e', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(214,176,106,0.4)',
        }}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/>
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', bottom: 96, right: 24, zIndex: 1000,
            width: 360, maxHeight: 520,
            background: '#1a1d23', borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', border: '1px solid #333840',
          }}
        >
          <div style={{
            padding: '16px 20px',
            background: '#22262e',
            borderBottom: '1px solid #333840',
            fontWeight: 700, fontSize: 15, color: '#d6b06a',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            Чат с оператором
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>

          <div ref={listRef} style={{
            flex: 1, overflowY: 'auto', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {!user ? (
              <div style={{ textAlign: 'center', color: '#888', padding: 40, fontSize: 13 }}>
                Войдите, чтобы написать оператору
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: 40, fontSize: 13 }}>
                Нет сообщений. Напишите нам!
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{
                  alignSelf: msg.senderType === 'USER' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 12, fontSize: 14,
                    background: msg.senderType === 'USER' ? '#d6b06a' : '#2a2e38',
                    color: msg.senderType === 'USER' ? '#1a1a2e' : '#e8e8e8',
                    borderBottomRightRadius: msg.senderType === 'USER' ? 4 : 12,
                    borderBottomLeftRadius: msg.senderType === 'USER' ? 12 : 4,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{
                    fontSize: 10, color: '#666', marginTop: 2,
                    textAlign: msg.senderType === 'USER' ? 'right' : 'left',
                  }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #333840',
              background: '#22262e', display: 'flex', gap: 8,
            }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Напишите сообщение..."
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 20,
                  border: '1px solid #333840', fontSize: 14, outline: 'none',
                  background: '#2a2e38', color: '#e8e8e8',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 20, border: 'none',
                  background: '#d6b06a', color: '#1a1a2e', fontWeight: 600,
                  cursor: 'pointer', fontSize: 14,
                  opacity: sending || !text.trim() ? 0.5 : 1,
                }}
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
