import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getPublicBaseUrl } from '@/lib/caja-client';
import {
  getSuperAdminByEmail,
  getUserByEmail,
  linkSuperAdminToCaJa,
  createSuperAdminWithCaJa,
  updateUser,
} from '@/lib/db';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const pendingRaw = cookieStore.get('caja-pending')?.value;

    if (!pendingRaw) {
      return NextResponse.json(
        { error: 'Sessão de vinculação expirada. Faça login novamente pelo CaJa.' },
        { status: 400 }
      );
    }

    let cajaUser;
    try {
      cajaUser = JSON.parse(pendingRaw);
    } catch (_) {
      return NextResponse.json(
        { error: 'Sessão de vinculação inválida.' },
        { status: 400 }
      );
    }

    if (!cajaUser?.id) {
      return NextResponse.json(
        { error: 'Dados do usuário CaJa incompletos.' },
        { status: 400 }
      );
    }

    const { action, email, password } = await request.json();
    const cleanCajaId = String(cajaUser.id).trim();
    const cajaRole = cajaUser.role || 'superadm';
    let sessionAdmin = null;

    if (action === 'create-new') {
      if (!cajaUser.email) {
        return NextResponse.json(
          { error: 'O CaJa não forneceu um e-mail para criação automática.' },
          { status: 400 }
        );
      }

      sessionAdmin = await createSuperAdminWithCaJa({
        name: cajaUser.name || cajaUser.email.split('@')[0],
        email: cajaUser.email,
        cajaUserId: cleanCajaId,
        cajaRole,
      });
    } else if (action === 'link-existing') {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Informe e-mail e senha da conta existente.' },
          { status: 400 }
        );
      }

      const cleanEmail = String(email).trim();
      const superAdmin = await getSuperAdminByEmail(cleanEmail);

      if (superAdmin) {
        if (!superAdmin.password || String(superAdmin.password) !== String(password)) {
          return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
        }

        sessionAdmin = await linkSuperAdminToCaJa(superAdmin.id, {
          cajaUserId: cleanCajaId,
          cajaRole,
        });
      } else {
        const localUser = await getUserByEmail(cleanEmail);
        if (
          !localUser ||
          !localUser.password ||
          !['superadmin', 'admin'].includes(localUser.role) ||
          String(localUser.password) !== String(password)
        ) {
          return NextResponse.json(
            { error: 'Credenciais inválidas ou conta sem permissão administrativa.' },
            { status: 401 }
          );
        }

        await updateUser(localUser.id, {
          cajaUserId: cleanCajaId,
          cajaRole,
        });
        sessionAdmin = await createSuperAdminWithCaJa({
          name: localUser.name,
          email: localUser.email,
          password: localUser.password,
          cajaUserId: cleanCajaId,
          cajaRole,
        });
      }
    } else {
      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    }

    const publicBaseUrl = getPublicBaseUrl(request);
    const sessionData = {
      id: sessionAdmin.id,
      name: sessionAdmin.name,
      email: sessionAdmin.email,
      role: 'superadmin',
    };

    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: false,
      secure: publicBaseUrl.startsWith('https://'),
      sameSite: 'lax',
      path: '/',
      maxAge: 172800,
    });
    cookieStore.delete('caja-pending');

    return NextResponse.json({ success: true, user: sessionData, redirect: '/' });
  } catch (error) {
    console.error('CaJa link error:', error);
    return NextResponse.json(
      { error: 'Erro ao vincular conta com o CaJa.' },
      { status: 500 }
    );
  }
}
