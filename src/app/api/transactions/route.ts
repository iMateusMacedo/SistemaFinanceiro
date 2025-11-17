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

// GET: Busca os dados do usuário (saldo e transações)
export async function GET(req: NextRequest) {
  const userEmail = req.headers.get('x-user-email'); // Usaremos o email como identificador

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const db = await readDbJson();
    const user = db.users.find((u: any) => u.email === userEmail);

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Não enviar a senha
    const { password: _, ...userWithoutPassword } = user;

    // Retornar o usuário sem a senha e suas transações
    return NextResponse.json({ user: userWithoutPassword, transactions: user.transactions }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar dados:', error);
    let errorMessage = 'Ocorreu um erro no servidor ao buscar os dados.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage, details: error.toString() }, { status: 500 });
  }
}

// POST: Cria uma nova transação
export async function POST(req: NextRequest) {
  const userEmail = req.headers.get('x-user-email'); // Usaremos o email como identificador

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { description, amount, type, category, date, isRecurring } = await req.json();

    if (!description || !amount || !type || !category || !date) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
    }

    const transactionDate = new Date(date);
    const now = new Date();

    const transactionYear = transactionDate.getFullYear();
    const transactionMonth = transactionDate.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (transactionYear > currentYear || (transactionYear === currentYear && transactionMonth > currentMonth)) {
      return NextResponse.json({ message: 'Ainda não é possível realizar transações nesse mês' }, { status: 400 });
    }

    if (transactionYear < currentYear || (transactionYear === currentYear && transactionMonth < currentMonth)) {
      return NextResponse.json({ message: 'Não é possível realizar mais transações nesse mês' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ message: 'O valor da transação é inválido.' }, { status: 400 });
    }

    const db = await readDbJson();
    const userIndex = db.users.findIndex((u: any) => u.email === userEmail);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = db.users[userIndex];

    const newTransaction = {
      id: user.transactions.length + 1, // ID simples para a transação
      description,
      amount: numericAmount,
      type, // 'INCOME' or 'EXPENSE'
      category,
      date: new Date(date).toISOString(),
      isRecurring: isRecurring || false,
    };
    user.transactions.push(newTransaction);

    // Atualizar o saldo total
    if (type === 'INCOME') {
      user.totalBalance += numericAmount;
    } else if (type === 'EXPENSE') {
      user.totalBalance -= numericAmount;
      
      // Lógica de Reset (para garantir que os gastos sejam zerados se necessário)
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (!user.lastDailyReset || new Date(user.lastDailyReset).getDate() !== now.getDate()) {
        user.currentSpentDaily = 0;
        user.lastDailyReset = now.toISOString();
      }

      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      if (!user.lastWeeklyReset || new Date(user.lastWeeklyReset).getTime() !== startOfWeek.getTime()) {
        user.currentSpentWeekly = 0;
        user.lastWeeklyReset = startOfWeek.toISOString();
      }

      // Recalcular todos os currentSpent após adicionar uma despesa
      const { currentSpentDaily, currentSpentWeekly, currentSpentMonthly } = calculateAllCurrentSpents(user);
      user.currentSpentDaily = currentSpentDaily;
      user.currentSpentWeekly = currentSpentWeekly;
      user.currentSpentMonthly = currentSpentMonthly;
    }

    await writeDbJson(db);

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar transação:', error);
    let errorMessage = 'Ocorreu um erro no servidor ao criar a transação.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ message: errorMessage, details: error.toString() }, { status: 500 });
  }
}

export const runtime = 'nodejs';
