import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { db, transferStock } from '../lib/db';
import { X, ArrowRightLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';

interface StockTransferFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function StockTransferForm({ onSuccess, onCancel }: StockTransferFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const shops = useLiveQuery(() => db.shops.toArray());
  
  const [fromShopId, setFromShopId] = useState<string>('');
  const [toShopId, setToShopId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch inventory for the source shop
  const inventory = useLiveQuery(
    () => fromShopId ? db.inventory.where('shopId').equals(parseInt(fromShopId)).toArray() : [],
    [fromShopId]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromShopId || !toShopId || !productId || !quantity || !user) return;
    if (fromShopId === toShopId) {
      setError('Source and destination shops must be different.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await transferStock({
        fromShopId: parseInt(fromShopId),
        toShopId: parseInt(toShopId),
        productId: parseInt(productId),
        quantity: parseFloat(quantity),
        date: new Date(),
        createdBy: user.phone || user.email || 'Unknown',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
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
      
      <div className="flex items-center space-x-2 mb-6">
        <ArrowRightLeft className="text-kwari-green" size={24} />
        <h3 className="text-xl font-bold text-gray-800">{t('transfer')}</h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fromShop')}
            </label>
            <select
              required
              value={fromShopId}
              onChange={(e) => {
                setFromShopId(e.target.value);
                setProductId(''); // Reset product
              }}
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
              {t('toShop')}
            </label>
            <select
              required
              value={toShopId}
              onChange={(e) => setToShopId(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
            >
              <option value="">{t('selectShop')}...</option>
              {shops?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('inventory')}
          </label>
          <select
            required
            disabled={!fromShopId}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all disabled:opacity-50"
          >
            <option value="">{fromShopId ? 'Select item to transfer...' : 'Please select source shop first'}</option>
            {inventory?.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.quantity} {t(p.unit)} available)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('quantity')}
          </label>
          <input
            type="number"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
            placeholder="0"
            min="0.1"
            step="any"
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
            className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : t('transfer')}
          </button>
        </div>
      </form>
    </div>
  );
}
