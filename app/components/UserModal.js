'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Pencil, Save, Eye, EyeOff, RefreshCw, Building2 } from 'lucide-react';

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let out = '';
    for (let i = 0; i < 10; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

export default function UserModal({ open, user, companies, defaultCompanyId, onClose, onSaved }) {
    const isEdit = Boolean(user?.id);

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'worker',
        company_ids: [],
        isFirstAccess: false,
        plataBalance: 0,
        nfc_id: '',
        hiringDate: '',
        recebeJae: false,
        elegivelPremio: true,
        cajaUserId: '',
        cajaRole: '',
        pdfObs: ''
    });
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setShowPwd(false);
        if (user) {
            setForm({
                name: user.name || '',
                email: user.email || '',
                password: '',
                role: user.role || 'worker',
                company_ids: Array.isArray(user.company_ids) ? user.company_ids : [],
                isFirstAccess: Number(user.isFirstAccess) === 1,
                plataBalance: user.plataBalance ?? 0,
                nfc_id: user.nfc_id || '',
                hiringDate: user.hiringDate || '',
                recebeJae: Number(user.recebeJae) === 1,
                elegivelPremio: user.elegivelPremio === undefined || user.elegivelPremio === null ? true : Number(user.elegivelPremio) === 1,
                cajaUserId: user.cajaUserId || '',
                cajaRole: user.cajaRole || '',
                pdfObs: user.pdfObs || ''
            });
        } else {
            setForm({
                name: '',
                email: '',
                password: '',
                role: 'admin',
                company_ids: defaultCompanyId ? [String(defaultCompanyId)] : [],
                isFirstAccess: false,
                plataBalance: 0,
                nfc_id: '',
                hiringDate: '',
                recebeJae: false,
                elegivelPremio: true,
                cajaUserId: '',
                cajaRole: '',
                pdfObs: ''
            });
        }
    }, [open, user, defaultCompanyId]);

    if (!open) return null;

    const toggleCompany = (cid) => {
        const strId = String(cid);
        setForm(prev => {
            const exists = prev.company_ids.includes(strId);
            return {
                ...prev,
                company_ids: exists
                    ? prev.company_ids.filter(id => id !== strId)
                    : [...prev.company_ids, strId]
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!isEdit && !form.password.trim()) {
            setError('Informe uma senha inicial para o usuário.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...(isEdit ? { id: user.id } : {}),
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                role: form.role,
                company_ids: form.company_ids,
                isFirstAccess: form.isFirstAccess ? 1 : 0,
                plataBalance: Number(form.plataBalance) || 0,
                nfc_id: form.nfc_id.trim() || null,
                hiringDate: form.hiringDate || null,
                recebeJae: form.recebeJae ? 1 : 0,
                elegivelPremio: form.elegivelPremio ? 1 : 0,
                cajaUserId: form.cajaUserId.trim() || null,
                cajaRole: form.cajaRole.trim() || null,
                pdfObs: form.pdfObs || null
            };

            if (form.password.trim()) {
                payload.password = form.password.trim();
            }

            const res = await fetch('/api/users', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || 'Erro ao salvar usuário.');
                return;
            }
            onSaved(data, isEdit);
        } catch (err) {
            setError('Erro de conexão com o servidor.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="sa-modal-overlay" onClick={onClose}>
            <div className="sa-modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {isEdit ? <Pencil size={18} /> : <UserPlus size={19} />}
                        </div>
                        <div>
                            <h3 className="sa-h2" style={{ margin: 0 }}>
                                {isEdit ? `Editar Usuário: ${user.name}` : 'Cadastrar Novo Usuário'}
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                                Defina credenciais, cargo de acesso, empresas vinculadas e identificadores
                            </p>
                        </div>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="input-group">
                            <label className="input-label">Nome Completo *</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ex: João Pedro"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">E-mail de Login *</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="usuario@jalapeno.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="input-group">
                            <label className="input-label">
                                {isEdit ? 'Nova Senha (deixe em branco p/ manter)' : 'Senha Inicial *'}
                            </label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        className="input-field"
                                        placeholder={isEdit ? '•••••••• (inalterada)' : 'Digite a senha'}
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        style={{ paddingRight: 36 }}
                                        required={!isEdit}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPwd(v => !v)}
                                        style={{
                                            position: 'absolute',
                                            right: 9,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                        setForm({ ...form, password: generateRandomPassword() });
                                        setShowPwd(true);
                                    }}
                                    title="Gerar senha aleatória"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Cargo / Permissão *</label>
                            <select
                                className="input-field"
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                            >
                                <option value="admin">Administrador (RH / Loja)</option>
                                <option value="manager">Gestor / Gerente</option>
                                <option value="worker">Colaborador</option>
                            </select>
                        </div>
                    </div>

                    {/* Multi-company checkboxes */}
                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 14
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                                <Building2 size={15} color="#da291c" /> Empresas Vinculadas ({form.company_ids.length})
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setForm(p => ({ ...p, company_ids: companies.map(c => String(c.id)) }))}
                                >
                                    Marcar Todas
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setForm(p => ({ ...p, company_ids: [] }))}
                                >
                                    Desmarcar
                                </button>
                            </div>
                        </div>

                        {companies.length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Nenhuma empresa cadastrada.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                                {companies.map(c => {
                                    const checked = form.company_ids.includes(String(c.id));
                                    return (
                                        <label
                                            key={c.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                border: checked ? '1px solid #da291c' : '1px solid #e2e8f0',
                                                background: checked ? '#fef2f2' : '#ffffff',
                                                fontSize: '0.82rem',
                                                fontWeight: checked ? 600 : 500,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleCompany(c.id)}
                                            />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.name}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div className="input-group">
                            <label className="input-label">Cartão NFC (UID)</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ex: 04A1B2C3"
                                value={form.nfc_id}
                                onChange={e => setForm({ ...form, nfc_id: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Saldo Plata</label>
                            <input
                                type="number"
                                step="any"
                                className="input-field"
                                value={form.plataBalance}
                                onChange={e => setForm({ ...form, plataBalance: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Data Admissão</label>
                            <input
                                type="date"
                                className="input-field"
                                value={form.hiringDate}
                                onChange={e => setForm({ ...form, hiringDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="input-group">
                            <label className="input-label">CaJa SSO User ID</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Opcional"
                                value={form.cajaUserId}
                                onChange={e => setForm({ ...form, cajaUserId: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">CaJa SSO Role</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Opcional"
                                value={form.cajaRole}
                                onChange={e => setForm({ ...form, cajaRole: e.target.value })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500 }}>
                            <input
                                type="checkbox"
                                checked={form.isFirstAccess}
                                onChange={e => setForm({ ...form, isFirstAccess: e.target.checked })}
                            />
                            Exigir 1º Acesso (pendente)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500 }}>
                            <input
                                type="checkbox"
                                checked={form.elegivelPremio}
                                onChange={e => setForm({ ...form, elegivelPremio: e.target.checked })}
                            />
                            Elegível a Prêmio
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 500 }}>
                            <input
                                type="checkbox"
                                checked={form.recebeJae}
                                onChange={e => setForm({ ...form, recebeJae: e.target.checked })}
                            />
                            Recebe Jaé
                        </label>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            padding: '10px 12px',
                            borderRadius: 10,
                            fontSize: '0.82rem',
                            marginBottom: 14,
                            fontWeight: 600
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            <Save size={15} /> {saving ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Cadastrar Usuário')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
