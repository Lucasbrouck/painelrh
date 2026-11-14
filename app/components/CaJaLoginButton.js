'use client';

import { Flame } from 'lucide-react';

export default function CaJaLoginButton() {
  const handleLogin = () => {
    window.location.href = '/api/auth/caja-redirect';
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: '100%',
        minHeight: 44,
        backgroundColor: '#ef4444',
        color: '#ffffff',
        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.28)',
        border: 'none',
        borderRadius: 10,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      <Flame size={16} /> Entrar com CaJa
    </button>
  );
}
