'use client';

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface ChartData {
  name: string;
  value: number;
}

interface PieChartComponentProps {
  data: ChartData[];
  colors: string[];
  title: string;
}

const PieChartComponent: React.FC<PieChartComponentProps> = ({ data, colors, title }) => {
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-700 w-full max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">{title}</h1>
      <div className="flex items-center">
        <PieChart width={700} height={400}>
          <Pie
            data={data}
            cx={200}
            cy={200}
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={150}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string, props: any) => [formatCurrency(value), name]} />
          <Legend 
            layout="vertical" 
            verticalAlign="middle" 
            align="right" 
            iconType="square" 
            wrapperStyle={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
            formatter={(value, entry: any) => {
              const { payload } = entry;
              return `${value} - ${formatCurrency(payload.value)}`;
            }}
          />
        </PieChart>
      </div>
    </div>
  );
};

export default PieChartComponent;
