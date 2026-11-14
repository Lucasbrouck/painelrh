import { NextResponse } from 'next/server';
import { authenticateSuperAdmin } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body || {};

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Informe e-mail e senha de Super Administrador.' },
                { status: 400 }
            );
        }

        const admin = await authenticateSuperAdmin(email, password);
        if (!admin) {
            return NextResponse.json(
                { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
                { status: 401 }
            );
        }

        const response = NextResponse.json({ user: admin });
    response.cookies.set('session', JSON.stringify(admin), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 172800,
    });
    return response;
    } catch (error) {
        console.error('SuperAdmin Login Error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao autenticar.' },
            { status: 500 }
        );
    }
}
