import { useState } from 'react';
import { db, addExpense } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Gavel, Plus, X, CheckCircle2, Calendar } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function MarketLevyView() {

  const { user } = useAuth();
  const shops = useLiveQuery(() => db.shops.toArray());
  const levies = useLiveQuery(() => db.market_levies.toArray());
  
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [shopId, setShopId] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !shopId) return;
    
    await db.market_levies.add({
      name,
      amount: parseFloat(amount),
      frequency,
      shopId: parseInt(shopId),
      updatedAt: Date.now()
    });
    
    setName('');
    setAmount('');
    setShowAdd(false);
  };

  const handlePay = async (levy: any) => {
    if (!user) return;
    
    await addExpense({
      category: 'levy',
      amount: levy.amount,
      description: `Market Levy: ${levy.name}`,
      date: new Date(),
      shopId: levy.shopId,
      createdBy: user.phone || user.email || 'Unknown'
    });

    await db.market_levies.update(levy.id, {
      lastPaidDate: new Date(),
      updatedAt: Date.now()
    });

    alert(`Paid ₦${levy.amount.toLocaleString()} for ${levy.name}`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">Market Dues (Kudin Kasuwa)</h3>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-gray-900 text-white p-2 rounded-xl flex items-center space-x-1 font-bold text-sm"
        >
          <Plus size={18} />
          <span>New Levy</span>
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <button onClick={() => setShowAdd(false)} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Levy Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="E.g. Market Security" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Amount (₦)</label>
                <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="200" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Frequency</label>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value as any)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Linked Shop</label>
              <select required value={shopId} onChange={(e) => setShopId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                <option value="">Select Shop...</option>
                {shops?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full p-3 bg-kwari-green text-white font-bold rounded-xl">Save Levy</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {levies?.map(levy => {
          const shop = shops?.find(s => s.id === levy.shopId);
          const isPaidToday = levy.lastPaidDate && new Date(levy.lastPaidDate).toDateString() === new Date().toDateString();
          
          return (
            <div key={levy.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={cn("p-3 rounded-2xl", isPaidToday ? "bg-green-50 text-kwari-green" : "bg-gray-100 text-gray-400")}>
                  <Gavel size={24} />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{levy.name}</p>
                  <div className="flex items-center space-x-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>₦ {levy.amount.toLocaleString()}</span>
                    <span>•</span>
                    <span>{levy.frequency}</span>
                    <span>•</span>
                    <span>{shop?.name}</span>
                  </div>
                </div>
              </div>
              
              {isPaidToday ? (
                <div className="flex items-center space-x-1 text-kwari-green font-black text-[10px] uppercase">
                  <CheckCircle2 size={14} />
                  <span>Paid</span>
                </div>
              ) : (
                <button 
                  onClick={() => handlePay(levy)}
                  className="bg-kwari-red text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-red-100"
                >
                  Pay Now
                </button>
              )}
            </div>
          );
        })}
        {(!levies || levies.length === 0) && (
          <div className="py-12 text-center text-gray-400 flex flex-col items-center">
            <Calendar size={48} className="opacity-10 mb-2" />
            <p className="italic text-sm font-bold">No recurring market dues tracked.</p>
          </div>
        )}
      </div>
    </div>
  );
}
