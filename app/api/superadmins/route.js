import { NextResponse } from 'next/server';
import {
    getSuperAdmins,
    createSuperAdmin,
    updateSuperAdmin,
    deleteSuperAdmin
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const list = await getSuperAdmins();
        return NextResponse.json(list);
    } catch (error) {
        console.error('GET /api/superadmins Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao listar super admins.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const created = await createSuperAdmin(body || {});
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('POST /api/superadmins Error:', error);
        const status = error.message?.includes('obrigatórios') || error.message?.includes('Já existe') ? 400 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao criar Super Admin.' }, { status });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        if (!body?.id) {
            return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
        }
        const updated = await updateSuperAdmin(body.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT /api/superadmins Error:', error);
        const status = error.message?.includes('não encontrada')
            ? 404
            : error.message?.includes('vazio') || error.message?.includes('Já existe')
                ? 400
                : 500;
        return NextResponse.json({ error: error.message || 'Erro ao atualizar Super Admin.' }, { status });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
        }
        await deleteSuperAdmin(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/superadmins Error:', error);
        const status = error.message?.includes('última conta') ? 400 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao excluir Super Admin.' }, { status });
    }
}
