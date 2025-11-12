import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Acesso não autorizado: Token não fornecido.' }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET as string);
    const { payload } = await jwtVerify(token, secret);

    const requestHeaders = new Headers(req.headers);
    if (payload.userId) {
      requestHeaders.set('x-user-id', payload.userId.toString());
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Se o token for inválido (expirado, etc.), redireciona para o login
    const loginUrl = new URL('/', req.url);
    const response = NextResponse.redirect(loginUrl);
    // Limpa o cookie inválido
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/api/transactions/:path*', '/api/user/:path*'],
};
