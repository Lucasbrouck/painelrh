'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Building2,
    Users,
    ShieldCheck,
    ShieldAlert,
    Plus,
    Search,
    LogOut,
    Pencil,
    Trash2,
    ArrowLeft,
    ArrowRight,
    Link2,
    UserPlus,
    KeyRound,
    Eye,
    EyeOff,
    Copy,
    MapPin,
    CheckCircle2,
    Clock,
    Menu,
    X,
    Flame,
    RefreshCw,
    UserX
} from 'lucide-react';
import CompanyModal from './components/CompanyModal';
import UserModal from './components/UserModal';
import PasswordModal from './components/PasswordModal';
import LinkExistingUserModal from './components/LinkExistingUserModal';
import UsersTable from './components/UsersTable';
import CaJaLoginButton from './components/CaJaLoginButton';

const SESSION_KEY = 'jalapeno_superadmin_session';

export default function SuperAdminPortal() {
    // Auth State
    const [sessionUser, setSessionUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);

    // Data State
    const [companies, setCompanies] = useState([]);
    const [users, setUsers] = useState([]);
    const [superAdmins, setSuperAdmins] = useState([]);
    const [loadingData, setLoadingData] = useState(false);

    // Navigation State
    const [activeView, setActiveView] = useState('companies'); // 'companies' | 'company-detail' | 'all-users' | 'orphans' | 'superadmins'
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    // Filters
    const [companySearch, setCompanySearch] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'manager' | 'worker'
    const [globalCompanyFilter, setGlobalCompanyFilter] = useState('all');

    // Modals
    const [companyModalOpen, setCompanyModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);

    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordTargetUser, setPasswordTargetUser] = useState(null);

    const [linkModalOpen, setLinkModalOpen] = useState(false);

    // SuperAdmin CRUD Modal
    const [saModalOpen, setSaModalOpen] = useState(false);
    const [editingSa, setEditingSa] = useState(null);
    const [saForm, setSaForm] = useState({ name: '', email: '', password: '' });
    const [revealedSaIds, setRevealedSaIds] = useState({});
    const [saError, setSaError] = useState('');
    const [savingSa, setSavingSa] = useState(false);

    // Toast Notification
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const notify = useCallback((message, type = 'success') => {
        setToast({ visible: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3400);
    }, []);

    // Restore Session (sincroniza cookie SSO 'session' com localStorage)
    useEffect(() => {
        try {
            let cookieSession = null;
            const match = document.cookie.match(/(?:^|;\s*)session=([^;]+)/);
            if (match && match[1]) {
                try {
                    cookieSession = JSON.parse(decodeURIComponent(match[1]));
                } catch (_) {
                    try {
                        cookieSession = JSON.parse(match[1]);
                    } catch (_) {}
                }
            }

            if (cookieSession && cookieSession.email) {
                localStorage.setItem(SESSION_KEY, JSON.stringify(cookieSession));
                setSessionUser(cookieSession);
            } else {
                const raw = localStorage.getItem(SESSION_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && parsed.email) {
                        setSessionUser(parsed);
                    }
                }
            }
        } catch (_) {}
        setAuthChecked(true);
    }, []);

    const fetchAllData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [cRes, uRes, saRes] = await Promise.all([
                fetch('/api/companies', { cache: 'no-store' }),
                fetch('/api/users', { cache: 'no-store' }),
                fetch('/api/superadmins', { cache: 'no-store' })
            ]);
            if (cRes.ok) setCompanies(await cRes.json());
            if (uRes.ok) setUsers(await uRes.json());
            if (saRes.ok) setSuperAdmins(await saRes.json());
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
            notify('Erro ao carregar dados do banco.', 'error');
        } finally {
            setLoadingData(false);
        }
    }, [notify]);

    useEffect(() => {
        if (sessionUser) {
            fetchAllData();
        }
    }, [sessionUser, fetchAllData]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoggingIn(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginEmail.trim(),
                    password: loginPassword
                })
            });
            const data = await res.json();
            if (!res.ok || !data.user) {
                setLoginError(data.error || 'Falha na autenticação.');
                return;
            }
            setSessionUser(data.user);
            localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        } catch (err) {
            setLoginError('Erro ao conectar ao servidor.');
        } finally {
            setLoggingIn(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem(SESSION_KEY);
        document.cookie = 'session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        setSessionUser(null);
        setLoginPassword('');
    };

    const companiesMap = useMemo(() => {
        const map = {};
        for (const c of companies) {
            map[String(c.id)] = c.name;
        }
        return map;
    }, [companies]);

    const selectedCompany = useMemo(
        () => companies.find(c => String(c.id) === String(selectedCompanyId)) || null,
        [companies, selectedCompanyId]
    );

    const kpis = useMemo(() => {
        const totalCompanies = companies.length;
        const totalUsers = users.length;
        const adminsAndManagers = users.filter(u => u.role === 'admin' || u.role === 'manager').length;
        const workers = users.filter(u => u.role === 'worker').length;
        const orphans = users.filter(u => (u.company_ids || []).length === 0).length;
        const pendingFirst = users.filter(u => Number(u.isFirstAccess) === 1).length;
        return { totalCompanies, totalUsers, adminsAndManagers, workers, orphans, pendingFirst };
    }, [companies, users]);

    const filteredCompanies = useMemo(() => {
        if (!companySearch.trim()) return companies;
        const q = companySearch.trim().toLowerCase();
        return companies.filter(c =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.adminName && c.adminName.toLowerCase().includes(q)) ||
            (c.adminEmail && c.adminEmail.toLowerCase().includes(q))
        );
    }, [companies, companySearch]);

    const companyUsers = useMemo(() => {
        if (!selectedCompanyId) return [];
        const target = String(selectedCompanyId);
        return users.filter(u => (u.company_ids || []).includes(target));
    }, [users, selectedCompanyId]);

    const displayedUsers = useMemo(() => {
        let base = users;

        if (activeView === 'company-detail' && selectedCompanyId) {
            base = companyUsers;
        } else if (activeView === 'orphans') {
            base = users.filter(u => (u.company_ids || []).length === 0);
        } else if (activeView === 'all-users' && globalCompanyFilter !== 'all') {
            if (globalCompanyFilter === 'orphan') {
                base = users.filter(u => (u.company_ids || []).length === 0);
            } else {
                base = users.filter(u => (u.company_ids || []).includes(String(globalCompanyFilter)));
            }
        }

        if (roleFilter !== 'all') {
            base = base.filter(u => u.role === roleFilter);
        }

        if (userSearch.trim()) {
            const q = userSearch.trim().toLowerCase();
            base = base.filter(u =>
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.nfc_id && u.nfc_id.toLowerCase().includes(q)) ||
                (u.id && u.id.toLowerCase().includes(q))
            );
        }

        return base;
    }, [activeView, selectedCompanyId, companyUsers, users, globalCompanyFilter, roleFilter, userSearch]);

    const companyRoleCounts = useMemo(() => {
        return {
            all: companyUsers.length,
            admin: companyUsers.filter(u => u.role === 'admin').length,
            manager: companyUsers.filter(u => u.role === 'manager').length,
            worker: companyUsers.filter(u => u.role === 'worker').length
        };
    }, [companyUsers]);

    const openCompanyDetail = (cid) => {
        setSelectedCompanyId(cid);
        setActiveView('company-detail');
        setRoleFilter('all');
        setUserSearch('');
        setMobileNavOpen(false);
    };

    const handleDeleteCompany = async (company) => {
        const msg = `Tem certeza que deseja excluir a empresa "${company.name}"?\n\nOs usuários vinculados NÃO serão excluídos, apenas desvinculados desta empresa. Turnos, metas e registros operacionais desta unidade serão removidos.`;
        if (!confirm(msg)) return;
        try {
            const res = await fetch(`/api/companies?id=${company.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || data.error) {
                notify(data.error || 'Erro ao excluir empresa.', 'error');
                return;
            }
            notify(`Empresa "${company.name}" excluída!`);
            if (String(selectedCompanyId) === String(company.id)) {
                setSelectedCompanyId(null);
                setActiveView('companies');
            }
            fetchAllData();
        } catch (err) {
            notify('Erro de conexão.', 'error');
        }
    };

    const handleQuickRoleChange = async (u, newRole) => {
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: u.id, role: newRole })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                notify(data.error || 'Erro ao alterar cargo.', 'error');
                return;
            }
            notify(`Cargo de ${u.name} alterado para ${newRole === 'admin' ? 'Administrador' : newRole === 'manager' ? 'Gestor' : 'Colaborador'}.`);
            fetchAllData();
        } catch (err) {
            notify('Erro de conexão.', 'error');
        }
    };

    const handleToggleFirstAccess = async (u) => {
        const nextVal = Number(u.isFirstAccess) === 1 ? 0 : 1;
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: u.id, isFirstAccess: nextVal })
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                notify(data.error || 'Erro ao alterar status.', 'error');
                return;
            }
            notify(nextVal === 1 ? `${u.name} marcado como 1º Acesso Pendente.` : `${u.name} marcado como Ativo.`);
            fetchAllData();
        } catch (err) {
            notify('Erro de conexão.', 'error');
        }
    };

    const handleUnlinkCompany = async (u, companyId) => {
        const companyName = companiesMap[String(companyId)] || companyId;
        if (!confirm(`Remover o vínculo de "${u.name}" com a empresa "${companyName}"?`)) return;
        try {
            const res = await fetch(`/api/users?id=${u.id}&companyId=${companyId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || data.error) {
                notify(data.error || 'Erro ao desvincular usuário.', 'error');
                return;
            }
            notify(`"${u.name}" desvinculado de ${companyName}.`);
            fetchAllData();
        } catch (err) {
            notify('Erro de conexão.', 'error');
        }
    };

    const handleDeleteUser = async (u) => {
        if (!confirm(`ATENÇÃO: Excluir permanentemente o usuário "${u.name}" (${u.email}) do banco de dados?\n\nEssa ação apaga o usuário de todas as empresas e histórico associado.`)) return;
        try {
            const res = await fetch(`/api/users?id=${u.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || data.error) {
                notify(data.error || 'Erro ao excluir usuário.', 'error');
                return;
            }
            notify(`Usuário "${u.name}" excluído permanentemente.`);
            fetchAllData();
        } catch (err) {
            notify('Erro de conexão.', 'error');
        }
    };

    const handleCopyText = async (text, successMsg) => {
        if (!text) {
            notify('Nada para copiar.', 'error');
            return;
        }
        await navigator.clipboard.writeText(text);
        notify(successMsg || 'Copiado!');
    };

    // SuperAdmin CRUD handlers
    const openSaModal = (sa = null) => {
        setSaError('');
        if (sa) {
            setEditingSa(sa);
            setSaForm({ name: sa.name || '', email: sa.email || '', password: '' });
        } else {
            setEditingSa(null);
            setSaForm({ name: '', email: '', password: '' });
        }
        setSaModalOpen(true);
    };

    const handleSaveSa = async (e) => {
        e.preventDefault();
        setSaError('');
        setSavingSa(true);
        try {
            const isEdit = Boolean(editingSa?.id);
            const payload = isEdit
                ? { id: editingSa.id, name: saForm.name, email: saForm.email, ...(saForm.password ? { password: saForm.password } : {}) }
                : saForm;
            const res = await fetch('/api/superadmins', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                setSaError(data.error || 'Erro ao salvar Super Admin.');
                return;
            }
            setSaModalOpen(false);
            notify(isEdit ? 'Conta Super Admin atualizada!' : 'Novo Super Admin criado!');
            fetchAllData();
        } catch (err) {
            setSaError('Erro de conexão.');
        } finally {
            setSavingSa(false);
        }
    };

    const handleDeleteSa = async (sa) => {
        if (!confirm(`Excluir a conta Super Admin "${sa.name}" (${sa.email})?`)) return;
        try {
            const res = await fetch(`/api/superadmins?id=${sa.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || data.error) {
                notify(data.error || 'Não foi possível excluir.', 'error');
                return;
            }
            notify('Conta Super Admin removida.');
            fetchAllData();
        } catch (err) {
            notify('Erro de conexão.', 'error');
        }
    };

    if (!authChecked) {
        return <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Carregando painel...</div>;
    }

    // ===== LOGIN VIEW =====
    if (!sessionUser) {
        return (
            <div className="sa-login-wrapper">
                <div className="sa-login-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Flame size={25} color="#ef4444" />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Jalapeño Super Admin
                            </div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                                Governança Multi-Empresa & Controle Central
                            </div>
                        </div>
                    </div>

                    <div style={{ maxWidth: 500 }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            padding: '6px 14px',
                            borderRadius: 999,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            marginBottom: 20
                        }}>
                            <ShieldCheck size={15} /> Acesso Global Multi-Tenant
                        </div>
                        <h1 style={{
                            fontSize: '2.35rem',
                            fontWeight: 800,
                            lineHeight: 1.15,
                            marginBottom: 18,
                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                        }}>
                            Gerencie todas as empresas, usuários e senhas em um só lugar.
                        </h1>
                        <p style={{ fontSize: '0.96rem', lineHeight: 1.6, opacity: 0.85 }}>
                            Crie novas unidades, configure integrações Saipos e GPS, visualize e redefina senhas, altere cargos ou vincule administradores a múltiplas empresas com total controle.
                        </p>
                    </div>

                    <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>
                        © {new Date().getFullYear()} Jalapeño · Console Central Super Admin
                    </div>
                </div>

                <div className="sa-login-right">
                    <div className="sa-card" style={{ width: '100%', maxWidth: 420, padding: 34 }}>
                        <div style={{ marginBottom: 22 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <ShieldAlert size={22} color="#da291c" />
                                <h2 className="sa-h2" style={{ margin: 0 }}>Login Super Administrador</h2>
                            </div>
                            <p style={{ fontSize: '0.84rem', color: '#64748b' }}>
                                Entre com sua credencial mestre para acessar o banco da rede
                            </p>
                        </div>

                        <form onSubmit={handleLogin}>
                            <div className="input-group">
                                <label className="input-label">E-mail Super Admin</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    placeholder="superadm@jalapeno.com"
                                    value={loginEmail}
                                    onChange={e => setLoginEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Senha</label>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="••••••••"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {loginError && (
                                <div style={{
                                    background: '#fef2f2',
                                    border: '1px solid #fecaca',
                                    color: '#b91c1c',
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    marginBottom: 14
                                }}>
                                    {loginError}
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary" style={{ width: '100%', minHeight: 44 }} disabled={loggingIn}>
                                {loggingIn ? 'Autenticando...' : 'Entrar no Painel Super Admin'}
                            </button>
                        </form>

                        <div style={{ margin: '18px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>ou acesse com</span>
                            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        </div>

                        <CaJaLoginButton />
                    </div>
                </div>
            </div>
        );
    }

    // Header Title helper
    const getHeaderInfo = () => {
        if (activeView === 'company-detail' && selectedCompany) {
            return {
                title: selectedCompany.name,
                subtitle: `Gerenciamento completo de usuários, senhas e acessos desta empresa`
            };
        }
        if (activeView === 'all-users') {
            return {
                title: 'Todos os Usuários da Rede',
                subtitle: 'Visão global de todos os administradores, gestores e colaboradores cadastrados'
            };
        }
        if (activeView === 'orphans') {
            return {
                title: 'Usuários Sem Empresa (Órfãos)',
                subtitle: 'Contas cadastradas sem vínculo com nenhuma empresa no momento'
            };
        }
        if (activeView === 'superadmins') {
            return {
                title: 'Contas Super Admin',
                subtitle: 'Gerencie os usuários com acesso total a este painel central'
            };
        }
        return {
            title: 'Empresas & Unidades Jalapeño',
            subtitle: 'Painel mestre para cadastrar empresas, monitorar usuários e gerenciar credenciais'
        };
    };

    const headerInfo = getHeaderInfo();

    return (
        <div className="sa-shell">
            <div className={`sa-backdrop ${mobileNavOpen ? 'open' : ''}`} onClick={() => setMobileNavOpen(false)} />

            {/* Sidebar */}
            <aside className={`sa-sidebar ${mobileNavOpen ? 'open' : ''}`}>
                <div style={{
                    height: 'var(--topbar-height)',
                    padding: '0 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 9,
                            background: '#da291c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Flame size={19} color="#ffffff" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                Jalapeño
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                                SUPER ADMIN
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: mobileNavOpen ? 'inline-flex' : 'none' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', padding: '0 10px', marginBottom: 8 }}>
                            PAINEL CENTRAL
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                { id: 'companies', label: 'Rede de Empresas', icon: Building2, count: companies.length },
                                { id: 'all-users', label: 'Todos os Usuários', icon: Users, count: users.length },
                                { id: 'orphans', label: 'Sem Empresa', icon: UserX, count: kpis.orphans },
                                { id: 'superadmins', label: 'Contas Super Admin', icon: ShieldCheck, count: superAdmins.length }
                            ].map(item => {
                                const Icon = item.icon;
                                const isActive = activeView === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveView(item.id);
                                            setRoleFilter('all');
                                            setUserSearch('');
                                            setMobileNavOpen(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 10,
                                            padding: '10px 12px',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
                                            color: isActive ? '#ffffff' : '#cbd5e1',
                                            fontSize: '0.84rem',
                                            fontWeight: isActive ? 700 : 500,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <Icon size={17} color={isActive ? '#ef4444' : '#94a3b8'} />
                                            <span>{item.label}</span>
                                        </span>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            padding: '2px 7px',
                                            borderRadius: 999,
                                            background: isActive ? '#da291c' : 'rgba(255,255,255,0.08)',
                                            color: '#ffffff',
                                            fontWeight: 700
                                        }}>
                                            {item.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Company List */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', marginBottom: 8 }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
                                EMPRESAS ({companies.length})
                            </span>
                            <button
                                type="button"
                                onClick={() => { setEditingCompany(null); setCompanyModalOpen(true); }}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                title="Nova Empresa"
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {companies.map(c => {
                                const isCurrent = activeView === 'company-detail' && String(selectedCompanyId) === String(c.id);
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => openCompanyDetail(c.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8,
                                            padding: '8px 12px',
                                            borderRadius: 8,
                                            border: 'none',
                                            background: isCurrent ? 'rgba(255,255,255,0.12)' : 'transparent',
                                            color: isCurrent ? '#ffffff' : '#94a3b8',
                                            fontSize: '0.82rem',
                                            fontWeight: isCurrent ? 700 : 500,
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {c.name}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', opacity: 0.75, flexShrink: 0 }}>
                                            {c.totalUsers}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </nav>

                {/* User Footer */}
                <div style={{
                    padding: '14px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sessionUser.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sessionUser.email}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#fca5a5',
                            padding: '7px 10px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: '0.76rem',
                            fontWeight: 600
                        }}
                        title="Sair"
                    >
                        <LogOut size={14} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="sa-main">
                <header className="sa-topbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <button type="button" className="sa-mobile-btn" onClick={() => setMobileNavOpen(true)}>
                            <Menu size={20} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                            <h1 className="sa-h1" style={{ fontSize: '1.1rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {headerInfo.title}
                            </h1>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                                {headerInfo.subtitle}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={fetchAllData}
                            disabled={loadingData}
                            title="Recarregar dados do banco"
                        >
                            <RefreshCw size={14} /> Atualizar
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => { setEditingCompany(null); setCompanyModalOpen(true); }}
                        >
                            <Plus size={15} /> Nova Empresa
                        </button>
                    </div>
                </header>

                <main className="sa-content">
                    {/* VIEW 1: COMPANIES OVERVIEW */}
                    {activeView === 'companies' && (
                        <>
                            <div className="sa-kpi-grid">
                                <div className="sa-kpi-card">
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Empresas</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{kpis.totalCompanies}</div>
                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Unidades cadastradas</div>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef2f2', color: '#da291c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Building2 size={20} />
                                    </div>
                                </div>

                                <div className="sa-kpi-card">
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Usuários</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{kpis.totalUsers}</div>
                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{kpis.adminsAndManagers} admins/gestores · {kpis.workers} colabs</div>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Users size={20} />
                                    </div>
                                </div>

                                <div className="sa-kpi-card">
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>1º Acesso Pendente</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{kpis.pendingFirst}</div>
                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Aguardando definir senha</div>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Clock size={20} />
                                    </div>
                                </div>

                                <div className="sa-kpi-card" style={{ cursor: 'pointer' }} onClick={() => setActiveView('orphans')}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Sem Empresa</div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: kpis.orphans > 0 ? '#dc2626' : '#10b981', marginTop: 4 }}>{kpis.orphans}</div>
                                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Clique para revisar vínculos</div>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <UserX size={20} />
                                    </div>
                                </div>
                            </div>

                            {/* Action & Search Bar */}
                            <div className="sa-card" style={{ marginBottom: 20, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ position: 'relative', flex: 1, maxWidth: 420, minWidth: 240 }}>
                                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Buscar empresa por nome, admin ou e-mail..."
                                        value={companySearch}
                                        onChange={e => setCompanySearch(e.target.value)}
                                        style={{ paddingLeft: 36 }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
                                    >
                                        <UserPlus size={16} /> Novo Usuário
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => { setEditingCompany(null); setCompanyModalOpen(true); }}
                                    >
                                        <Plus size={16} /> Nova Empresa / Unidade
                                    </button>
                                </div>
                            </div>

                            {/* Companies Grid */}
                            {loadingData && companies.length === 0 ? (
                                <div className="sa-card" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                                    Carregando empresas...
                                </div>
                            ) : filteredCompanies.length === 0 ? (
                                <div className="sa-card" style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                                    Nenhuma empresa encontrada.
                                </div>
                            ) : (
                                <div className="sa-companies-grid">
                                    {filteredCompanies.map(c => (
                                        <div key={c.id} className="sa-company-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <h3 className="sa-h3" style={{ margin: 0, fontSize: '1.08rem', color: '#0f172a' }}>{c.name}</h3>
                                                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 3 }}>
                                                        Admin: <strong>{c.adminName || '—'}</strong> ({c.adminEmail || '—'})
                                                    </div>
                                                </div>
                                                <span className="badge badge-info">{c.totalUsers} usuários</span>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                <span className="badge badge-danger">{c.adminCount} admin(s)</span>
                                                <span className="badge badge-info">{c.managerCount} gestor(es)</span>
                                                <span className="badge badge-neutral">{c.workerCount} colaborador(es)</span>
                                                {c.pendingFirstAccessCount > 0 && (
                                                    <span className="badge badge-warning">{c.pendingFirstAccessCount} pendente(s)</span>
                                                )}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 10,
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                                padding: '10px 12px',
                                                background: '#f8fafc',
                                                borderRadius: 10,
                                                border: '1px solid #e2e8f0'
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <MapPin size={13} color={c.latitude && c.longitude ? '#10b981' : '#94a3b8'} />
                                                    {c.latitude && c.longitude ? `GPS OK (${c.checkinRadius || 200}m)` : 'Sem GPS'}
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Saipos: <strong style={{ color: c.saipos_token ? '#15803d' : '#64748b' }}>
                                                        {c.saipos_token ? 'Configurado' : 'Não configurado'}
                                                    </strong>
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-dark"
                                                    style={{ flex: 1 }}
                                                    onClick={() => openCompanyDetail(c.id)}
                                                >
                                                    <Users size={15} /> Gerenciar Usuários <ArrowRight size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    onClick={() => { setEditingCompany(c); setCompanyModalOpen(true); }}
                                                    title="Editar empresa"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-danger-outline btn-sm"
                                                    onClick={() => handleDeleteCompany(c)}
                                                    title="Excluir empresa"
                                                    style={{ padding: '7px 9px' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* VIEW 2: COMPANY DETAIL (USERS, PASSWORDS, ROLES FOR ONE COMPANY) */}
                    {activeView === 'company-detail' && selectedCompany && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div className="sa-card" style={{ padding: '18px 22px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                                    <div>
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setActiveView('companies')}
                                            style={{ marginBottom: 10 }}
                                        >
                                            <ArrowLeft size={14} /> Todas as Empresas
                                        </button>
                                        <h2 className="sa-h2" style={{ margin: 0, fontSize: '1.35rem' }}>{selectedCompany.name}</h2>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, fontSize: '0.8rem', color: '#64748b' }}>
                                            <span>Admin: <strong>{selectedCompany.adminName}</strong> ({selectedCompany.adminEmail})</span>
                                            <span>•</span>
                                            <span>
                                                ID: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>{selectedCompany.id}</code>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(selectedCompany.id, 'ID da empresa copiado!')}
                                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: 4 }}
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </span>
                                            <span>•</span>
                                            <span>GPS: {selectedCompany.latitude && selectedCompany.longitude ? `${selectedCompany.latitude}, ${selectedCompany.longitude} (${selectedCompany.checkinRadius || 200}m)` : 'Não configurado'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => { setEditingCompany(selectedCompany); setCompanyModalOpen(true); }}
                                        >
                                            <Pencil size={15} /> Editar Empresa
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setLinkModalOpen(true)}
                                        >
                                            <Link2 size={15} color="#15803d" /> Vincular Existente
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
                                        >
                                            <UserPlus size={15} /> Novo Usuário nesta Empresa
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Filter & Role Tabs */}
                            <div className="sa-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {[
                                        { key: 'all', label: `Todos (${companyRoleCounts.all})` },
                                        { key: 'admin', label: `Administradores (${companyRoleCounts.admin})` },
                                        { key: 'manager', label: `Gestores (${companyRoleCounts.manager})` },
                                        { key: 'worker', label: `Colaboradores (${companyRoleCounts.worker})` }
                                    ].map(tab => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setRoleFilter(tab.key)}
                                            className={`btn btn-sm ${roleFilter === tab.key ? 'btn-dark' : 'btn-secondary'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px', maxWidth: 380 }}>
                                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Buscar por nome, e-mail ou NFC..."
                                        value={userSearch}
                                        onChange={e => setUserSearch(e.target.value)}
                                        style={{ paddingLeft: 34, paddingTop: 8, paddingBottom: 8 }}
                                    />
                                </div>
                            </div>

                            <UsersTable
                                users={displayedUsers}
                                companiesMap={companiesMap}
                                activeCompanyId={selectedCompany.id}
                                loading={loadingData}
                                onEditUser={u => { setEditingUser(u); setUserModalOpen(true); }}
                                onOpenPasswordModal={u => { setPasswordTargetUser(u); setPasswordModalOpen(true); }}
                                onQuickRoleChange={handleQuickRoleChange}
                                onToggleFirstAccess={handleToggleFirstAccess}
                                onUnlinkCompany={handleUnlinkCompany}
                                onDeleteUser={handleDeleteUser}
                                onCopyText={handleCopyText}
                                onSelectCompany={openCompanyDetail}
                            />
                        </div>
                    )}

                    {/* VIEW 3 & 4: ALL USERS & ORPHAN USERS */}
                    {(activeView === 'all-users' || activeView === 'orphans') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div className="sa-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                                    <div style={{ position: 'relative', minWidth: 240, flex: '1 1 260px', maxWidth: 380 }}>
                                        <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Buscar usuário por nome, e-mail ou NFC..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                            style={{ paddingLeft: 34 }}
                                        />
                                    </div>

                                    {activeView === 'all-users' && (
                                        <select
                                            className="input-field"
                                            style={{ width: 'auto', minWidth: 200 }}
                                            value={globalCompanyFilter}
                                            onChange={e => setGlobalCompanyFilter(e.target.value)}
                                        >
                                            <option value="all">Todas as Empresas ({users.length})</option>
                                            <option value="orphan">Sem Empresa Vinculada ({kpis.orphans})</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.totalUsers})</option>
                                            ))}
                                        </select>
                                    )}

                                    <select
                                        className="input-field"
                                        style={{ width: 'auto', minWidth: 170 }}
                                        value={roleFilter}
                                        onChange={e => setRoleFilter(e.target.value)}
                                    >
                                        <option value="all">Todos os Cargos</option>
                                        <option value="admin">Administradores</option>
                                        <option value="manager">Gestores</option>
                                        <option value="worker">Colaboradores</option>
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => { setEditingUser(null); setUserModalOpen(true); }}
                                >
                                    <UserPlus size={16} /> Novo Usuário
                                </button>
                            </div>

                            <UsersTable
                                users={displayedUsers}
                                companiesMap={companiesMap}
                                activeCompanyId={null}
                                loading={loadingData}
                                onEditUser={u => { setEditingUser(u); setUserModalOpen(true); }}
                                onOpenPasswordModal={u => { setPasswordTargetUser(u); setPasswordModalOpen(true); }}
                                onQuickRoleChange={handleQuickRoleChange}
                                onToggleFirstAccess={handleToggleFirstAccess}
                                onUnlinkCompany={handleUnlinkCompany}
                                onDeleteUser={handleDeleteUser}
                                onCopyText={handleCopyText}
                                onSelectCompany={openCompanyDetail}
                            />
                        </div>
                    )}

                    {/* VIEW 5: SUPER ADMINS MANAGEMENT */}
                    {activeView === 'superadmins' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div className="sa-card" style={{ padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <h2 className="sa-h3" style={{ margin: 0 }}>Administradores Globais do Painel</h2>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                                        Contas armazenadas na tabela <code>super_admins</code> com permissão total sobre todas as empresas
                                    </p>
                                </div>
                                <button type="button" className="btn btn-primary" onClick={() => openSaModal(null)}>
                                    <Plus size={16} /> Novo Super Admin
                                </button>
                            </div>

                            <div className="sa-table-container">
                                <table className="sa-table">
                                    <thead>
                                        <tr>
                                            <th>Nome</th>
                                            <th>E-mail</th>
                                            <th>Senha</th>
                                            <th style={{ textAlign: 'right' }}>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {superAdmins.map(sa => {
                                            const revealed = Boolean(revealedSaIds[sa.id]);
                                            return (
                                                <tr key={sa.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                                                            <ShieldCheck size={16} color="#da291c" />
                                                            <span>{sa.name}</span>
                                                            {sa.email === sessionUser.email && (
                                                                <span className="badge badge-info">Você</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{sa.email}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <code style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, fontFamily: 'monospace' }}>
                                                                {revealed ? sa.password : '••••••••'}
                                                            </code>
                                                            <button
                                                                type="button"
                                                                className="btn-icon"
                                                                onClick={() => setRevealedSaIds(p => ({ ...p, [sa.id]: !p[sa.id] }))}
                                                            >
                                                                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-icon"
                                                                onClick={() => handleCopyText(sa.password, 'Senha copiada!')}
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', gap: 6 }}>
                                                            <button type="button" className="btn-icon" onClick={() => openSaModal(sa)}>
                                                                <Pencil size={15} />
                                                            </button>
                                                            {superAdmins.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-danger-outline btn-sm"
                                                                    onClick={() => handleDeleteSa(sa)}
                                                                    style={{ padding: '6px 8px' }}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Modals */}
            <CompanyModal
                open={companyModalOpen}
                company={editingCompany}
                onClose={() => setCompanyModalOpen(false)}
                onSaved={(result, isEdit) => {
                    setCompanyModalOpen(false);
                    notify(isEdit ? 'Empresa atualizada com sucesso!' : 'Nova empresa cadastrada com sucesso!');
                    fetchAllData();
                }}
            />

            <UserModal
                open={userModalOpen}
                user={editingUser}
                companies={companies}
                defaultCompanyId={activeView === 'company-detail' ? selectedCompanyId : null}
                onClose={() => setUserModalOpen(false)}
                onSaved={(_, isEdit) => {
                    setUserModalOpen(false);
                    notify(isEdit ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
                    fetchAllData();
                }}
            />

            <PasswordModal
                open={passwordModalOpen}
                user={passwordTargetUser}
                onClose={() => setPasswordModalOpen(false)}
                onNotify={notify}
                onSaved={() => {
                    setPasswordModalOpen(false);
                    notify('Senha e status de acesso atualizados!');
                    fetchAllData();
                }}
            />

            <LinkExistingUserModal
                open={linkModalOpen}
                company={selectedCompany}
                allUsers={users}
                companies={companies}
                onClose={() => setLinkModalOpen(false)}
                onLinked={(updated) => {
                    notify(`"${updated.name}" vinculado a ${selectedCompany?.name}!`);
                    fetchAllData();
                }}
            />

            {/* Super Admin Account Modal */}
            {saModalOpen && (
                <div className="sa-modal-overlay" onClick={() => setSaModalOpen(false)}>
                    <div className="sa-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 className="sa-h2" style={{ margin: 0 }}>
                                {editingSa ? 'Editar Super Admin' : 'Novo Super Admin'}
                            </h3>
                            <button type="button" className="btn-icon" onClick={() => setSaModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSa}>
                            <div className="input-group">
                                <label className="input-label">Nome</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={saForm.name}
                                    onChange={e => setSaForm({ ...saForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">E-mail</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={saForm.email}
                                    onChange={e => setSaForm({ ...saForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label className="input-label">
                                    {editingSa ? 'Nova Senha (deixe em branco p/ manter)' : 'Senha *'}
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={saForm.password}
                                    onChange={e => setSaForm({ ...saForm, password: e.target.value })}
                                    required={!editingSa}
                                />
                            </div>

                            {saError && (
                                <div style={{
                                    background: '#fef2f2',
                                    color: '#b91c1c',
                                    padding: '9px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.82rem',
                                    marginBottom: 12
                                }}>
                                    {saError}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setSaModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingSa}>
                                    {savingSa ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast.visible && (
                <div style={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: toast.type === 'error' ? '#dc2626' : '#0f172a',
                    color: '#ffffff',
                    padding: '12px 18px',
                    borderRadius: 10,
                    boxShadow: 'var(--shadow-lg)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    zIndex: 9999
                }}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}
