import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import pg from 'pg';

const LOCAL_DB_PATH = join(process.cwd(), 'database', 'app.db');
const SHARED_DB_PATH = join(process.cwd(), '..', 'employee-rewards-main', 'database', 'app.db');
const PARENT_DB_PATH = join(process.cwd(), '..', 'database', 'app.db');

const RESOLVED_DEFAULT_DB_PATH = existsSync(LOCAL_DB_PATH)
    ? LOCAL_DB_PATH
    : existsSync(SHARED_DB_PATH)
        ? SHARED_DB_PATH
        : existsSync(PARENT_DB_PATH)
            ? PARENT_DB_PATH
            : LOCAL_DB_PATH;

const DB_PATH = process.env.DATABASE_PATH || RESOLVED_DEFAULT_DB_PATH;
const SCHEMA_PATH = join(process.cwd(), 'lib', 'schema.sql');
const PG_SCHEMA_PATH = join(process.cwd(), 'lib', 'schema-postgres.sql');

const PG_CONNECTION_STRING = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL || '';
const USE_POSTGRES = Boolean(PG_CONNECTION_STRING);

pg.types.setTypeParser(20, val => (val === null ? null : parseInt(val, 10)));
pg.types.setTypeParser(1700, val => (val === null ? null : parseFloat(val)));

const LOWER_TO_CAMEL_MAP = {
    userid: 'userId',
    createdat: 'createdAt',
    adminname: 'adminName',
    adminemail: 'adminEmail',
    checkinradius: 'checkinRadius',
    updatedat: 'updatedAt',
    platabalance: 'plataBalance',
    isfirstaccess: 'isFirstAccess',
    resettoken: 'resetToken',
    resettokenexpires: 'resetTokenExpires',
    pdfobs: 'pdfObs',
    maquininhaonboarding: 'maquininhaOnboarding',
    recebejae: 'recebeJae',
    elegivelpremio: 'elegivelPremio',
    ignore_admission_docs: 'ignore_admission_docs',
    ignoreadmissiondocs: 'ignore_admission_docs',
    ignore_first_access: 'ignore_first_access',
    ignorefirstaccess: 'ignore_first_access',
    hiringdate: 'hiringDate',
    cajauserid: 'cajaUserId',
    cajarole: 'cajaRole',
    timesheetheader: 'timesheetHeader',
    ignore_ficha_venda: 'ignore_ficha_venda',
    saipos_token: 'saipos_token'
};

function normalizeRow(row) {
    if (!row || typeof row !== 'object') return row;
    const out = {};
    for (const key of Object.keys(row)) {
        const mappedKey = LOWER_TO_CAMEL_MAP[key] || key;
        out[mappedKey] = row[key];
    }
    return out;
}

