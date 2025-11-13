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

function calculateGoalAmounts(monthlySalary: number) {
  return {
    goalAmountDaily: monthlySalary / 30,
    goalAmountWeekly: monthlySalary / 4,
    goalAmountMonthly: monthlySalary,
  };
}

export async function GET(req: NextRequest) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const db = await readDbJson();
    const user = db.users.find((u: any) => u.email === userEmail);

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalizar para o início do dia

    // Lógica de Reset Diário
    if (!user.lastDailyReset || new Date(user.lastDailyReset).getDate() !== now.getDate()) {
      user.currentSpentDaily = 0;
      user.lastDailyReset = now.toISOString();
    }

    // Lógica de Reset Semanal
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo da semana atual
    startOfWeek.setHours(0, 0, 0, 0);

    if (!user.lastWeeklyReset || new Date(user.lastWeeklyReset).getTime() !== startOfWeek.getTime()) {
      user.currentSpentWeekly = 0;
      user.lastWeeklyReset = startOfWeek.toISOString();
    }

    // Recalcular todos os gastos atuais
    const { currentSpentDaily, currentSpentWeekly, currentSpentMonthly } = calculateAllCurrentSpents(user);
    user.currentSpentDaily = currentSpentDaily;
    user.currentSpentWeekly = currentSpentWeekly;
    user.currentSpentMonthly = currentSpentMonthly;

    // Recalcular goalAmounts se o salário for definido
    if (user.monthlySalary && user.monthlySalary > 0) {
      const { goalAmountDaily, goalAmountWeekly, goalAmountMonthly } = calculateGoalAmounts(user.monthlySalary);
      user.goalAmountDaily = goalAmountDaily;
      user.goalAmountWeekly = goalAmountWeekly;
      user.goalAmountMonthly = goalAmountMonthly;
    } else {
      user.goalAmountDaily = 0;
      user.goalAmountWeekly = 0;
      user.goalAmountMonthly = 0;
    }

    await writeDbJson(db); // Salvar as alterações de reset e cálculos

    return NextResponse.json({
      monthlySalary: user.monthlySalary || 0,
      goalType: user.goalType || 'monthly', // Manter goalType para seleção na UI
      goalAmountDaily: user.goalAmountDaily || 0,
      goalAmountWeekly: user.goalAmountWeekly || 0,
      goalAmountMonthly: user.goalAmountMonthly || 0,
      currentSpentDaily: user.currentSpentDaily || 0,
      currentSpentWeekly: user.currentSpentWeekly || 0,
      currentSpentMonthly: user.currentSpentMonthly || 0,
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar dados das metas:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao buscar os dados das metas.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userEmail = req.headers.get('x-user-email');

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { monthlySalary, goalType } = await req.json();

    const db = await readDbJson();
    const userIndex = db.users.findIndex((u: any) => u.email === userEmail);

    if (userIndex === -1) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const user = db.users[userIndex];

    if (monthlySalary !== undefined) {
      user.monthlySalary = parseFloat(monthlySalary);
      // Recalcular goalAmounts ao definir o salário
      const { goalAmountDaily, goalAmountWeekly, goalAmountMonthly } = calculateGoalAmounts(user.monthlySalary);
      user.goalAmountDaily = goalAmountDaily;
      user.goalAmountWeekly = goalAmountWeekly;
      user.goalAmountMonthly = goalAmountMonthly;
    }
    if (goalType !== undefined) {
      user.goalType = goalType;
    }

    // Recalcular todos os gastos atuais após qualquer alteração que possa afetar a meta
    const { currentSpentDaily, currentSpentWeekly, currentSpentMonthly } = calculateAllCurrentSpents(user);
    user.currentSpentDaily = currentSpentDaily;
    user.currentSpentWeekly = currentSpentWeekly;
    user.currentSpentMonthly = currentSpentMonthly;

    // Lógica de Reset (também no POST para garantir consistência)
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

    await writeDbJson(db);

    return NextResponse.json({
      message: 'Dados das metas atualizados com sucesso!',
      monthlySalary: user.monthlySalary,
      goalType: user.goalType,
      goalAmountDaily: user.goalAmountDaily,
      goalAmountWeekly: user.goalAmountWeekly,
      goalAmountMonthly: user.goalAmountMonthly,
      currentSpentDaily: user.currentSpentDaily,
      currentSpentWeekly: user.currentSpentWeekly,
      currentSpentMonthly: user.currentSpentMonthly,
    }, { status: 200 });
  } catch (error) {
    console.error('Erro ao atualizar dados das metas:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor ao atualizar os dados das metas.' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
