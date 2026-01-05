import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, recordZakat } from '../lib/db';
import { Landmark, TrendingUp, Info, History, CheckCircle2 } from 'lucide-react';

export function CalculatorView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'zakat' | 'fx' | 'zakat_ledger'>('zakat');

  // Zakat State
  const [cash, setCash] = useState('');
  const [goldPrice, setGoldPrice] = useState('90000'); 
  const [zakatNote, setZakatNote] = useState('');
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const zakatHistory = useLiveQuery(() => db.zakat.orderBy('date').reverse().toArray());
  const totalInventoryValue = inventory?.reduce((acc, item) => acc + (item.quantity * item.pricePerUnit), 0) || 0;
  
  const totalWealth = (parseFloat(cash) || 0) + totalInventoryValue;
  const nisabThreshold = (parseFloat(goldPrice) || 0) * 85;
  const isEligible = totalWealth >= nisabThreshold;
  const zakatDue = isEligible ? totalWealth * 0.025 : 0;

  const handleRecordZakat = async () => {
    if (zakatDue <= 0) return;
    await recordZakat({
      amount: zakatDue,
      totalWealth,
      date: new Date(),
      note: zakatNote || 'Annual Zakat payment'
    });
    alert('Zakat payment recorded in ledger.');
    setZakatNote('');
    setActiveTab('zakat_ledger');
  };

  // FX State
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState('1450');
  const [fxAmount, setFxAmount] = useState('');
  const nairaResult = (parseFloat(fxAmount) || 0) * (parseFloat(rate) || 0);

  return (
    <div className="space-y-6">
      <div className="flex p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setActiveTab('zakat')}
          className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg font-bold transition-all ${
            activeTab === 'zakat' ? 'bg-white shadow-sm text-kwari-green' : 'text-gray-500'
          }`}
        >
          <Landmark size={20} />
          <span>{t('zakat')}</span>
        </button>
        <button
          onClick={() => setActiveTab('fx')}
          className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg font-bold transition-all ${
            activeTab === 'fx' ? 'bg-white shadow-sm text-kwari-green' : 'text-gray-500'
          }`}
        >
          <TrendingUp size={20} />
          <span>{t('fx')}</span>
        </button>
        <button
          onClick={() => setActiveTab('zakat_ledger')}
          className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg font-bold transition-all ${
            activeTab === 'zakat_ledger' ? 'bg-white shadow-sm text-kwari-green' : 'text-gray-500'
          }`}
        >
          <History size={20} />
          <span>History</span>
        </button>
      </div>

      {activeTab === 'zakat' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
               <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('inventoryValue')}</h4>
               <p className="text-xl font-bold text-gray-800">₦ {totalInventoryValue.toLocaleString()}</p>
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">{t('cashOnHand')}</label>
               <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-kwari-green transition-all"
                placeholder="0.00"
               />
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <div className="flex items-start space-x-2">
              <Info size={18} className="text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">Nisab Threshold</p>
                <p className="text-xs text-amber-700 mb-2">Based on 85g of gold. Current Nisab: ₦ {nisabThreshold.toLocaleString()}</p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-amber-600">Gold Price (per gram):</span>
                  <input 
                    type="number" 
                    value={goldPrice} 
                    onChange={(e) => setGoldPrice(e.target.value)}
                    className="w-24 p-1 text-xs bg-white border border-amber-200 rounded outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex flex-col items-center">
             <h3 className="text-sm font-medium text-gray-500 mb-2">{t('totalWealth')}</h3>
             <p className="text-4xl font-black text-gray-900 mb-6">₦ {totalWealth.toLocaleString()}</p>
             
             {!isEligible ? (
               <div className="w-full bg-gray-50 p-6 rounded-2xl text-center border border-gray-200">
                  <p className="text-gray-500 font-bold">Wealth is below Nisab threshold.</p>
                  <p className="text-xs text-gray-400">Zakat is not yet mandatory.</p>
               </div>
             ) : (
               <div className="w-full space-y-4">
                 <div className="w-full bg-kwari-green/10 p-6 rounded-2xl border-2 border-kwari-green border-dashed text-center">
                    <h2 className="text-kwari-green font-bold text-lg mb-1">{t('zakatDue')}</h2>
                    <p className="text-3xl font-black text-kwari-green">₦ {zakatDue.toLocaleString()}</p>
                 </div>
                 <div className="space-y-2">
                    <input 
                      type="text" 
                      value={zakatNote} 
                      onChange={(e) => setZakatNote(e.target.value)}
                      placeholder="Note (e.g. Distributed to needy neighbors)"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                    />
                    <button 
                      onClick={handleRecordZakat}
                      className="w-full p-3 bg-kwari-green text-white font-black rounded-xl shadow-lg hover:bg-opacity-90 transition-all"
                    >
                      Mark as Paid & Save to Ledger
                    </button>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}

      {activeTab === 'zakat_ledger' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {zakatHistory?.map(record => (
            <div key={record.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 text-kwari-green rounded-xl"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-sm font-bold text-gray-800">₦ {record.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(record.date).toLocaleDateString()} • {record.note}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Wealth at time</p>
                <p className="text-xs font-black text-gray-600">₦ {record.totalWealth.toLocaleString()}</p>
              </div>
            </div>
          ))}
          {(!zakatHistory || zakatHistory.length === 0) && (
            <div className="p-12 text-center text-gray-400">
              <History size={48} className="mx-auto opacity-10 mb-4" />
              <p className="font-bold italic">No past Zakat records found.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'fx' && (
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-6 shadow-sm">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('currency')}</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-kwari-green transition-all"
                >
                  <option value="USD">USD (Dollar)</option>
                  <option value="RMB">RMB (Yuan)</option>
                  <option value="AED">AED (Dirham)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('exchangeRate')}</label>
                <input
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-kwari-green transition-all"
                />
              </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('amountInFX')}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">{currency}</span>
                </div>
                <input
                  type="number"
                  value={fxAmount}
                  onChange={(e) => setFxAmount(e.target.value)}
                  className="w-full pl-16 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-kwari-green transition-all"
                  placeholder="0.00"
                />
              </div>
           </div>

           <div className="pt-6 border-t border-gray-100">
              <div className="bg-gray-900 text-white p-6 rounded-2xl text-center">
                <h2 className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-2">{t('resultInNaira')}</h2>
                <p className="text-4xl font-black">₦ {nairaResult.toLocaleString()}</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
