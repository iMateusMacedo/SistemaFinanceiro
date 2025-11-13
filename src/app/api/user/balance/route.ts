require('dotenv').config();
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

async function readDbJson() {
  const dbPath = path.join(process.cwd(), 'db.json');
  const fileContents = await fs.readFile(dbPath, 'utf8');
  return JSON.parse(fileContents);
}

async function writeDbJson(data: any) {
  const dbPath = path.join(process.cwd(), 'db.json');
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// PUT: Adiciona um valor ao saldo do usuário e cria uma transação correspondente
export async function PUT(req: NextRequest) {
  const userEmail = req.headers.get('x-user-email'); // Usaremos o email como identificador

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { amount } = await req.json();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ message: 'O valor fornecido é inválido.' }, { status: 400 });
    }

    const db = await readDbJson();
    const userIndex = db.users.findIndex((u: any) => u.email === userEmail);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = db.users[userIndex];
    user.totalBalance += numericAmount;

    const newTransaction = {
      id: user.transactions.length + 1, // ID simples para a transação
      description: 'Saldo Adicionado',
      amount: numericAmount,
      type: 'INCOME',
      category: 'Adição de Saldo',
      date: new Date().toISOString(),
    };
    user.transactions.push(newTransaction);

    await writeDbJson(db);

    return NextResponse.json({ 
      message: 'Saldo atualizado com sucesso!', 
      user: { ...user, password: undefined }, // Não enviar a senha
      transaction: newTransaction 
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao atualizar saldo:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao atualizar o saldo.' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
