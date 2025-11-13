require('dotenv').config();
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs'; // Adicionado

async function readDbJson() {
  const dbPath = path.join(process.cwd(), 'db.json');
  const fileContents = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(fileContents);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const db = await readDbJson();
    const user = db.users.find((u: any) => u.email === email);

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Usar bcrypt.compare para verificar a senha hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Senha inválida.' }, { status: 401 });
    }

    // Create JWT token using 'jose'
    const secret = new TextEncoder().encode(process.env.JWT_SECRET as string);
    const token = await new SignJWT({ userId: user.email }) // Usando email como userId para simplificar
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
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ message: 'Login bem-sucedido!', user: userWithoutPassword }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    let errorMessage = 'Ocorreu um erro no servidor.';
    if (error.name === 'JsonWebTokenError' || error.name === 'JWTExpired' || error.name === 'JOSEError') {
      errorMessage = `Erro no token: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage, details: error.toString() }, { status: 500 });
  }
}

