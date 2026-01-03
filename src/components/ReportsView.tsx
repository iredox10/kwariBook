import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useTranslation } from 'react-i18next';
import { 
  TrendingUp, 
  Award, 
  Calendar, 
  Package, 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpCircle,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ReportsView() {
  const { t } = useTranslation();
  
  const sales = useLiveQuery(() => db.sales.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  
  if (!sales || sales.length === 0) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center flex flex-col items-center shadow-sm">
        <Calendar size={48} className="text-gray-200 mb-4" />
        <p className="text-gray-500 font-bold">{t('noData')}</p>
        <p className="text-xs text-gray-400 mt-1">Start recording sales to see reports.</p>
      </div>
    );
  }

  // Calculate Weekly Data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(date => {
    const daySales = (sales || []).filter(s => new Date(s.date).toISOString().split('T')[0] === date);
    const dayExpenses = (expenses || []).filter(e => new Date(e.date).toISOString().split('T')[0] === date);
    
    return {
      date,
      sales: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
      expenses: dayExpenses.reduce((sum, e) => sum + e.amount, 0)
    };
  });

  const maxVal = Math.max(...chartData.map(d => Math.max(d.sales, d.expenses)), 1);

  // Totals
  const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalExpenses = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSales - totalExpenses;

  // Top Products Logic
  const productStats: Record<string, { quantity: number, total: number }> = {};
  sales.forEach(sale => {
    sale.items?.forEach(item => {
      if (!productStats[item.name]) {
        productStats[item.name] = { quantity: 0, total: 0 };
      }
      productStats[item.name].quantity += item.quantity;
    });
  });

  const topProducts = Object.entries(productStats)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5);

  // Expense Category Breakdown
  const expenseCategories: Record<string, number> = {};
  expenses?.forEach(e => {
    expenseCategories[e.category] = (expenseCategories[e.category] || 0) + e.amount;
  });
  const sortedExpenses = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 pb-8">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('sales')}</span>
            <div className="p-1.5 bg-green-50 rounded-lg">
              <ArrowUpCircle className="text-kwari-green" size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">₦ {totalSales.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('expenses')}</span>
            <div className="p-1.5 bg-red-50 rounded-lg">
              <ArrowDownCircle className="text-kwari-red" size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">₦ {totalExpenses.toLocaleString()}</p>
        </div>

        <div className={cn(
          "p-6 rounded-3xl border shadow-lg transition-all hover:scale-[1.02]",
          netProfit >= 0 ? "bg-kwari-green text-white border-kwari-green" : "bg-kwari-red text-white border-kwari-red"
        )}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">Net Profit</span>
            <Wallet size={18} />
          </div>
          <p className="text-2xl font-black">₦ {netProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <TrendingUp className="text-kwari-green" size={20} />
            <h3 className="font-bold text-gray-800">{t('weeklySales')}</h3>
          </div>
          <div className="flex items-center space-x-4 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 bg-kwari-green rounded-full shadow-sm"></div>
              <span className="text-gray-500">Sales</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 bg-kwari-red rounded-full shadow-sm"></div>
              <span className="text-gray-500">Expenses</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-end justify-between h-56 space-x-2 sm:space-x-6">
          {chartData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center group relative h-full">
              <div className="w-full flex items-end justify-center space-x-1 h-full pb-2">
                {/* Sales Bar */}
                <div 
                  className="w-full max-w-[14px] bg-kwari-green/20 rounded-t-lg group-hover:bg-kwari-green transition-all relative cursor-pointer"
                  style={{ height: `${(d.sales / maxVal) * 100}%` }}
                >
                  {d.sales > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 font-black">
                      S: ₦{d.sales.toLocaleString()}
                    </div>
                  )}
                </div>
                {/* Expense Bar */}
                <div 
                  className="w-full max-w-[14px] bg-kwari-red/20 rounded-t-lg group-hover:bg-kwari-red transition-all relative cursor-pointer"
                  style={{ height: `${(d.expenses / maxVal) * 100}%` }}
                >
                  {d.expenses > 0 && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 font-black border border-red-500/30">
                      E: ₦{d.expenses.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[1px] w-full bg-gray-100"></div>
              <span className="text-[9px] font-black text-gray-400 mt-3 uppercase tracking-tighter">
                {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center space-x-2 mb-6">
            <Award className="text-kwari-gold" size={20} />
            <h3 className="font-bold text-gray-800">{t('topProducts')}</h3>
          </div>
          <div className="space-y-4">
            {topProducts.length > 0 ? topProducts.map(([name, stats], i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-2xl transition-colors hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-xs font-black text-kwari-gold border border-amber-100">
                    {i + 1}
                  </div>
                  <span className="text-sm font-bold text-gray-700">{name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-gray-900">{stats.quantity}</span>
                  <span className="text-[9px] text-gray-400 ml-1 uppercase font-black tracking-widest">Sold</span>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center">
                <Package size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs text-gray-400 font-bold italic">No product data found in sales.</p>
              </div>
            )}
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center space-x-2 mb-6">
            <PieChart className="text-kwari-red" size={20} />
            <h3 className="font-bold text-gray-800">Expense Breakdown</h3>
          </div>
          <div className="space-y-4">
            {sortedExpenses.length > 0 ? sortedExpenses.map(([cat, amount], i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700 capitalize">{t(cat)}</span>
                  <span className="text-sm font-black text-gray-900">₦ {amount.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-kwari-red" 
                    style={{ width: `${(amount / totalExpenses) * 100}%` }}
                  ></div>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center text-gray-400 italic text-xs font-bold">
                No expenses recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inventory Health */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center space-x-2 mb-6">
          <Package className="text-blue-500" size={20} />
          <h3 className="font-bold text-gray-800">Low Stock Alert</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory?.filter(item => item.quantity < 10).slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-red-50/30 rounded-2xl border border-red-100/50">
              <span className="text-sm font-bold text-gray-700">{item.name}</span>
              <span className="text-[10px] font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                {item.quantity} Left
              </span>
            </div>
          ))}
          {inventory?.filter(item => item.quantity < 10).length === 0 && (
            <div className="col-span-full flex flex-col items-center py-6">
              <div className="p-3 bg-green-50 rounded-2xl mb-3">
                <CheckCircle2 className="text-kwari-green" size={32} />
              </div>
              <p className="text-xs text-gray-400 font-black uppercase tracking-widest italic text-center">Stock levels are healthy!</p>
            </div>
          )}
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="bg-gray-900 text-white p-10 rounded-[2.5rem] text-center shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">{t('monthlySales')}</h3>
          <p className="text-5xl font-black mb-6 tracking-tight">
            ₦ {totalSales.toLocaleString()}
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-kwari-green/20 rounded-full border border-kwari-green/30">
            <TrendingUp size={16} className="text-kwari-green mr-2" />
            <span className="text-kwari-green font-black text-xs uppercase tracking-wider">Business is booming!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
