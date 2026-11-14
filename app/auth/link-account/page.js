'use client';

import { useState, useEffect } from 'react';
import { Flame, Link2, UserPlus, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LinkAccountPage() {
  const [mode, setMode] = useState('link-existing'); // 'link-existing' | 'create-new'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkedUser, setLinkedUser] = useState(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) setError(err);
    } catch (_) {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/caja-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível concluir a vinculação.');
        setLoading(false);
        return;
      }

      if (data.user) {
        setLinkedUser(data.user);
        try {
          localStorage.setItem('jalapeno_superadmin_session', JSON.stringify(data.user));
        } catch (_) {}
      }

      window.location.href = data.redirect || '/';
    } catch (err) {
      console.error(err);
      setError('Erro de conexão ao vincular conta.');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-app, #f8fafc)',
        color: 'var(--text-primary, #0f172a)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: 16,
          padding: '2rem',
          boxShadow: 'var(--shadow-lg, 0 18px 36px -6px rgba(15, 23, 42, 0.18))',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #da291c, #ef4444)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
              boxShadow: '0 6px 16px rgba(218, 41, 28, 0.25)',
            }}
          >
            <Flame size={26} />
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Super Admin — Vincular CaJa SSO
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Seu usuário CaJa ainda não está vinculado a uma conta neste painel administrativo.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            padding: 4,
            backgroundColor: '#f1f5f9',
            borderRadius: 10,
            marginBottom: '1.25rem',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('link-existing');
              setError('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0.6rem 0.75rem',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: 600,
              backgroundColor: mode === 'link-existing' ? '#ffffff' : 'transparent',
              color: mode === 'link-existing' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'link-existing' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Link2 size={15} />
            Já tenho conta
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('create-new');
              setError('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '0.6rem 0.75rem',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.825rem',
              fontWeight: 600,
              backgroundColor: mode === 'create-new' ? '#ffffff' : 'transparent',
              color: mode === 'create-new' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'create-new' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <UserPlus size={15} />
            Criar conta nova
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.75rem 0.9rem',
              borderRadius: 10,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              fontSize: '0.84rem',
              marginBottom: '1rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {linkedUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0.75rem 0.9rem',
              borderRadius: 10,
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.84rem',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={16} style={{ flexShrink: 0 }} />
            <span>Conta vinculada! Redirecionando...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'link-existing' ? (
            <>
              <div>
                <label
                  htmlFor="link-email"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}
                >
                  E-mail do Super Admin
                </label>
                <input
                  id="link-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jalapeno.app.br"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="link-password"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}
                >
                  Senha do Super Admin
                </label>
                <input
                  id="link-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.92rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </>
          ) : (
            <div
              style={{
                padding: '0.9rem 1rem',
                borderRadius: 10,
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '0.86rem',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              Será criado um novo acesso Super Admin com seu nome e e-mail autenticados pelo CaJa.
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              minHeight: 44,
              padding: '0.75rem 1rem',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#da291c',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(218, 41, 28, 0.25)',
            }}
          >
            <span>
              {loading
                ? 'Processando...'
                : mode === 'link-existing'
                  ? 'Vincular e Entrar'
                  : 'Criar Conta e Entrar'}
            </span>
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <a
            href="/"
            style={{ fontSize: '0.84rem', color: '#64748b', textDecoration: 'none', fontWeight: 500 }}
          >
            Voltar para o login tradicional
          </a>
        </div>
      </div>
    </div>
  );
}
