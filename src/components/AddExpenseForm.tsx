import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { db, addExpense } from '../lib/db';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface AddExpenseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddExpenseForm({ onSuccess, onCancel }: AddExpenseFormProps) {
  const { t } = useTranslation();
  const shops = useLiveQuery(() => db.shops.toArray());
  
  const [category, setCategory] = useState<'porter' | 'fuel' | 'rent' | 'commission' | 'other'>('porter');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [shopId, setShopId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !shopId) return;

    setIsSubmitting(true);
    try {
      await addExpense({
        category,
        amount: parseFloat(amount),
        description,
        date: new Date(),
        shopId: parseInt(shopId),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
      <button 
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <X size={20} />
      </button>
      
      <h3 className="text-xl font-bold text-gray-800 mb-6">{t('addExpense')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('selectShop')}
          </label>
          <select
            required
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
          >
            <option value="">{t('selectShop')}...</option>
            {shops?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('category')}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
          >
            <option value="porter">{t('porter')}</option>
            <option value="fuel">{t('fuel')}</option>
            <option value="rent">{t('rent')}</option>
            <option value="other">{t('other')}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('amount')} (₦)
          </label>
          <input
            type="number"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('description')}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
            placeholder="E.g. Payment for bale delivery"
          />
        </div>

        <div className="pt-4 flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 p-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 p-3 bg-kwari-red text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t('recording') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
