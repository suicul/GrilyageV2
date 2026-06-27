'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="auth-overlay" onClick={onCancel} />
      <div
        className="admin-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        style={{ width: 400, textAlign: 'center' }}
      >
        <h2 id="confirm-title" style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
        <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            className="admin-btn"
            style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`admin-btn ${danger ? 'admin-btn-danger' : ''}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
