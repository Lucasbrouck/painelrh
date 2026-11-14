import { NextResponse } from 'next/server';
import { generateUserResetToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
        }

        const result = await generateUserResetToken(id);
        return NextResponse.json({
            success: true,
            token: result.token,
            expires: result.expires,
            resetPath: result.resetPath,
            firstAccessPath: result.firstAccessPath
        });
    } catch (error) {
        console.error('POST /api/users/[id]/reset-link Error:', error);
        const status = error.message?.includes('não encontrado') ? 404 : 500;
        return NextResponse.json({ error: error.message || 'Erro ao gerar link de redefinição.' }, { status });
    }
}
