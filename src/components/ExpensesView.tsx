import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useTranslation } from 'react-i18next';
import { Receipt, Calendar, Store } from 'lucide-react';

export function ExpensesView() {
  const { t } = useTranslation();
  const expenses = useLiveQuery(() => db.expenses.orderBy('date').reverse().toArray());
  const shops = useLiveQuery(() => db.shops.toArray());

  const totalExpenses = expenses?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">{t('expenses')} (Total)</h3>
          <p className="text-3xl font-black text-kwari-red">₦ {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-red-50 text-kwari-red rounded-2xl">
          <Receipt size={32} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {(!expenses || expenses.length === 0) ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <Calendar size={48} className="opacity-20 mb-4" />
              <p>No expenses recorded.</p>
            </div>
          ) : (
            expenses.map((expense) => {
              const shop = shops?.find(s => s.id === expense.shopId);
              return (
                <div key={expense.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{t(expense.category)}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="flex items-center"><Store size={10} className="mr-1" /> {shop?.name}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                      {expense.description && (
                        <p className="text-xs text-gray-400 mt-1 italic">{expense.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-kwari-red">₦ {expense.amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
