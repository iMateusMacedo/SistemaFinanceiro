require('dotenv').config();
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Senha inválida.' }, { status: 401 });
    }

    // Create JWT token using 'jose'
    const secret = new TextEncoder().encode(process.env.JWT_SECRET as string);
    const token = await new SignJWT({ userId: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);

    // Set cookie
    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    // Don't send the password back to the client
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({ message: 'Login bem-sucedido!', user: userWithoutPassword }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    let errorMessage = 'Ocorreu um erro no servidor.';
    if (error.code) {
      errorMessage = `Erro no banco de dados: ${error.message}`;
    } else if (error.name === 'JsonWebTokenError' || error.name === 'JWTExpired' || error.name === 'JOSEError') {
      errorMessage = `Erro no token: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage, details: error.toString() }, { status: 500 });
  }
}

