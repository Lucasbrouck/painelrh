import { NextResponse } from 'next/server';
import {
  getSuperAdminByEmail,
  getUserByEmail,
  linkSuperAdminToCaJa,
  createSuperAdminWithCaJa,
  updateUser,
} from '@/lib/db';

function mapUserRoleToCaJa(role) {
  if (role === 'superadmin' || role === 'superadm') return 'superadm';
  if (role === 'admin' || role === 'manager') return 'admin';
  return 'usuario';
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { client_id, client_secret, email, password, cajaUser } = body || {};

    if (
      !client_id ||
      !client_secret ||
      client_id !== process.env.CAJA_CLIENT_ID ||
      client_secret !== process.env.CAJA_CLIENT_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized client' }, { status: 401 });
    }

    if (!email || !password || !cajaUser?.id) {
      return NextResponse.json(
        { error: 'Dados incompletos para vinculação.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim();
    const cleanCajaId = String(cajaUser.id).trim();

    // 1. Verifica primeiro na tabela dedicada super_admins
    const superAdmin = await getSuperAdminByEmail(cleanEmail);
    if (superAdmin) {
      if (!superAdmin.password || String(superAdmin.password) !== String(password)) {
        return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
      }

      const userRole = 'superadm';
      await linkSuperAdminToCaJa(superAdmin.id, {
        cajaUserId: cleanCajaId,
        cajaRole: userRole,
      });

      return NextResponse.json({ ok: true, role: userRole });
    }

    // 2. Fallback seguro na tabela users apenas para administradores
    const localUser = await getUserByEmail(cleanEmail);
    if (!localUser || !localUser.password || !['superadmin', 'admin'].includes(localUser.role)) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    if (String(localUser.password) !== String(password)) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const userRole = mapUserRoleToCaJa(localUser.role);
    await updateUser(localUser.id, {
      cajaUserId: cleanCajaId,
      cajaRole: userRole,
    });
    await createSuperAdminWithCaJa({
      name: localUser.name,
      email: localUser.email,
      password: localUser.password,
      cajaUserId: cleanCajaId,
      cajaRole: userRole,
    });

    return NextResponse.json({ ok: true, role: userRole });
  } catch (error) {
    console.error('CaJa verify error:', error);
    return NextResponse.json(
      { error: 'Erro interno na verificação de credenciais.' },
      { status: 500 }
    );
  }
}