function toPgSql(sql) {
    let converted = sql
        .replace(/\binstr\s*\(/gi, 'strpos(')
        .replace(/datetime\s*\(\s*'now'\s*\)/gi, '(CURRENT_TIMESTAMP::TEXT)');

    let paramIndex = 0;
    let inSingleQuote = false;
    let result = '';

    for (let i = 0; i < converted.length; i++) {
        const ch = converted[i];
        if (ch === "'") {
            if (inSingleQuote && converted[i + 1] === "'") {
                result += "''";
                i++;
                continue;
            }
            inSingleQuote = !inSingleQuote;
            result += ch;
        } else if (ch === '?' && !inSingleQuote) {
            paramIndex++;
            result += `$${paramIndex}`;
        } else {
            result += ch;
        }
    }

    return result;
}

let db = null;
let pgPool = null;

if (USE_POSTGRES) {
    const isInternalRailway = PG_CONNECTION_STRING.includes('.railway.internal');
    pgPool = new pg.Pool({
        connectionString: PG_CONNECTION_STRING,
        ssl: isInternalRailway ? false : { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
    pgPool.on('error', err => {
        console.error('Unexpected PostgreSQL pool error:', err);
    });
} else {
    const dbDir = dirname(DB_PATH);
    if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
    }
    const Database = (await import('better-sqlite3')).default;
    db = new Database(DB_PATH, { timeout: 15000 });
    try {
        db.pragma('journal_mode = WAL');
        db.pragma('busy_timeout = 15000');
        db.pragma('foreign_keys = ON');
    } catch (err) {
        if (err.code !== 'SQLITE_BUSY') {
            console.error('Error setting SQLite PRAGMAs:', err);
        }
    }
}

async function queryAll(sql, params = [], pgClient = null) {
    if (USE_POSTGRES) {
        const runner = pgClient || pgPool;
        const res = await runner.query(toPgSql(sql), params);
        return res.rows.map(normalizeRow);
    }
    return db.prepare(sql).all(...params);
}

async function queryGet(sql, params = [], pgClient = null) {
    if (USE_POSTGRES) {
        const runner = pgClient || pgPool;
        const res = await runner.query(toPgSql(sql), params);
        return res.rows.length > 0 ? normalizeRow(res.rows[0]) : undefined;
    }
    return db.prepare(sql).get(...params);
}

async function queryRun(sql, params = [], pgClient = null) {
    if (USE_POSTGRES) {
        const runner = pgClient || pgPool;
        const res = await runner.query(toPgSql(sql), params);
        const firstRow = res.rows && res.rows[0] ? normalizeRow(res.rows[0]) : null;
        return {
            changes: res.rowCount || 0,
            lastInsertRowid: firstRow?.id ?? null
        };
    }
    return db.prepare(sql).run(...params);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

const VALID_USER_ROLES = ['admin', 'manager', 'worker'];

export function parseCompanyIds(companyIdStr) {
    if (!companyIdStr) return [];
    const seen = new Set();
    const out = [];
    for (const part of String(companyIdStr).split(',')) {
        const trimmed = part.trim();
        if (trimmed && !seen.has(trimmed)) {
            seen.add(trimmed);
            out.push(trimmed);
        }
    }
    return out;
}

function normalizeCompanyIdInput(companyIdsOrStr) {
    if (Array.isArray(companyIdsOrStr)) {
        const clean = [...new Set(companyIdsOrStr.map(v => String(v || '').trim()).filter(Boolean))];
        return clean.length > 0 ? clean.join(',') : null;
    }
    if (companyIdsOrStr === null || companyIdsOrStr === undefined || companyIdsOrStr === '') {
        return null;
    }
    const clean = parseCompanyIds(companyIdsOrStr);
    return clean.length > 0 ? clean.join(',') : null;
}

let _schemaReadyPromise = null;

export async function ensureSuperAdminSchemaAsync() {
    if (_schemaReadyPromise) return _schemaReadyPromise;

    _schemaReadyPromise = (async () => {
        try {
            if (USE_POSTGRES) {
                if (existsSync(PG_SCHEMA_PATH)) {
                    const existingCompanies = await queryGet("SELECT to_regclass('public.companies') AS tbl");
                    if (!existingCompanies?.tbl) {
                        const schemaSql = readFileSync(PG_SCHEMA_PATH, 'utf-8');
                        await pgPool.query(schemaSql);
                    }
                }
            } else {
                const existingCompanies = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'").get();
                if (!existingCompanies && existsSync(SCHEMA_PATH)) {
                    const schemaSql = readFileSync(SCHEMA_PATH, 'utf-8');
                    db.exec(schemaSql);
                }
            }

            await queryRun(`
                CREATE TABLE IF NOT EXISTS super_admins (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    cajaUserId TEXT,
                    cajaRole TEXT,
                    createdAt TEXT
                )
            `);

            // Ensure optional columns exist on companies & users for older SQLite DBs
            const optionalAlterStatements = [
                'ALTER TABLE companies ADD COLUMN latitude REAL',
                'ALTER TABLE companies ADD COLUMN longitude REAL',
                'ALTER TABLE companies ADD COLUMN checkinRadius INTEGER DEFAULT 200',
                'ALTER TABLE companies ADD COLUMN saipos_token TEXT',
                'ALTER TABLE companies ADD COLUMN ignore_ficha_venda INTEGER DEFAULT 0',
                'ALTER TABLE users ADD COLUMN elegivelPremio INTEGER DEFAULT 1',
                'ALTER TABLE users ADD COLUMN ignore_admission_docs INTEGER DEFAULT 0',
                'ALTER TABLE users ADD COLUMN ignore_first_access INTEGER DEFAULT 0',
                'ALTER TABLE users ADD COLUMN nfc_id TEXT',
                'ALTER TABLE users ADD COLUMN recebeJae INTEGER DEFAULT 0',
                'ALTER TABLE users ADD COLUMN hiringDate TEXT',
                'ALTER TABLE users ADD COLUMN cajaUserId TEXT',
                'ALTER TABLE users ADD COLUMN cajaRole TEXT',
                'ALTER TABLE users ADD COLUMN pdfObs TEXT',
                'ALTER TABLE users ADD COLUMN cajaUserId TEXT',
                'ALTER TABLE users ADD COLUMN cajaRole TEXT',
                'ALTER TABLE super_admins ADD COLUMN cajaUserId TEXT',
                'ALTER TABLE super_admins ADD COLUMN cajaRole TEXT',
                'CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admins_cajaUserId ON super_admins(cajaUserId) WHERE cajaUserId IS NOT NULL',
                'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cajaUserId ON users(cajaUserId) WHERE cajaUserId IS NOT NULL'
            ];
            for (const stmt of optionalAlterStatements) {
                try {
                    await queryRun(stmt);
                } catch (_) {
                    // Column already exists
                }
            }

            const existingAdmins = await queryGet('SELECT COUNT(*) as total FROM super_admins');
            if (!existingAdmins || Number(existingAdmins.total) === 0) {
                await queryRun(
                    `INSERT INTO super_admins (id, name, email, password, createdAt) VALUES (?, ?, ?, ?, ?)`,
                    ['super-admin-id', 'Super Admin', 'superadm@jalapeno.com', 'W8t9m9s4!', new Date().toISOString()]
                );
            }
        } catch (err) {
            _schemaReadyPromise = null;
            console.error('Error ensuring superadmin schema:', err);
            throw err;
        }
    })();

    return _schemaReadyPromise;
}

// ===== SUPER ADMINS =====

export async function authenticateSuperAdmin(email, password) {
    await ensureSuperAdminSchemaAsync();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    if (!normalizedEmail || !rawPassword) return null;

    const record = await queryGet('SELECT * FROM super_admins WHERE LOWER(email) = ?', [normalizedEmail]);
    if (record && record.password === rawPassword) {
        return {
            id: record.id,
            name: record.name,
            email: record.email,
            role: 'superadmin'
        };
    }

    // Fallback safety for initial seed credential
    if (!record && normalizedEmail === 'superadm@jalapeno.com' && rawPassword === 'W8t9m9s4!') {
        return {
            id: 'super-admin-id',
            name: 'Super Admin',
            email: 'superadm@jalapeno.com',
            role: 'superadmin'
        };
    }

    return null;
}

export async function getSuperAdmins() {
    await ensureSuperAdminSchemaAsync();
    return await queryAll('SELECT id, name, email, password, createdAt FROM super_admins ORDER BY createdAt ASC');
}

export async function createSuperAdmin({ name, email, password }) {
    await ensureSuperAdminSchemaAsync();
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');

    if (!cleanName || !cleanEmail || !cleanPassword) {
        throw new Error('Nome, e-mail e senha são obrigatórios.');
    }

    const existing = await queryGet('SELECT id FROM super_admins WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
        throw new Error('Já existe um Super Admin com este e-mail.');
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await queryRun(
        'INSERT INTO super_admins (id, name, email, password, createdAt) VALUES (?, ?, ?, ?, ?)',
        [id, cleanName, cleanEmail, cleanPassword, createdAt]
    );

    return await queryGet('SELECT id, name, email, password, createdAt FROM super_admins WHERE id = ?', [id]);
}

export async function updateSuperAdmin(id, updates) {
    await ensureSuperAdminSchemaAsync();
    const current = await queryGet('SELECT * FROM super_admins WHERE id = ?', [id]);
    if (!current) throw new Error('Conta Super Admin não encontrada.');

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
        const val = String(updates.name).trim();
        if (!val) throw new Error('Nome não pode ficar vazio.');
        fields.push('name = ?');
        values.push(val);
    }
    if (updates.email !== undefined) {
        const val = String(updates.email).trim().toLowerCase();
        if (!val) throw new Error('E-mail não pode ficar vazio.');
        const dup = await queryGet('SELECT id FROM super_admins WHERE LOWER(email) = ? AND id != ?', [val, id]);
        if (dup) throw new Error('Já existe outro Super Admin com este e-mail.');
        fields.push('email = ?');
        values.push(val);
    }
    if (updates.password !== undefined && updates.password !== '') {
        fields.push('password = ?');
        values.push(String(updates.password));
    }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE super_admins SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return await queryGet('SELECT id, name, email, password, createdAt FROM super_admins WHERE id = ?', [id]);
}

export async function deleteSuperAdmin(id) {
    await ensureSuperAdminSchemaAsync();
    const countRow = await queryGet('SELECT COUNT(*) as total FROM super_admins');
    if (Number(countRow?.total || 0) <= 1) {
        throw new Error('Não é possível excluir a última conta de Super Admin.');
    }
    await queryRun('DELETE FROM super_admins WHERE id = ?', [id]);
    return { success: true };
}

// ===== COMPANIES =====

export async function getCompaniesWithStats() {
    await ensureSuperAdminSchemaAsync();
    const companies = await queryAll('SELECT * FROM companies ORDER BY name');
    const users = await queryAll('SELECT id, name, email, role, company_id, isFirstAccess FROM users');

    return companies.map(company => {
        const companyUsers = users.filter(u => parseCompanyIds(u.company_id).includes(String(company.id)));
        return {
            ...company,
            totalUsers: companyUsers.length,
            adminCount: companyUsers.filter(u => u.role === 'admin').length,
            managerCount: companyUsers.filter(u => u.role === 'manager').length,
            workerCount: companyUsers.filter(u => u.role === 'worker').length,
            pendingFirstAccessCount: companyUsers.filter(u => Number(u.isFirstAccess) === 1).length
        };
    });
}

export async function getCompanyById(id) {
    await ensureSuperAdminSchemaAsync();
    return await queryGet('SELECT * FROM companies WHERE id = ?', [id]);
}

export async function createCompany({
    name,
    adminName,
    adminEmail,
    adminPassword,
    latitude,
    longitude,
    checkinRadius,
    saipos_token,
    ignore_ficha_venda
}) {
    await ensureSuperAdminSchemaAsync();
    const cleanName = String(name || '').trim();
    const cleanAdminName = String(adminName || '').trim() || 'Administrador';
    const cleanAdminEmail = String(adminEmail || '').trim().toLowerCase();

    if (!cleanName) {
        throw new Error('Nome da empresa é obrigatório.');
    }

    const existing = await queryGet('SELECT id FROM companies WHERE LOWER(name) = ?', [cleanName.toLowerCase()]);
    if (existing) {
        throw new Error('Já existe uma empresa cadastrada com este nome.');
    }

    const companyId = randomUUID();
    const now = new Date().toISOString();
    const parsedLat = latitude !== undefined && latitude !== '' && latitude !== null ? Number(latitude) : null;
    const parsedLng = longitude !== undefined && longitude !== '' && longitude !== null ? Number(longitude) : null;
    const parsedRadius = checkinRadius !== undefined && checkinRadius !== '' && checkinRadius !== null ? Number(checkinRadius) : 200;

    await queryRun(
        `INSERT INTO companies (id, name, adminName, adminEmail, latitude, longitude, checkinRadius, saipos_token, ignore_ficha_venda, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            companyId,
            cleanName,
            cleanAdminName,
            cleanAdminEmail || 'admin@jalapeno.com',
            Number.isFinite(parsedLat) ? parsedLat : null,
            Number.isFinite(parsedLng) ? parsedLng : null,
            Number.isFinite(parsedRadius) ? parsedRadius : 200,
            saipos_token ? String(saipos_token).trim() : null,
            ignore_ficha_venda ? 1 : 0,
            now
        ]
    );

    let adminUser = null;
    if (cleanAdminEmail) {
        const existingUser = await getUserByEmail(cleanAdminEmail);
        if (existingUser) {
            const ids = parseCompanyIds(existingUser.company_id);
            if (!ids.includes(companyId)) ids.push(companyId);

            const updates = {
                company_id: ids.join(','),
                role: existingUser.role === 'worker' ? 'admin' : existingUser.role
            };
            if (adminPassword && String(adminPassword).trim()) {
                updates.password = String(adminPassword).trim();
                updates.isFirstAccess = 0;
            }
            adminUser = await updateUser(existingUser.id, updates);
        } else {
            const hasExplicitPwd = Boolean(adminPassword && String(adminPassword).trim());
            adminUser = await createUser({
                name: cleanAdminName,
                email: cleanAdminEmail,
                password: hasExplicitPwd ? String(adminPassword).trim() : 'Jalapeno@' + Math.random().toString(36).slice(-6),
                role: 'admin',
                isFirstAccess: hasExplicitPwd ? 0 : 1,
                company_id: companyId
            });
        }
    }

    const company = await getCompanyById(companyId);
    return { company, admin: adminUser };
}

export async function updateCompany(id, updates) {
    await ensureSuperAdminSchemaAsync();
    const current = await getCompanyById(id);
    if (!current) throw new Error('Empresa não encontrada.');

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
        const cleanName = String(updates.name).trim();
        if (!cleanName) throw new Error('Nome da empresa não pode ficar vazio.');
        const dup = await queryGet('SELECT id FROM companies WHERE LOWER(name) = ? AND id != ?', [cleanName.toLowerCase(), id]);
        if (dup) throw new Error('Já existe outra empresa com este nome.');
        fields.push('name = ?');
        values.push(cleanName);
    }
    if (updates.adminName !== undefined) {
        fields.push('adminName = ?');
        values.push(String(updates.adminName || '').trim() || current.adminName);
    }
    if (updates.adminEmail !== undefined) {
        fields.push('adminEmail = ?');
        values.push(String(updates.adminEmail || '').trim().toLowerCase() || current.adminEmail);
    }
    if (updates.latitude !== undefined) {
        const val = updates.latitude === '' || updates.latitude === null ? null : Number(updates.latitude);
        fields.push('latitude = ?');
        values.push(Number.isFinite(val) ? val : null);
    }
    if (updates.longitude !== undefined) {
        const val = updates.longitude === '' || updates.longitude === null ? null : Number(updates.longitude);
        fields.push('longitude = ?');
        values.push(Number.isFinite(val) ? val : null);
    }
    if (updates.checkinRadius !== undefined) {
        const val = updates.checkinRadius === '' || updates.checkinRadius === null ? 200 : Number(updates.checkinRadius);
        fields.push('checkinRadius = ?');
        values.push(Number.isFinite(val) ? val : 200);
    }
    if (updates.saipos_token !== undefined) {
        fields.push('saipos_token = ?');
        values.push(updates.saipos_token ? String(updates.saipos_token).trim() : null);
    }
    if (updates.ignore_ficha_venda !== undefined) {
        fields.push('ignore_ficha_venda = ?');
        values.push(updates.ignore_ficha_venda ? 1 : 0);
    }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return await getCompanyById(id);
}

export async function deleteCompany(id) {
    await ensureSuperAdminSchemaAsync();
    const current = await getCompanyById(id);
    if (!current) throw new Error('Empresa não encontrada.');

    // Unlink all users from this company cleanly without deleting the user accounts themselves
    const allUsers = await queryAll('SELECT id, company_id FROM users');
    for (const u of allUsers) {
        const ids = parseCompanyIds(u.company_id);
        if (ids.includes(String(id))) {
            const remaining = ids.filter(cid => cid !== String(id));
            await queryRun('UPDATE users SET company_id = ? WHERE id = ?', [
                remaining.length > 0 ? remaining.join(',') : null,
                u.id
            ]);
        }
    }

    // Delete company-scoped operational tables safely
    try {
        await queryRun('DELETE FROM shift_workers WHERE shiftId IN (SELECT id FROM shifts WHERE company_id = ?)', [id]);
    } catch (_) {}

    const tablesWithCompanyId = [
        'shifts',
        'advances',
        'absences',
        'goals',
        'weekly_metrics',
        'user_checkins',
        'store_purchases',
        'store_items',
        'pdi_answers',
        'pdi_evaluations',
        'pdi_questions',
        'pdi_models',
        'disciplinary_records',
        'disciplinary_rules',
        'plata_transactions',
        'streak_rewards_claimed',
        'user_daily_access',
        'whistleblower_reports',
        'job_applications',
        'job_openings'
    ];

    for (const tbl of tablesWithCompanyId) {
        try {
            await queryRun(`DELETE FROM ${tbl} WHERE company_id = ?`, [id]);
        } catch (_) {
            // Table may not exist in older schemas
        }
    }

    await queryRun('DELETE FROM companies WHERE id = ?', [id]);
    return { success: true };
}

// ===== USERS =====

function enrichUser(row) {
    if (!row) return null;
    return {
        ...row,
        company_ids: parseCompanyIds(row.company_id)
    };
}

export async function getUsers({ companyId = null, role = null, search = '', orphanOnly = false } = {}) {
    await ensureSuperAdminSchemaAsync();
    const rows = await queryAll('SELECT * FROM users ORDER BY name ASC');
    let list = rows.map(enrichUser);

    if (orphanOnly) {
        list = list.filter(u => u.company_ids.length === 0);
    } else if (companyId) {
        const targetCid = String(companyId);
        list = list.filter(u => u.company_ids.includes(targetCid));
    }

    if (role && role !== 'all') {
        list = list.filter(u => u.role === role);
    }

    if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase();
        list = list.filter(u =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.id && u.id.toLowerCase().includes(q)) ||
            (u.nfc_id && u.nfc_id.toLowerCase().includes(q))
        );
    }

    return list;
}

export async function getUserById(id) {
    await ensureSuperAdminSchemaAsync();
    const row = await queryGet('SELECT * FROM users WHERE id = ?', [id]);
    return enrichUser(row);
}

export async function getUserByEmail(email) {
    await ensureSuperAdminSchemaAsync();
    if (!email) return null;
    const row = await queryGet('SELECT * FROM users WHERE LOWER(email) = ?', [String(email).trim().toLowerCase()]);
    return enrichUser(row);
}

export async function createUser(data) {
    await ensureSuperAdminSchemaAsync();
    const name = String(data.name || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const password = String(data.password || '').trim();
    const role = VALID_USER_ROLES.includes(data.role) ? data.role : 'worker';

    if (!name || !email || !password) {
        throw new Error('Nome, e-mail e senha são obrigatórios.');
    }

    const existing = await getUserByEmail(email);
    if (existing) {
        throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const id = data.id || generateId();
    const companyIdVal = normalizeCompanyIdInput(data.company_ids !== undefined ? data.company_ids : data.company_id);
    const nfcId = data.nfc_id ? String(data.nfc_id).replace(/:/g, '').trim().toUpperCase() : null;
    const isFirstAccess = data.isFirstAccess !== undefined ? (data.isFirstAccess ? 1 : 0) : 0;
    const plataBalance = data.plataBalance !== undefined && data.plataBalance !== '' ? Number(data.plataBalance) : 0;
    const recebeJae = data.recebeJae ? 1 : 0;
    const elegivelPremio = data.elegivelPremio !== undefined ? (data.elegivelPremio ? 1 : 0) : 1;
    const hiringDate = data.hiringDate || null;
    const cajaUserId = data.cajaUserId ? String(data.cajaUserId).trim() : null;
    const cajaRole = data.cajaRole ? String(data.cajaRole).trim() : null;
    const now = new Date().toISOString();

    await queryRun(
        `INSERT INTO users (id, name, email, password, role, plataBalance, isFirstAccess, company_id, nfc_id, recebeJae, elegivelPremio, hiringDate, cajaUserId, cajaRole, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id,
            name,
            email,
            password,
            role,
            Number.isFinite(plataBalance) ? plataBalance : 0,
            isFirstAccess,
            companyIdVal,
            nfcId || null,
            recebeJae,
            elegivelPremio,
            hiringDate,
            cajaUserId,
            cajaRole,
            now
        ]
    );

    return await getUserById(id);
}

export async function updateUser(id, updates) {
    await ensureSuperAdminSchemaAsync();
    const current = await getUserById(id);
    if (!current) throw new Error('Usuário não encontrado.');

    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
        const val = String(updates.name).trim();
        if (!val) throw new Error('Nome do usuário não pode ficar vazio.');
        fields.push('name = ?');
        values.push(val);
    }
    if (updates.email !== undefined) {
        const val = String(updates.email).trim().toLowerCase();
        if (!val) throw new Error('E-mail não pode ficar vazio.');
        const dup = await queryGet('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [val, id]);
        if (dup) throw new Error('Já existe outro usuário com este e-mail.');
        fields.push('email = ?');
        values.push(val);
    }
    if (updates.password !== undefined && String(updates.password).trim() !== '') {
        fields.push('password = ?');
        values.push(String(updates.password));
    }
    if (updates.role !== undefined) {
        if (!VALID_USER_ROLES.includes(updates.role)) {
            throw new Error('Cargo inválido. Use admin, manager ou worker.');
        }
        fields.push('role = ?');
        values.push(updates.role);
    }
    if (updates.company_ids !== undefined) {
        fields.push('company_id = ?');
        values.push(normalizeCompanyIdInput(updates.company_ids));
    } else if (updates.company_id !== undefined) {
        fields.push('company_id = ?');
        values.push(normalizeCompanyIdInput(updates.company_id));
    }
    if (updates.isFirstAccess !== undefined) {
        fields.push('isFirstAccess = ?');
        values.push(updates.isFirstAccess ? 1 : 0);
    }
    if (updates.resetToken !== undefined) {
        fields.push('resetToken = ?');
        values.push(updates.resetToken);
    }
    if (updates.resetTokenExpires !== undefined) {
        fields.push('resetTokenExpires = ?');
        values.push(updates.resetTokenExpires);
    }
    if (updates.plataBalance !== undefined) {
        const val = Number(updates.plataBalance);
        fields.push('plataBalance = ?');
        values.push(Number.isFinite(val) ? val : 0);
    }
    if (updates.nfc_id !== undefined) {
        const cleanNfc = updates.nfc_id ? String(updates.nfc_id).replace(/:/g, '').trim().toUpperCase() : null;
        fields.push('nfc_id = ?');
        values.push(cleanNfc || null);
    }
    if (updates.recebeJae !== undefined) {
        fields.push('recebeJae = ?');
        values.push(updates.recebeJae ? 1 : 0);
    }
    if (updates.elegivelPremio !== undefined) {
        fields.push('elegivelPremio = ?');
        values.push(updates.elegivelPremio ? 1 : 0);
    }
    if (updates.ignore_admission_docs !== undefined) {
        fields.push('ignore_admission_docs = ?');
        values.push(updates.ignore_admission_docs ? 1 : 0);
    }
    if (updates.ignore_first_access !== undefined) {
        fields.push('ignore_first_access = ?');
        values.push(updates.ignore_first_access ? 1 : 0);
    }
    if (updates.hiringDate !== undefined) {
        fields.push('hiringDate = ?');
        values.push(updates.hiringDate || null);
    }
    if (updates.cajaUserId !== undefined) {
        const cleanCajaUserId = updates.cajaUserId ? String(updates.cajaUserId).trim() : null;
        if (cleanCajaUserId) {
            try {
                await queryRun('UPDATE users SET cajaUserId = NULL WHERE cajaUserId = ? AND id != ?', [cleanCajaUserId, id]);
            } catch (_) {}
        }
        fields.push('cajaUserId = ?');
        values.push(cleanCajaUserId);
    }
    if (updates.cajaRole !== undefined) {
        fields.push('cajaRole = ?');
        values.push(updates.cajaRole ? String(updates.cajaRole).trim() : null);
    }
    if (updates.pdfObs !== undefined) {
        fields.push('pdfObs = ?');
        values.push(updates.pdfObs || null);
    }

    if (fields.length > 0) {
        values.push(id);
        await queryRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    return await getUserById(id);
}

export async function addUserToCompany(userId, companyId) {
    await ensureSuperAdminSchemaAsync();
    const user = await getUserById(userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const ids = parseCompanyIds(user.company_id);
    if (!ids.includes(String(companyId))) {
        ids.push(String(companyId));
    }
    return await updateUser(userId, { company_ids: ids });
}

export async function removeUserFromCompany(userId, companyId) {
    await ensureSuperAdminSchemaAsync();
    const user = await getUserById(userId);
    if (!user) throw new Error('Usuário não encontrado.');
    const remaining = parseCompanyIds(user.company_id).filter(cid => cid !== String(companyId));
    return await updateUser(userId, { company_ids: remaining });
}

export async function deleteUser(id) {
    await ensureSuperAdminSchemaAsync();
    const current = await getUserById(id);
    if (!current) throw new Error('Usuário não encontrado.');

    const cleanupQueries = [
        ['DELETE FROM pdi_answers WHERE userId = ?', [id]],
        ['DELETE FROM pdi_evaluations WHERE user_id = ?', [id]],
        ['DELETE FROM plata_transactions WHERE fromUserId = ? OR toUserId = ?', [id, id]],
        ['DELETE FROM store_purchases WHERE userId = ?', [id]],
        ['DELETE FROM shift_workers WHERE userId = ?', [id]],
        ['DELETE FROM advances WHERE userId = ?', [id]],
        ['DELETE FROM absences WHERE userId = ?', [id]],
        ['DELETE FROM user_checkins WHERE userId = ?', [id]],
        ['DELETE FROM disciplinary_records WHERE userId = ?', [id]],
        ['DELETE FROM streak_rewards_claimed WHERE userId = ?', [id]],
        ['DELETE FROM user_daily_access WHERE userId = ?', [id]]
    ];

    for (const [sql, params] of cleanupQueries) {
        try {
            await queryRun(sql, params);
        } catch (_) {
            // Optional table or already empty
        }
    }

    await queryRun('DELETE FROM users WHERE id = ?', [id]);
    return { success: true };
}

export async function generateUserResetToken(id) {
    await ensureSuperAdminSchemaAsync();
    const user = await getUserById(id);
    if (!user) throw new Error('Usuário não encontrado.');

    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await updateUser(id, {
        resetToken: token,
        resetTokenExpires: expires
    });

    return {
        token,
        expires,
        resetPath: `/reset-password?token=${token}`,
        firstAccessPath: `/login?firstAccess=true&email=${encodeURIComponent(user.email)}`
    };
}

export async function getSuperAdminByEmail(email) {
    await ensureSuperAdminSchemaAsync();
    if (!email) return null;
    return await queryGet(
        'SELECT * FROM super_admins WHERE LOWER(email) = LOWER(?)',
        [String(email).trim()]
    );
}

export async function getSuperAdminById(id) {
    await ensureSuperAdminSchemaAsync();
    if (!id) return null;
    return await queryGet('SELECT * FROM super_admins WHERE id = ?', [id]);
}

export async function getSuperAdminByCajaUserId(cajaUserId) {
    await ensureSuperAdminSchemaAsync();
    if (!cajaUserId) return null;
    return await queryGet(
        'SELECT * FROM super_admins WHERE cajaUserId = ?',
        [String(cajaUserId).trim()]
    );
}

export async function getUserByCajaUserId(cajaUserId) {
    await ensureSuperAdminSchemaAsync();
    if (!cajaUserId) return null;
    return await queryGet(
        'SELECT * FROM users WHERE cajaUserId = ?',
        [String(cajaUserId).trim()]
    );
}

export async function clearConflictingCajaUserId(cajaUserId, { table = 'super_admins', excludeId = null } = {}) {
    await ensureSuperAdminSchemaAsync();
    const cleanId = cajaUserId ? String(cajaUserId).trim() : null;
    if (!cleanId) return;
    const safeTable = table === 'users' ? 'users' : 'super_admins';
    if (excludeId) {
        try {
            await queryRun(`UPDATE ${safeTable} SET cajaUserId = NULL WHERE cajaUserId = ? AND id != ?`, [cleanId, excludeId]);
        } catch (_) {}
    } else {
        try {
            await queryRun(`UPDATE ${safeTable} SET cajaUserId = NULL WHERE cajaUserId = ?`, [cleanId]);
        } catch (_) {}
    }
}

export async function linkSuperAdminToCaJa(id, { cajaUserId, cajaRole }) {
    await ensureSuperAdminSchemaAsync();
    const cleanCajaUserId = cajaUserId ? String(cajaUserId).trim() : null;
    if (cleanCajaUserId) {
        await clearConflictingCajaUserId(cleanCajaUserId, { table: 'super_admins', excludeId: id });
    }
    await queryRun(
        'UPDATE super_admins SET cajaUserId = ?, cajaRole = ? WHERE id = ?',
        [cleanCajaUserId, cajaRole || null, id]
    );
    return await getSuperAdminById(id);
}

export async function createSuperAdminWithCaJa({ name, email, password = null, cajaUserId = null, cajaRole = null }) {
    await ensureSuperAdminSchemaAsync();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const existing = await getSuperAdminByEmail(cleanEmail);
    if (existing) {
        return await linkSuperAdminToCaJa(existing.id, { cajaUserId, cajaRole });
    }
    const cleanCajaUserId = cajaUserId ? String(cajaUserId).trim() : null;
    if (cleanCajaUserId) {
        await clearConflictingCajaUserId(cleanCajaUserId, { table: 'super_admins' });
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    await queryRun(
        `INSERT INTO super_admins (id, name, email, password, cajaUserId, cajaRole, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name || cleanEmail.split('@')[0], cleanEmail, password || randomUUID(), cleanCajaUserId, cajaRole || null, now]
    );
    return await getSuperAdminById(id);
}
