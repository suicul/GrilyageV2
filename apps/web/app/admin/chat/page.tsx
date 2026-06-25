'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStaffAuth } from '@/lib/staff-auth-context';

type User = { id: string; name: string };
type Message = { id: string; senderType: string; senderId: string; text: string; createdAt: string };
type Room = {
  id: string; userId: string; staffId: string | null; status: string; createdAt: string;
  user: User;
  messages: Message[];
};

const API = '/api/v1/mobile/admin/chat';

function fetchWithAuth(url: string, options: RequestInit = {}) {
  // httpOnly cookie is sent automatically — no need to read from localStorage
  return fetch(url, {
    ...options,
    headers: { ...options.headers, 'Content-Type': 'application/json' },
  });
}

const S = {
  panel: { display: 'flex', height: 'calc(100vh - 100px)', gap: 0, background: '#22262e', borderRadius: 8, overflow: 'hidden', border: '1px solid #333840' } as const,
  sidebar: { width: 320, borderRight: '1px solid #333840', display: 'flex', flexDirection: 'column' as const, background: '#1a1d23' } as const,
  sidebarHeader: { padding: '16px 20px', borderBottom: '1px solid #333840', fontWeight: 600, fontSize: 15, color: '#d6b06a', background: '#22262e' } as const,
  sidebarList: { flex: 1, overflowY: 'auto' as const } as const,
  roomItem: (sel: boolean) => ({
    padding: '12px 20px', cursor: 'pointer', borderBottom: '1px solid #2a2e38',
    background: sel ? '#2a2e38' : 'transparent',
  } as const),
  roomName: { fontWeight: 600, fontSize: 14, color: '#e8e8e8' } as const,
  roomPreview: { fontSize: 12, color: '#888', marginTop: 2 } as const,
  roomMeta: { fontSize: 11, color: '#666', marginTop: 4, display: 'flex', gap: 6 } as const,
  statusBadge: (s: string) => ({
    display: 'inline-block', padding: '1px 6px', borderRadius: 4, fontSize: 10,
    background: s === 'OPEN' ? '#3d2e00' : s === 'ASSIGNED' ? '#0a3622' : '#2a2e38',
    color: s === 'OPEN' ? '#ffc107' : s === 'ASSIGNED' ? '#28a745' : '#888',
  } as const),
  empty: { textAlign: 'center' as const, color: '#666', padding: 40, fontSize: 13 } as const,
  chatArea: { flex: 1, display: 'flex', flexDirection: 'column' as const } as const,
  chatHeader: { padding: '12px 20px', borderBottom: '1px solid #333840', background: '#22262e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as const,
  chatHeaderInfo: { color: '#e8e8e8' } as const,
  closeBtn: { padding: '6px 14px', border: '1px solid #dc3545', borderRadius: 6, background: 'transparent', color: '#dc3545', cursor: 'pointer', fontSize: 12 } as const,
  messageList: { flex: 1, overflowY: 'auto' as const, padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 8 } as const,
  bubble: (isOperator: boolean) => ({
    padding: '10px 14px', borderRadius: 12, fontSize: 14,
    background: isOperator ? '#d6b06a' : '#2a2e38',
    color: isOperator ? '#1a1a2e' : '#e8e8e8',
    borderBottomRightRadius: isOperator ? 4 : 12,
    borderBottomLeftRadius: isOperator ? 12 : 4,
  } as const),
  time: (alignRight: boolean) => ({ fontSize: 10, color: '#666', marginTop: 2, textAlign: (alignRight ? 'right' : 'left') as any } as const),
  inputArea: { padding: '12px 16px', borderTop: '1px solid #333840', background: '#22262e', display: 'flex', gap: 8 } as const,
  input: { flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid #333840', fontSize: 14, outline: 'none', background: '#2a2e38', color: '#e8e8e8' } as const,
  sendBtn: (disabled: boolean) => ({
    padding: '10px 20px', borderRadius: 20, border: 'none', background: '#d6b06a', color: '#1a1a2e',
    fontWeight: 600, cursor: 'pointer', fontSize: 14, opacity: disabled ? 0.5 : 1,
  } as const),
};

export default function AdminChatPage() {
  const { staffUser } = useStaffAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedRoom = rooms.find((r) => r.id === selected);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API}/rooms`);
      if (res.ok) setRooms(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await fetchWithAuth(`${API}/rooms/${roomId}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected);
    const interval = setInterval(() => fetchMessages(selected), 5000);
    return () => clearInterval(interval);
  }, [selected, fetchMessages]);

  useEffect(() => {
    if (!staffUser) return;
    // httpOnly cookie is sent automatically during WebSocket upgrade
    const s = io('https://grillyage.ru/chat', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    s.on('connect', () => { s.emit('chat.join', selected); });
    s.on('chat.message', (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    s.on('chat.room.assigned', (data: { roomId: string; staffId: string }) => {
      setRooms((prev) => prev.map((r) => (r.id === data.roomId ? { ...r, staffId: data.staffId, status: 'ASSIGNED' } : r)));
    });
    s.on('chat.room.closed', (data: { roomId: string }) => {
      setRooms((prev) => prev.map((r) => (r.id === data.roomId ? { ...r, status: 'CLOSED' } : r)));
    });
    socketRef.current = s;
    return () => { s.disconnect(); };
  }, [staffUser]);

  useEffect(() => {
    if (socketRef.current?.connected && selected) {
      socketRef.current.emit('chat.join', selected);
    }
  }, [selected]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const selectRoom = async (roomId: string) => {
    setSelected(roomId);
    const room = rooms.find((r) => r.id === roomId);
    if (room && !room.staffId && staffUser) {
      await fetchWithAuth(`${API}/rooms/${roomId}/assign`, { method: 'POST' });
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected || sending) return;
    setSending(true);
    try {
      await fetchWithAuth(`${API}/rooms/${selected}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() }),
      });
      setText('');
    } catch { /* ignore */ }
    setSending(false);
  };

  const closeRoom = async (roomId: string) => {
    await fetchWithAuth(`${API}/rooms/${roomId}/close`, { method: 'POST' });
    if (selected === roomId) setSelected(null);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={S.panel}>
      <div style={S.sidebar}>
        <div style={S.sidebarHeader}>
          Чаты ({rooms.length})
          <button onClick={fetchRooms} style={{ marginLeft: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#D6B06A' }}>🔄</button>
        </div>
        <div style={S.sidebarList}>
          {rooms.length === 0 && <div style={S.empty}>Нет активных чатов</div>}
          {rooms.map((room) => (
            <div key={room.id} onClick={() => selectRoom(room.id)} style={S.roomItem(selected === room.id)}>
              <div style={S.roomName}>{room.user.name}</div>
              <div style={S.roomPreview}>{room.messages?.[0]?.text?.slice(0, 50) || 'Нет сообщений'}</div>
              <div style={S.roomMeta}>
                <span style={S.statusBadge(room.status)}>
                  {room.status === 'OPEN' ? 'Ожидание' : room.status === 'ASSIGNED' ? 'Активен' : 'Закрыт'}
                </span>
                {room.staffId && <span>Оператор #{room.staffId.slice(0, 6)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.chatArea}>
        {!selectedRoom ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
            Выберите чат слева
          </div>
        ) : (
          <>
            <div style={S.chatHeader}>
              <div style={S.chatHeaderInfo}>
                <strong style={{ color: '#e8e8e8' }}>{selectedRoom.user.name}</strong>
                <span style={{ marginLeft: 12, fontSize: 12, color: '#888' }}>
                  {selectedRoom.status === 'OPEN' ? 'Ожидание оператора' : selectedRoom.status === 'ASSIGNED' ? 'Активен' : 'Закрыт'}
                </span>
              </div>
              {selectedRoom.status !== 'CLOSED' && (
                <button onClick={() => closeRoom(selectedRoom.id)} style={S.closeBtn}>Закрыть чат</button>
              )}
            </div>

            <div ref={listRef} style={S.messageList}>
              {messages.length === 0 && <div style={S.empty}>Нет сообщений</div>}
              {messages.map((msg) => {
                const isOp = msg.senderType === 'OPERATOR';
                return (
                  <div key={msg.id} style={{ alignSelf: isOp ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
                    <div style={S.bubble(isOp)}>{msg.text}</div>
                    <div style={S.time(isOp)}>
                      {formatTime(msg.createdAt)}
                      {isOp && ' · Я'}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedRoom.status !== 'CLOSED' && (
              <div style={S.inputArea}>
                <input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Напишите сообщение..." style={S.input} />
                <button onClick={sendMessage} disabled={sending || !text.trim()} style={S.sendBtn(sending || !text.trim())}>
                  Отправить
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
