import { NextResponse } from 'next/server';
import {
    getCompaniesWithStats,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany
} from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const company = await getCompanyById(id);
            if (!company) {
                return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
            }
            return NextResponse.json(company);
        }

        const companies = await getCompaniesWithStats();
        return NextResponse.json(companies);
    } catch (error) {
        console.error('GET /api/companies Error:', error);
        return NextResponse.json({ error: error.message || 'Erro ao listar empresas.' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const result = await createCompany(body || {});
        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('POST /api/companies Error:', error);
        const status = error.message?.includes('obrigatório') || error.message?.includes('Já existe') ? 400 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao criar empresa.' }, { status });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        if (!body?.id) {
            return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });
        }
        const updated = await updateCompany(body.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT /api/companies Error:', error);
        const status = error.message?.includes('não encontrada')
            ? 404
            : error.message?.includes('Já existe') || error.message?.includes('vazio')
                ? 400
                : 500;
        return NextResponse.json({ error: error.message || 'Erro ao atualizar empresa.' }, { status });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID da empresa é obrigatório.' }, { status: 400 });
        }

        await deleteCompany(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/companies Error:', error);
        const status = error.message?.includes('não encontrada') ? 404 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao excluir empresa.' }, { status });
    }
}
