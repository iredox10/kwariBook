import { useState, type FormEvent } from 'react';
import { db, addSupplier, addSupplierTransaction } from '../lib/db';
import { X, Truck, Plus, ArrowUpCircle, ArrowDownCircle, Coins } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function SuppliersView() {
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const transactions = useLiveQuery(() => db.supplier_transactions.orderBy('date').reverse().toArray());
  
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showAddTx, setShowAddTx] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<'NGN' | 'USD' | 'RMB'>('NGN');
  
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'purchase' | 'payment'>('purchase');
  const [txDescription, setTxDescription] = useState('');

  const handleAddSupplier = async (e: FormEvent) => {
    e.preventDefault();
    await addSupplier({ name, currency, totalDebt: 0 });
    setName('');
    setShowAddSupplier(false);
  };

  const handleAddTransaction = async (e: FormEvent) => {
    e.preventDefault();
    if (showAddTx) {
      await addSupplierTransaction({
        supplierId: showAddTx,
        amount: parseFloat(txAmount),
        currency: suppliers?.find(s => s.id === showAddTx)?.currency || 'NGN',
        type: txType,
        date: new Date(),
        description: txDescription
      });
      setTxAmount('');
      setTxDescription('');
      setShowAddTx(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">Suppliers (Masu Kawo Kaya)</h3>
        <button 
          onClick={() => setShowAddSupplier(true)}
          className="bg-kwari-green text-white p-2 rounded-xl flex items-center space-x-1 font-bold text-sm"
        >
          <Plus size={18} />
          <span>Add Supplier</span>
        </button>
      </div>

      {showAddSupplier && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative animate-in fade-in zoom-in duration-200">
          <button onClick={() => setShowAddSupplier(false)} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>
          <form onSubmit={handleAddSupplier} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Supplier Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="E.g. Mr. Chen (Guangzhou)" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Trading Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                <option value="NGN">Naira (₦)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="RMB">Chinese Yuan (¥)</option>
              </select>
            </div>
            <button type="submit" className="w-full p-3 bg-kwari-green text-white font-bold rounded-xl shadow-md">Create Supplier</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {suppliers?.map(supplier => (
          <div key={supplier.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Truck size={24} /></div>
                <div>
                  <p className="font-bold text-gray-800 text-lg">{supplier.name}</p>
                  <p className="text-xs text-gray-400 font-bold uppercase">{supplier.currency} Account</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Current Debt</p>
                <p className="text-xl font-black text-kwari-red">
                  {supplier.currency === 'NGN' ? '₦' : supplier.currency === 'USD' ? '$' : '¥'} {supplier.totalDebt.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => { setShowAddTx(supplier.id!); setTxType('purchase'); }}
                className="flex-1 p-2.5 bg-gray-900 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1"
              >
                <ArrowUpCircle size={14} />
                <span>Add Debt</span>
              </button>
              <button 
                onClick={() => { setShowAddTx(supplier.id!); setTxType('payment'); }}
                className="flex-1 p-2.5 bg-kwari-green text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1"
              >
                <ArrowDownCircle size={14} />
                <span>Add Payment</span>
              </button>
            </div>

            {showAddTx === supplier.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black uppercase text-gray-500">Record {txType === 'purchase' ? 'New Purchase' : 'New Payment'}</h4>
                  <button onClick={() => setShowAddTx(null)}><X size={14} className="text-gray-400" /></button>
                </div>
                <form onSubmit={handleAddTransaction} className="space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                      {supplier.currency === 'NGN' ? '₦' : supplier.currency === 'USD' ? '$' : '¥'}
                    </span>
                    <input type="number" required value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full pl-8 p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm font-bold" placeholder="0.00" />
                  </div>
                  <input type="text" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-xs" placeholder="Description (e.g. Bale Invoice #123)" />
                  <button type="submit" className={cn("w-full p-2 text-white font-bold rounded-lg text-xs", txType === 'purchase' ? "bg-gray-900" : "bg-kwari-green")}>
                    Confirm {txType}
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h4 className="font-bold text-gray-800 mb-4 px-1 flex items-center space-x-2">
          <Coins size={18} className="text-amber-500" />
          <span>Recent Transactions</span>
        </h4>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {transactions?.slice(0, 10).map(tx => {
            const supplier = suppliers?.find(s => s.id === tx.supplierId);
            return (
              <div key={tx.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn("p-1.5 rounded-lg", tx.type === 'purchase' ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
                    {tx.type === 'purchase' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{supplier?.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(tx.date).toLocaleDateString()} • {tx.description || tx.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-black", tx.type === 'purchase' ? "text-red-600" : "text-kwari-green")}>
                    {tx.type === 'purchase' ? '+' : '-'} {tx.currency === 'NGN' ? '₦' : tx.currency === 'USD' ? '$' : '¥'} {tx.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
