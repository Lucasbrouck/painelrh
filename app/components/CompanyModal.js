'use client';

import { useState, useEffect } from 'react';
import { X, Building2, Save, MapPin, Link2, Eye, EyeOff, RefreshCw } from 'lucide-react';

function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let out = '';
    for (let i = 0; i < 10; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

export default function CompanyModal({ open, company, onClose, onSaved }) {
    const isEdit = Boolean(company?.id);

    const [form, setForm] = useState({
        name: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        latitude: '',
        longitude: '',
        checkinRadius: 200,
        saipos_token: '',
        ignore_ficha_venda: false
    });
    const [showPwd, setShowPwd] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setShowPwd(false);
        if (company) {
            setForm({
                name: company.name || '',
                adminName: company.adminName || '',
                adminEmail: company.adminEmail || '',
                adminPassword: '',
                latitude: company.latitude ?? '',
                longitude: company.longitude ?? '',
                checkinRadius: company.checkinRadius ?? 200,
                saipos_token: company.saipos_token || '',
                ignore_ficha_venda: Number(company.ignore_ficha_venda) === 1
            });
        } else {
            setForm({
                name: '',
                adminName: '',
                adminEmail: '',
                adminPassword: '',
                latitude: '',
                longitude: '',
                checkinRadius: 200,
                saipos_token: '',
                ignore_ficha_venda: false
            });
        }
    }, [open, company]);

    if (!open) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            const payload = isEdit
                ? {
                    id: company.id,
                    name: form.name,
                    adminName: form.adminName,
                    adminEmail: form.adminEmail,
                    latitude: form.latitude,
                    longitude: form.longitude,
                    checkinRadius: form.checkinRadius,
                    saipos_token: form.saipos_token,
                    ignore_ficha_venda: form.ignore_ficha_venda
                }
                : { ...form };

            const res = await fetch('/api/companies', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setError(data.error || 'Erro ao salvar empresa.');
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
            <div className="sa-modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: '#fef2f2',
                            color: '#da291c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="sa-h2" style={{ margin: 0 }}>
                                {isEdit ? `Editar Empresa: ${company.name}` : 'Nova Empresa / Unidade'}
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                                {isEdit
                                    ? 'Atualize dados cadastrais, localização de check-in e integração Saipos'
                                    : 'Cadastre uma nova loja e crie ou vincule o administrador responsável'}
                            </p>
                        </div>
                    </div>
                    <button type="button" className="btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">Nome da Empresa / Unidade *</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Ex: Jalapeño Botafogo"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="input-group">
                            <label className="input-label">Nome do Admin Responsável</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ex: Maria Silva"
                                value={form.adminName}
                                onChange={e => setForm({ ...form, adminName: e.target.value })}
                            />
                        </div>
                        <div className="input-group">
                            <label className="input-label">E-mail do Admin Responsável</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="admin@unidade.com"
                                value={form.adminEmail}
                                onChange={e => setForm({ ...form, adminEmail: e.target.value })}
                            />
                        </div>
                    </div>

                    {!isEdit && (
                        <div className="input-group">
                            <label className="input-label">
                                Senha Inicial do Admin (opcional — deixe em branco para exigir 1º Acesso)
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type={showPwd ? 'text' : 'password'}
                                        className="input-field"
                                        placeholder="Definir senha imediata (opcional)"
                                        value={form.adminPassword}
                                        onChange={e => setForm({ ...form, adminPassword: e.target.value })}
                                        style={{ paddingRight: 38 }}
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
                                        setForm({ ...form, adminPassword: generateRandomPassword() });
                                        setShowPwd(true);
                                    }}
                                    title="Gerar senha aleatória"
                                >
                                    <RefreshCw size={14} /> Gerar
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 14
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                            <MapPin size={15} color="#0284c7" /> Localização GPS & Check-in (opcional)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: 10 }}>
                            <div>
                                <label className="input-label">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="input-field"
                                    placeholder="-22.9068"
                                    value={form.latitude}
                                    onChange={e => setForm({ ...form, latitude: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="input-label">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    className="input-field"
                                    placeholder="-43.1729"
                                    value={form.longitude}
                                    onChange={e => setForm({ ...form, longitude: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="input-label">Raio (m)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={form.checkinRadius}
                                    onChange={e => setForm({ ...form, checkinRadius: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 14,
                        marginBottom: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                            <Link2 size={15} color="#da291c" /> Integração Saipos (opcional)
                        </div>
                        <div className="input-group" style={{ marginBottom: 10 }}>
                            <label className="input-label">Token Saipos</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Token Bearer da API Saipos"
                                value={form.saipos_token}
                                onChange={e => setForm({ ...form, saipos_token: e.target.value })}
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.ignore_ficha_venda}
                                onChange={e => setForm({ ...form, ignore_ficha_venda: e.target.checked })}
                            />
                            Ignorar Ficha/Venda na sincronização Saipos
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
                            <Save size={15} /> {saving ? 'Salvando...' : (isEdit ? 'Salvar Alterações' : 'Criar Empresa')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
