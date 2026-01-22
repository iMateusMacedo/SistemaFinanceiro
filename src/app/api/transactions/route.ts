import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { addMonths } from 'date-fns';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

async function readDbJson() {
  const dbPath = path.join(process.cwd(), 'db.json');
  try {
    const fileContents = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    // Se o arquivo não existir, retorna uma estrutura padrão
    return { users: [] };
  }
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

    // --- Início da Lógica de Cálculo Simplificada ---

    const searchParams = req.nextUrl.searchParams;
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    let targetDate;

    if (yearParam && monthParam) {
      const year = parseInt(yearParam, 10);
      const month = parseInt(monthParam, 10); // Recebe 1-12
      // Cria a data para o final do mês solicitado
      targetDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      targetDate = new Date(); // Padrão: data e hora atuais
    }

    // Ordenar transações por data para garantir a ordem cronológica
    const sortedTransactions = user.transactions.sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Cálculo bruto e direto do saldo até a targetDate
    let calculatedBalance = 0;
    for (const transaction of sortedTransactions) {
      const transactionDate = new Date(transaction.date);
      if (transactionDate <= targetDate) {
        if (transaction.type === 'INCOME') {
          calculatedBalance += transaction.amount;
        } else {
          calculatedBalance -= transaction.amount;
        }
      }
    }
    
    user.totalBalance = calculatedBalance;

    // --- Lógica para o gráfico (monthlyBalances) mantida para compatibilidade ---
    const monthlyBalances: { year: number, month: number, balance: number }[] = [];
    if (sortedTransactions.length > 0) {
        const monthlyTransactions: { [key: string]: any[] } = {};
        sortedTransactions.forEach((transaction: any) => {
            const date = new Date(transaction.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!monthlyTransactions[key]) {
                monthlyTransactions[key] = [];
            }
            monthlyTransactions[key].push(transaction);
        });

        let cumulativeBalance = 0;
        const firstTransactionDate = new Date(sortedTransactions[0].date);
        const lastTransactionDate = new Date(sortedTransactions[sortedTransactions.length - 1].date);
        const projectionEndDate = addMonths(lastTransactionDate, 12);
        let currentDate = new Date(firstTransactionDate.getFullYear(), firstTransactionDate.getMonth(), 1);

        while (currentDate <= projectionEndDate) {
            const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
            const monthTransactions = monthlyTransactions[key] || [];
            
            cumulativeBalance = monthTransactions.reduce((balance: number, transaction: any) => {
                return transaction.type === 'INCOME' ? balance + transaction.amount : balance - transaction.amount;
            }, cumulativeBalance);

            monthlyBalances.push({ year: currentDate.getFullYear(), month: currentDate.getMonth() + 1, balance: cumulativeBalance });
            currentDate = addMonths(currentDate, 1);
        }
    }
    user.monthlyBalances = monthlyBalances;
    // --- Fim da Lógica para o gráfico ---

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword, transactions: user.transactions }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar dados:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor.', details: error.toString() }, { status: 500 });
  }
}

// POST: Cria uma nova transação
export async function POST(req: NextRequest) {
  const userEmail = req.headers.get('x-user-email'); // Usaremos o email como identificador

  if (!userEmail) {
    return NextResponse.json({ message: 'Usuário não autenticado.' }, { status: 401 });
  }

  try {
    const { description, amount, type, category, date, isRecurring, installments } = await req.json();

    if (!description || !amount || !type || !category || !date) {
      return NextResponse.json({ message: 'Todos os campos são obrigatórios.' }, { status: 400 });
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
    const startDate = new Date(date);
    
    if (isRecurring && installments && installments > 0) {
      // Se a transação for uma despesa, divida o valor. Se for um ganho, mantenha o valor total para cada parcela.
      const installmentAmount = type === 'EXPENSE' ? numericAmount / installments : numericAmount;
      const recurringGroupId = randomUUID();

      for (let i = 0; i < installments; i++) {
        const transactionDate = addMonths(startDate, i);

        const newTransaction = {
          id: user.transactions.length + 1 + i,
          recurringTransactionGroupId: recurringGroupId,
          description: `${description} (${i + 1}/${installments})`,
          amount: installmentAmount,
          type,
          category,
          date: transactionDate.toISOString(),
          isRecurring: true,
          installments: installments,
          installmentNumber: i + 1,
        };
        user.transactions.push(newTransaction);
      }
    } else {
      const newTransaction = {
        id: user.transactions.length + 1,
        description,
        amount: numericAmount,
        type,
        category,
        date: startDate.toISOString(),
        isRecurring: false,
      };
      user.transactions.push(newTransaction);
    }
    
    // Recalcular os gastos do período, se for uma despesa
    if (type === 'EXPENSE') {
      const { currentSpentDaily, currentSpentWeekly, currentSpentMonthly } = calculateAllCurrentSpents(user);
      user.currentSpentDaily = currentSpentDaily;
      user.currentSpentWeekly = currentSpentWeekly;
      user.currentSpentMonthly = currentSpentMonthly;
    }

    await writeDbJson(db);

    return NextResponse.json({ message: "Transação criada com sucesso" }, { status: 201 });
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
