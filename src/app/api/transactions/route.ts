import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Busca os dados do usuário (saldo e transações)
export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: {
        balance: true,
        fullName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId: parseInt(userId, 10) },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ user, transactions }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao buscar os dados.' }, { status: 500 });
  }
}

// POST: Cria uma nova transação
export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { description, amount, type, category, date, isRecurring } = await req.json();

    if (!description || !amount || !type || !category || !date) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const newTransaction = await prisma.transaction.create({
      data: {
        userId: parseInt(userId, 10),
        description,
        amount,
        type, // 'INCOME' or 'EXPENSE'
        category,
        date: new Date(date),
        isRecurring: isRecurring || false,
      },
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao criar a transação.' }, { status: 500 });
  }
}
