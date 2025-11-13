import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs'; // Manter bcrypt para hash de senha

async function readDbJson() {
  const dbPath = path.join(process.cwd(), 'db.json');
  const fileContents = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(fileContents);
}

async function writeDbJson(data: any) {
  const dbPath = path.join(process.cwd(), 'db.json');
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(req: NextRequest) {
  try {
    const { fullName, email, password, confirmPassword } = await req.json();

    if (!fullName || !email || !password || !confirmPassword) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ message: 'As senhas não coincidem.' }, { status: 400 });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json({ message: 'A senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma minúscula, um número e um caractere especial.' }, { status: 400 });
    }

    const db = await readDbJson();
    const existingUser = db.users.find((u: any) => u.email === email);

    if (existingUser) {
      return NextResponse.json({ message: 'Este email já está em uso.' }, { status: 400 });
    }

    // Hash da senha antes de salvar no JSON
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password: hashedPassword, // Salvar a senha hash
      name: fullName.split(' ')[0], // Primeiro nome para a mensagem de boas-vindas
      fullName,
      totalBalance: 0,
      transactions: [],
    };

    db.users.push(newUser);
    await writeDbJson(db);

    // Não enviar a senha de volta
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({ message: 'Usuário criado com sucesso!', user: userWithoutPassword }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor.' }, { status: 500 });
  }
}
