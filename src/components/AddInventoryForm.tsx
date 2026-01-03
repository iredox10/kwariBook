import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { addInventoryItem, db } from '../lib/db';
import { X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface AddInventoryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddInventoryForm({ onSuccess, onCancel }: AddInventoryFormProps) {
  const { t } = useTranslation();
  const shops = useLiveQuery(() => db.shops.toArray());
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'suit' | 'bundle' | 'bale'>('suit');
  const [price, setPrice] = useState('');
  const [shopId, setShopId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !price || !shopId) return;

    setIsSubmitting(true);
    try {
      await addInventoryItem({
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        pricePerUnit: parseFloat(price),
        shopId: parseInt(shopId),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add inventory:', error);
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
      
      <h3 className="text-xl font-bold text-gray-800 mb-6">{t('addInventory')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('selectShop')}
          </label>
          <select
            required
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
          >
            <option value="">{t('selectShop')}...</option>
            {shops?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('productName')}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
            placeholder="E.g. Shadda White"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('category')}
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
              placeholder="E.g. Brocade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pricePerUnit')} (₦)
            </label>
            <input
              type="number"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('quantity')}
            </label>
            <input
              type="number"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('unit')}
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as any)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
            >
              <option value="suit">{t('suit')}</option>
              <option value="bundle">{t('bundle')}</option>
              <option value="bale">{t('bale')}</option>
            </select>
          </div>
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
            className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t('recording') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
