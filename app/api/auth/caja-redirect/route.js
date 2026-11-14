import { NextResponse } from 'next/server';
import { getCaJaAuthorizationUrl, getPublicBaseUrl } from '@/lib/caja-client';

export async function GET(request) {
  const baseUrl = getPublicBaseUrl(request);
  const callbackUrl = `${baseUrl}/api/auth/caja-callback`;
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || undefined;
  const authUrl = getCaJaAuthorizationUrl(callbackUrl, state);

  return NextResponse.redirect(authUrl);
}
