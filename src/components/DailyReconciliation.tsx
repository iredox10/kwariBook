import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Moon, CheckCircle2, TrendingUp, Receipt, Wallet, Banknote } from 'lucide-react';
import { useState, useMemo } from 'react';

export function DailyReconciliation() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const sales = useLiveQuery(() => 
    db.sales.filter(s => !s.isReversed && new Date(s.date).toISOString().split('T')[0] === selectedDate).toArray()
  , [selectedDate]);

  const expenses = useLiveQuery(() => 
    db.expenses.filter(e => new Date(e.date).toISOString().split('T')[0] === selectedDate).toArray()
  , [selectedDate]);

  const debtPayments = useLiveQuery(() => 
    db.debt_payments.filter(p => new Date(p.date).toISOString().split('T')[0] === selectedDate).toArray()
  , [selectedDate]);

  const stats = useMemo(() => {
    if (!sales || !expenses || !debtPayments) return { revenue: 0, debtCollected: 0, totalExpenses: 0, totalCash: 0 };
    
    const cashSales = sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    const collected = debtPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      revenue: cashSales,
      debtCollected: collected,
      totalExpenses: totalExp,
      totalCash: cashSales + collected - totalExp
    };
  }, [sales, expenses, debtPayments]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-kwari-green">
            <Moon size={24} />
            <h3 className="text-xl font-bold text-gray-800">End of Day Report</h3>
          </div>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Total Sales (Cash)</span>
              <TrendingUp size={16} className="text-green-600" />
            </div>
            <p className="text-xl font-black text-gray-900">₦ {(stats.revenue || 0).toLocaleString()}</p>
          </div>

          <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Debt Collected</span>
              <Wallet size={16} className="text-blue-600" />
            </div>
            <p className="text-xl font-black text-gray-900">₦ {(stats.debtCollected || 0).toLocaleString()}</p>
          </div>

          <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Expenses Paid</span>
              <Receipt size={16} className="text-red-600" />
            </div>
            <p className="text-xl font-black text-gray-900">₦ {(stats.totalExpenses || 0).toLocaleString()}</p>
          </div>

          <div className="p-5 bg-gray-900 rounded-2xl shadow-xl shadow-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Cash in Pocket</span>
              <Banknote size={16} className="text-kwari-green" />
            </div>
            <p className="text-xl font-black text-white">₦ {(stats.totalCash || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center">
          <div className="p-4 bg-kwari-green text-white rounded-full mb-4 shadow-lg">
            <CheckCircle2 size={32} />
          </div>
          <p className="text-sm font-bold text-gray-800">Drawer Reconciliation Complete</p>
          <p className="text-xs text-gray-400 mt-1">Please ensure actual cash matches the black card amount.</p>
        </div>
      </div>
    </div>
  );
}
