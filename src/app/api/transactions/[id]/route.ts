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

function calculateSpentForPeriod(user: any, period: 'daily' | 'weekly' | 'monthly', now: Date) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let spent = 0;

  user.transactions.forEach((transaction: any) => {
    if (transaction.type === 'EXPENSE') {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      const transactionDay = transactionDate.getDate();

      if (period === 'daily') {
        if (transactionYear === currentYear && transactionMonth === currentMonth && transactionDay === currentDay) {
          spent += transaction.amount;
        }
      } else if (period === 'weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo da semana atual
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado da semana atual
        endOfWeek.setHours(23, 59, 59, 999);

        if (transactionDate >= startOfWeek && transactionDate <= endOfWeek) {
          spent += transaction.amount;
        }
      } else if (period === 'monthly') {
        if (transactionYear === currentYear && transactionMonth === currentMonth) {
          spent += transaction.amount;
        }
      }
    }
  });
  return spent;
}

function calculateAllCurrentSpents(user: any) {
  const now = new Date();
  return {
    currentSpentDaily: calculateSpentForPeriod(user, 'daily', now),
    currentSpentWeekly: calculateSpentForPeriod(user, 'weekly', now),
    currentSpentMonthly: calculateSpentForPeriod(user, 'monthly', now),
  };
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  const transactionId = parseInt(params.id, 10);
  if (isNaN(transactionId)) {
    return NextResponse.json({ message: 'ID da transação inválido.' }, { status: 400 });
  }

  try {
    const db = await readDbJson();
    const userIndex = db.users.findIndex((u: any) => u.email === userEmail);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = db.users[userIndex];
    const transactionToDelete = user.transactions.find((t: any) => t.id === transactionId);

    if (!transactionToDelete) {
      return NextResponse.json({ message: 'Transação não encontrada.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const deleteAll = searchParams.get('deleteAll') === 'true';

    let deletedIds: number[] = [];
    
    if (deleteAll && transactionToDelete.recurringTransactionGroupId) {
      const groupId = transactionToDelete.recurringTransactionGroupId;
      const transactionsBeforeDelete = user.transactions.length;
      
      // Filtra as transações, mantendo apenas as que não pertencem ao grupo
      user.transactions = user.transactions.filter((t: any) => {
        if (t.recurringTransactionGroupId === groupId) {
          deletedIds.push(t.id);
          return false; // Não mantém a transação
        }
        return true; // Mantém a transação
      });

      console.log(`Deletadas ${transactionsBeforeDelete - user.transactions.length} transações do grupo ${groupId}.`);
    } else {
      // Lógica para deletar uma única transação
      const transactionIndex = user.transactions.findIndex((t: any) => t.id === transactionId);
      if (transactionIndex > -1) {
        user.transactions.splice(transactionIndex, 1);
        deletedIds.push(transactionId);
      }
    }

    if (deletedIds.length === 0) {
      // Isso pode acontecer se a transação foi encontrada mas a lógica de remoção falhou
      return NextResponse.json({ message: 'Nenhuma transação foi deletada.' }, { status: 404 });
    }

    await writeDbJson(db);

    return NextResponse.json({ 
      message: `${deletedIds.length} transação(ões) deletada(s) com sucesso!`,
      deletedIds: deletedIds
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao deletar transação:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao deletar a transação.' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
