'use client';

import { useState } from 'react';
import {
    Eye,
    EyeOff,
    Copy,
    KeyRound,
    Pencil,
    Trash2,
    Unlink,
    ShieldCheck,
    CreditCard,
    CheckCircle2,
    Clock
} from 'lucide-react';

const ROLE_STYLES = {
    admin: { label: 'Administrador', className: 'badge badge-danger' },
    manager: { label: 'Gestor', className: 'badge badge-info' },
    worker: { label: 'Colaborador', className: 'badge badge-neutral' }
};

export default function UsersTable({
    users,
    companiesMap,
    activeCompanyId = null,
    loading = false,
    onEditUser,
    onOpenPasswordModal,
    onQuickRoleChange,
    onToggleFirstAccess,
    onUnlinkCompany,
    onDeleteUser,
    onCopyText,
    onSelectCompany
}) {
    const [revealedIds, setRevealedIds] = useState({});

    const toggleReveal = (id) => {
        setRevealedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="sa-table-container">
            <table className="sa-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Cargo / Papel</th>
                        <th>Senha</th>
                        <th>Status de Acesso</th>
                        <th>Empresas Vinculadas</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                Carregando usuários...
                            </td>
                        </tr>
                    ) : users.length === 0 ? (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                Nenhum usuário encontrado com os filtros selecionados.
                            </td>
                        </tr>
                    ) : (
                        users.map(u => {
                            const isRevealed = Boolean(revealedIds[u.id]);
                            const isPendingFirst = Number(u.isFirstAccess) === 1;
                            const roleMeta = ROLE_STYLES[u.role] || ROLE_STYLES.worker;
                            const linkedIds = u.company_ids || [];

                            return (
                                <tr key={u.id}>
                                    {/* Usuário */}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                                            <div style={{
                                                width: 36,
                                                height: 36,
                                                borderRadius: '50%',
                                                background: u.role === 'admin' ? '#fee2e2' : u.role === 'manager' ? '#e0f2fe' : '#f1f5f9',
                                                color: u.role === 'admin' ? '#b91c1c' : u.role === 'manager' ? '#0369a1' : '#334155',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800,
                                                fontSize: '0.88rem',
                                                flexShrink: 0
                                            }}>
                                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span>{u.name}</span>
                                                    {u.nfc_id && (
                                                        <span className="badge badge-purple" title={`Cartão NFC: ${u.nfc_id}`}>
                                                            <CreditCard size={11} /> {u.nfc_id}
                                                        </span>
                                                    )}
                                                    {u.cajaUserId && (
                                                        <span className="badge badge-info" title={`CaJa ID: ${u.cajaUserId}`}>
                                                            CaJa
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '0.76rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span>{u.email}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => onCopyText(u.email, 'E-mail copiado!')}
                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
                                                        title="Copiar e-mail"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Cargo / Papel */}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <select
                                                value={u.role || 'worker'}
                                                onChange={e => onQuickRoleChange(u, e.target.value)}
                                                style={{
                                                    padding: '5px 8px',
                                                    borderRadius: 8,
                                                    border: '1px solid #cbd5e1',
                                                    background: '#ffffff',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    color: '#0f172a',
                                                    cursor: 'pointer'
                                                }}
                                                title="Alterar cargo rapidamente"
                                            >
                                                <option value="admin">Administrador</option>
                                                <option value="manager">Gestor</option>
                                                <option value="worker">Colaborador</option>
                                            </select>
                                            <span className={roleMeta.className} style={{ display: 'none' }}>
                                                {roleMeta.label}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Senha */}
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <code style={{
                                                background: '#f1f5f9',
                                                border: '1px solid #e2e8f0',
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: '0.78rem',
                                                fontFamily: 'monospace',
                                                color: '#0f172a',
                                                maxWidth: 140,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isRevealed ? (u.password || '—') : '••••••••'}
                                            </code>
                                            <button
                                                type="button"
                                                className="btn-icon"
                                                onClick={() => toggleReveal(u.id)}
                                                title={isRevealed ? 'Ocultar senha' : 'Revelar senha'}
                                            >
                                                {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-icon"
                                                onClick={() => onCopyText(u.password || '', 'Senha copiada!')}
                                                title="Copiar senha"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => onOpenPasswordModal(u)}
                                                title="Trocar senha ou gerar link de acesso"
                                            >
                                                <KeyRound size={13} color="#b45309" /> Trocar / Link
                                            </button>
                                        </div>
                                    </td>

                                    {/* Status de Acesso */}
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => onToggleFirstAccess(u)}
                                            className={`badge ${isPendingFirst ? 'badge-warning' : 'badge-success'}`}
                                            style={{ border: 'none', cursor: 'pointer' }}
                                            title="Clique para alternar entre Ativo e 1º Acesso Pendente"
                                        >
                                            {isPendingFirst ? (
                                                <><Clock size={12} /> 1º Acesso Pendente</>
                                            ) : (
                                                <><CheckCircle2 size={12} /> Ativo</>
                                            )}
                                        </button>
                                    </td>

                                    {/* Empresas Vinculadas */}
                                    <td>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxWidth: 260 }}>
                                            {linkedIds.length === 0 ? (
                                                <span className="badge badge-warning">Sem Empresa</span>
                                            ) : (
                                                linkedIds.map(cid => (
                                                    <button
                                                        key={cid}
                                                        type="button"
                                                        onClick={() => onSelectCompany && onSelectCompany(cid)}
                                                        className={`badge ${String(cid) === String(activeCompanyId) ? 'badge-danger' : 'badge-neutral'}`}
                                                        style={{ border: 'none', cursor: onSelectCompany ? 'pointer' : 'default' }}
                                                        title="Clique para abrir esta empresa"
                                                    >
                                                        {companiesMap[String(cid)] || cid}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </td>

                                    {/* Ações */}
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                type="button"
                                                className="btn-icon"
                                                onClick={() => onEditUser(u)}
                                                title="Editar dados completos"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            {activeCompanyId && (
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    onClick={() => onUnlinkCompany(u, activeCompanyId)}
                                                    title="Desvincular usuário apenas desta empresa"
                                                    style={{ color: '#b45309' }}
                                                >
                                                    <Unlink size={15} />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-danger-outline btn-sm"
                                                onClick={() => onDeleteUser(u)}
                                                title="Excluir usuário permanentemente"
                                                style={{ padding: '6px 8px' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
