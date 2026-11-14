'use client';

import { useState, useMemo } from 'react';
import { X, Link2, Search, UserCheck } from 'lucide-react';

export default function LinkExistingUserModal({ open, company, allUsers, companies, onClose, onLinked }) {
    const [search, setSearch] = useState('');
    const [linkingId, setLinkingId] = useState(null);
    const [error, setError] = useState('');

    const companyMap = useMemo(() => {
        const map = {};
        for (const c of companies || []) {
            map[String(c.id)] = c.name;
        }
        return map;
    }, [companies]);

    const availableUsers = useMemo(() => {
        if (!company) return [];
        const targetId = String(company.id);
        const q = search.trim().toLowerCase();
        return (allUsers || [])
            .filter(u => !(u.company_ids || []).includes(targetId))
            .filter(u => {
                if (!q) return true;
                return (
                    (u.name && u.name.toLowerCase().includes(q)) ||
                    (u.email && u.email.toLowerCase().includes(q))
                );
            });
    }, [allUsers, company, search]);

    if (!open || !company) return null;

    const handleLink = async (u) => {
        setError('');
        setLinkingId(u.id);
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: u.id,
                    action: 'addCompany',
                    companyId: company.id
                })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || 'Erro ao vincular usuário.');
                return;
            }
            onLinked(data);
        } catch (err) {
            setError('Erro de conexão.');
        } finally {
            setLinkingId(null);
        }
    };

    return (
        <div className="sa-modal-overlay" onClick={onClose}>
            <div className="sa-modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: '#dcfce7',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Link2 size={19} />
                        </div>
                        <div>
                            <h3 className="sa-h2" style={{ margin: 0 }}>Vincular Usuário Existente</h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                                Adicione usuários de outras empresas (ou sem empresa) em <strong>{company.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ position: 'relative', marginBottom: 14 }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Buscar por nome ou e-mail..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: 36 }}
                        autoFocus
                    />
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#b91c1c',
                        padding: '8px 12px',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        marginBottom: 12
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {availableUsers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 28, color: '#64748b', fontSize: '0.85rem' }}>
                            Nenhum usuário disponível para vincular.
                        </div>
                    ) : (
                        availableUsers.map(u => {
                            const companyNames = (u.company_ids || []).map(cid => companyMap[cid] || cid);
                            return (
                                <div
                                    key={u.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc'
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a' }}>
                                            {u.name} <span className="badge badge-neutral" style={{ marginLeft: 4 }}>{u.role}</span>
                                        </div>
                                        <div style={{ fontSize: '0.76rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {u.email}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>
                                            {companyNames.length > 0 ? `Atual: ${companyNames.join(', ')}` : 'Sem empresa vinculada'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        disabled={linkingId === u.id}
                                        onClick={() => handleLink(u)}
                                    >
                                        <UserCheck size={14} /> {linkingId === u.id ? 'Vinculando...' : 'Vincular'}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
