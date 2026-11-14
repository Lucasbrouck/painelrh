'use client';

import { useState, useEffect } from 'react';
import { X, KeyRound, Eye, EyeOff, RefreshCw, Copy, Link as LinkIcon, Save, Check } from 'lucide-react';

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let out = '';
    for (let i = 0; i < 10; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

export default function PasswordModal({ open, user, onClose, onSaved, onNotify }) {
    const [newPassword, setNewPassword] = useState('');
    const [showPwd, setShowPwd] = useState(true);
    const [requireFirstAccess, setRequireFirstAccess] = useState(false);
    const [saving, setSaving] = useState(false);

    const [portalBaseUrl, setPortalBaseUrl] = useState('https://rh.jalapeno.app.br');
    const [generatedResetUrl, setGeneratedResetUrl] = useState('');
    const [generatedFirstAccessUrl, setGeneratedFirstAccessUrl] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [copiedCreds, setCopiedCreds] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open || !user) return;
        setNewPassword(user.password || '');
        setRequireFirstAccess(Number(user.isFirstAccess) === 1);
        setShowPwd(true);
        setGeneratedResetUrl('');
        setGeneratedFirstAccessUrl('');
        setCopiedCreds(false);
        setError('');
        // Default portal URL hint based on user role
        if (user.role === 'worker') {
            setPortalBaseUrl('http://localhost:3002');
        } else {
            setPortalBaseUrl('http://localhost:3001');
        }
    }, [open, user]);

    if (!open || !user) return null;

    const cleanBase = portalBaseUrl.replace(/\/+$/, '');

    const handleSavePassword = async (e) => {
        e.preventDefault();
        setError('');
        if (!newPassword.trim()) {
            setError('A senha não pode ficar vazia.');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    password: newPassword.trim(),
                    isFirstAccess: requireFirstAccess ? 1 : 0
                })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || 'Erro ao atualizar senha.');
                return;
            }
            onSaved(data);
        } catch (err) {
            setError('Erro de conexão.');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateLinks = async () => {
        setGeneratingLink(true);
        setError('');
        try {
            const res = await fetch(`/api/users/${user.id}/reset-link`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || 'Erro ao gerar link.');
                return;
            }
            setGeneratedResetUrl(`${cleanBase}${data.resetPath}`);
            setGeneratedFirstAccessUrl(`${cleanBase}${data.firstAccessPath}`);
            onNotify('Link de redefinição gerado com validade de 24h!');
        } catch (err) {
            setError('Erro ao gerar link de acesso.');
        } finally {
            setGeneratingLink(false);
        }
    };

    const handleCopyCredentialsMessage = async () => {
        const msg = [
            `Acesso Jalapeño (${user.role === 'worker' ? 'Colaborador' : 'Portal RH'}):`,
            `Nome: ${user.name}`,
            `E-mail: ${user.email}`,
            `Senha: ${newPassword || user.password}`
        ].join('\n');
        await navigator.clipboard.writeText(msg);
        setCopiedCreds(true);
        onNotify('Credenciais copiadas para a área de transferência!');
        setTimeout(() => setCopiedCreds(false), 2000);
    };

    return (
        <div className="sa-modal-overlay" onClick={onClose}>
            <div className="sa-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: '#fef3c7',
                            color: '#b45309',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <KeyRound size={19} />
                        </div>
                        <div>
                            <h3 className="sa-h2" style={{ margin: 0 }}>Gerenciar Senha & Acesso</h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                                {user.name} ({user.email})
                            </p>
                        </div>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSavePassword}>
                    <div className="input-group">
                        <label className="input-label">Senha do Usuário</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <input
                                    type={showPwd ? 'text' : 'password'}
                                    className="input-field"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    style={{ paddingRight: 38, fontFamily: 'monospace' }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd(v => !v)}
                                    style={{
                                        position: 'absolute',
                                        right: 10,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#64748b',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setNewPassword(generateRandomPassword());
                                    setShowPwd(true);
                                }}
                            >
                                <RefreshCw size={14} /> Gerar
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={requireFirstAccess}
                                onChange={e => setRequireFirstAccess(e.target.checked)}
                            />
                            Marcar como 1º Acesso Pendente
                        </label>

                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleCopyCredentialsMessage}
                        >
                            {copiedCreds ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            {copiedCreds ? 'Copiado!' : 'Copiar E-mail + Senha'}
                        </button>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                        <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Nova Senha'}
                    </button>
                </form>

                {/* Link Generator Section */}
                <div style={{
                    marginTop: 20,
                    paddingTop: 18,
                    borderTop: '1px solid #e2e8f0'
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LinkIcon size={15} color="#0284c7" /> Link de Redefinição / Primeiro Acesso
                    </div>
                    <div className="input-group" style={{ marginBottom: 10 }}>
                        <label className="input-label">URL Base do Portal (RH ou Colaborador)</label>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPortalBaseUrl('http://localhost:3001')}>
                                Local RH (:3001)
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPortalBaseUrl('http://localhost:3002')}>
                                Local Colab (:3002)
                            </button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPortalBaseUrl('https://rh.jalapeno.app.br')}>
                                Prod RH
                            </button>
                        </div>
                        <input
                            type="text"
                            className="input-field"
                            value={portalBaseUrl}
                            onChange={e => setPortalBaseUrl(e.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        className="btn btn-dark"
                        style={{ width: '100%' }}
                        onClick={handleGenerateLinks}
                        disabled={generatingLink}
                    >
                        <LinkIcon size={15} /> {generatingLink ? 'Gerando...' : 'Gerar Token & Links de Acesso (24h)'}
                    </button>

                    {generatedResetUrl && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>
                                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                    Link de Redefinição de Senha (expira em 24h):
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input className="input-field" readOnly value={generatedResetUrl} style={{ fontSize: '0.78rem', background: '#f8fafc' }} />
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(generatedResetUrl);
                                            onNotify('Link de redefinição copiado!');
                                        }}
                                    >
                                        <Copy size={14} />
                                    </button>
                                </div>
                            </div>
                            {generatedFirstAccessUrl && (
                                <div>
                                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                        Link de Primeiro Acesso (requer flag 1º Acesso marcada):
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <input className="input-field" readOnly value={generatedFirstAccessUrl} style={{ fontSize: '0.78rem', background: '#f8fafc' }} />
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(generatedFirstAccessUrl);
                                                onNotify('Link de primeiro acesso copiado!');
                                            }}
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{
                        marginTop: 14,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '10px 12px',
                        borderRadius: 10,
                        fontSize: '0.82rem',
                        fontWeight: 600
                    }}>
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
