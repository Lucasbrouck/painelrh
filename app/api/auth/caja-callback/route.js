import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCaJaToken, getPublicBaseUrl } from '@/lib/caja-client';
import {
  getSuperAdminByCajaUserId,
  getSuperAdminByEmail,
  getUserByCajaUserId,
  getUserByEmail,
  linkSuperAdminToCaJa,
  createSuperAdminWithCaJa,
} from '@/lib/db';

async function createSessionAndRedirect(adminUser, publicBaseUrl) {
  const cookieStore = await cookies();
  const isHttps = publicBaseUrl.startsWith('https://');

  const sessionData = {
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: 'superadmin',
  };

  cookieStore.set('session', JSON.stringify(sessionData), {
    httpOnly: false,
    secure: isHttps,
    sameSite: 'lax',
    path: '/',
    maxAge: 172800,
  });

  return NextResponse.redirect(new URL('/', publicBaseUrl));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const publicBaseUrl = getPublicBaseUrl(request);

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=caja_denied', publicBaseUrl));
  }

  try {
    const tokenData = await exchangeCaJaToken(code);
    const cajaUser = tokenData.user;

    if (!cajaUser?.id) {
      return NextResponse.redirect(new URL('/?error=caja_error', publicBaseUrl));
    }

    const cleanCajaId = String(cajaUser.id).trim();
    const cleanEmail = cajaUser.email ? String(cajaUser.email).trim() : '';

    // Cenário 1: SuperAdmin já vinculado pelo cajaUserId
    let superAdmin = await getSuperAdminByCajaUserId(cleanCajaId);
    if (superAdmin) {
      if (cajaUser.role && superAdmin.cajaRole !== cajaUser.role) {
        superAdmin = await linkSuperAdminToCaJa(superAdmin.id, {
          cajaUserId: cleanCajaId,
          cajaRole: cajaUser.role,
        });
      }
      return await createSessionAndRedirect(superAdmin, publicBaseUrl);
    }

    // Cenário 2: Mesmo e-mail na tabela super_admins -> sobrescreve/re-vincula cajaUserId sem 409
    if (cleanEmail) {
      superAdmin = await getSuperAdminByEmail(cleanEmail);
      if (superAdmin) {
        superAdmin = await linkSuperAdminToCaJa(superAdmin.id, {
          cajaUserId: cleanCajaId,
          cajaRole: cajaUser.role || superAdmin.cajaRole || 'superadm',
        });
        return await createSessionAndRedirect(superAdmin, publicBaseUrl);
      }
    }

    // Cenário 2b: Usuário autorizado no CaJa que já exista na tabela users -> sincroniza/promove em super_admins
    let existingUser = await getUserByCajaUserId(cleanCajaId);
    if (!existingUser && cleanEmail) {
      existingUser = await getUserByEmail(cleanEmail);
    }
    if (existingUser) {
      const syncedAdmin = await createSuperAdminWithCaJa({
        name: cajaUser.name || existingUser.name,
        email: existingUser.email || cleanEmail,
        password: existingUser.password,
        cajaUserId: cleanCajaId,
        cajaRole: cajaUser.role || existingUser.cajaRole || 'superadm',
      });
      return await createSessionAndRedirect(syncedAdmin, publicBaseUrl);
    }

    // Cenário 3: Primeira entrada sem conta local -> tela de vinculação/criação
    const cookieStore = await cookies();
    cookieStore.set(
      'caja-pending',
      JSON.stringify({
        id: cleanCajaId,
        email: cleanEmail,
        name: cajaUser.name || '',
        role: cajaUser.role || 'superadm',
      }),
      {
        httpOnly: true,
        secure: publicBaseUrl.startsWith('https://'),
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      }
    );

    return NextResponse.redirect(new URL('/auth/link-account', publicBaseUrl));
  } catch (err) {
    console.error('CaJa callback error:', err);
    return NextResponse.redirect(new URL('/?error=caja_error', publicBaseUrl));
  }
}
