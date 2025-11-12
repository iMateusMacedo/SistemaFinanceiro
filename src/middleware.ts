import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.json({ message: 'Acesso não autorizado: Token não fornecido.' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Adiciona o ID do usuário decodificado aos headers da requisição
    // para que as rotas da API possam acessá-lo.
    const requestHeaders = new Headers(req.headers);
    if (typeof decoded !== 'string' && decoded.userId) {
      requestHeaders.set('x-user-id', decoded.userId.toString());
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: 'Acesso não autorizado: Token inválido.' }, { status: 401 });
  }
}

// Configuração do Matcher:
// Aplica o middleware apenas às rotas de API que precisam de autenticação.
export const config = {
  matcher: ['/api/transactions/:path*', '/api/user/:path*'],
};
