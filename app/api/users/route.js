import { NextResponse } from 'next/server';
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    addUserToCompany,
    removeUserFromCompany
} from '@/lib/db';

export const dynamic = 'force-dynamic';

function mapUniqueConstraintError(error) {
    const msg = error?.message || '';
    const code = error?.code || '';
    if (
        code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        code === '23505' ||
        msg.includes('UNIQUE constraint failed') ||
        msg.includes('duplicate key value')
    ) {
        if (msg.includes('nfc_id')) {
            return 'Este cartão NFC já está vinculado a outro usuário.';
        }
        if (msg.includes('email')) {
            return 'Este e-mail já está em uso por outro usuário.';
        }
        if (msg.includes('cajaUserId')) {
            return 'Este ID CaJa já está vinculado a outro usuário.';
        }
        return 'Registro duplicado no banco de dados.';
    }
    return null;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const companyId = searchParams.get('companyId');
        const role = searchParams.get('role');
        const search = searchParams.get('search') || '';
        const orphanOnly = searchParams.get('orphanOnly') === 'true';

        if (id) {
            const user = await getUserById(id);
            if (!user) {
                return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
            }
            return NextResponse.json(user);
        }

        const users = await getUsers({ companyId, role, search, orphanOnly });
        return NextResponse.json(users);
    } catch (error) {
        console.error('GET /api/users Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao listar usuários.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const created = await createUser(body || {});
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('POST /api/users Error:', error);
        const uniqueMsg = mapUniqueConstraintError(error);
        if (uniqueMsg) {
            return NextResponse.json({ error: uniqueMsg }, { status: 400 });
        }
        const status = error.message?.includes('obrigatórios') || error.message?.includes('Já existe') ? 400 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao criar usuário.' }, { status });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        if (!body?.id) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
        }

        if (body.action === 'addCompany' && body.companyId) {
            const updated = await addUserToCompany(body.id, body.companyId);
            return NextResponse.json(updated);
        }

        if (body.action === 'removeCompany' && body.companyId) {
            const updated = await removeUserFromCompany(body.id, body.companyId);
            return NextResponse.json(updated);
        }

        const updated = await updateUser(body.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT /api/users Error:', error);
        const uniqueMsg = mapUniqueConstraintError(error);
        if (uniqueMsg) {
            return NextResponse.json({ error: uniqueMsg }, { status: 400 });
        }
        const status = error.message?.includes('não encontrado')
            ? 404
            : error.message?.includes('Já existe') || error.message?.includes('inválido') || error.message?.includes('vazio')
                ? 400
                : 500;
        return NextResponse.json({ error: error.message || 'Erro ao atualizar usuário.' }, { status });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const companyId = searchParams.get('companyId');

        if (!id) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
        }

        if (companyId) {
            const updated = await removeUserFromCompany(id, companyId);
            return NextResponse.json({ success: true, unlinked: true, user: updated });
        }

        await deleteUser(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/users Error:', error);
        const status = error.message?.includes('não encontrado') ? 404 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao excluir usuário.' }, { status });
    }
}
