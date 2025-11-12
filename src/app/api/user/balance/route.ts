require('dotenv').config();
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT: Adiciona um valor ao saldo do usuário e cria uma transação correspondente
export async function PUT(req: NextRequest) {
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { amount } = await req.json();
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ message: 'O valor fornecido é inválido.' }, { status: 400 });
    }

    // Usar uma transação do Prisma para garantir que ambas as operações (ou nenhuma) sejam concluídas
    const [updatedUser, newTransaction] = await prisma.$transaction([
      // 1. Atualiza o saldo do usuário
      prisma.user.update({
        where: { id: parseInt(userId, 10) },
        data: {
          balance: {
            increment: numericAmount,
          },
        },
      }),
      // 2. Cria um registro de transação para essa adição de saldo
      prisma.transaction.create({
        data: {
          userId: parseInt(userId, 10),
          description: 'Saldo Adicionado',
          amount: numericAmount,
          type: 'INCOME',
          category: 'Adição de Saldo',
          date: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ 
      message: 'Saldo atualizado com sucesso!', 
      user: updatedUser,
      transaction: newTransaction 
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao atualizar saldo:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao atualizar o saldo.' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
