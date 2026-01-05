import { useState, type FormEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { addInventoryItem, db } from '../lib/db';
import { X, Camera } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';

interface AddInventoryFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddInventoryForm({ onSuccess, onCancel }: AddInventoryFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const shops = useLiveQuery(() => db.shops.toArray());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'suit' | 'bundle' | 'bale' | 'yards' | 'meters'>('suit');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseCurrency, setPurchaseCurrency] = useState<'NGN' | 'USD' | 'RMB'>('NGN');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleThreshold, setWholesaleThreshold] = useState('5');
  const [shopId, setShopId] = useState<string>('');
  const [barcode, setBarcode] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setPhoto(canvas.toDataURL('image/jpeg', 0.7));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !quantity || !price || !shopId || !user) return;

    setIsSubmitting(true);
    try {
      await addInventoryItem({
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        pricePerUnit: parseFloat(price),
        purchasePrice: parseFloat(purchasePrice) || 0,
        purchaseCurrency,
        wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : undefined,
        wholesaleThreshold: wholesaleThreshold ? parseFloat(wholesaleThreshold) : undefined,
        photo: photo || undefined,
        barcode: barcode || undefined,
        shopId: parseInt(shopId),
        createdBy: user.phone || user.email || 'Unknown',
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
        {/* Photo Section */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-all"
          >
            {photo ? (
              <img src={photo} alt="Fabric Pattern" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Camera size={32} />
                <span className="text-[10px] font-bold mt-1 uppercase">Add Pattern Photo</span>
              </div>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
          />
          {photo && (
            <button 
              type="button" 
              onClick={() => setPhoto(null)}
              className="text-[10px] font-bold text-red-500 uppercase"
            >
              Remove Photo
            </button>
          )}
        </div>

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

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barcode ID (Optional)
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 outline-none transition-all"
              placeholder="Leave empty to auto-generate"
            />
          </div>
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
              placeholder="Sale Price"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Cost
            </label>
            <div className="flex space-x-2">
              <select 
                value={purchaseCurrency}
                onChange={(e) => setPurchaseCurrency(e.target.value as any)}
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm font-bold"
              >
                <option value="NGN">₦</option>
                <option value="USD">$</option>
                <option value="RMB">¥</option>
              </select>
              <input
                type="number"
                required
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="What you paid"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-kwari-green/5 p-4 rounded-xl border border-kwari-green/10">
          <div>
            <label className="block text-[10px] font-black text-kwari-green uppercase mb-1">Wholesale Price (₦)</label>
            <input
              type="number"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-kwari-green uppercase mb-1">Wholesale Min Qty</label>
            <input
              type="number"
              value={wholesaleThreshold}
              onChange={(e) => setWholesaleThreshold(e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm"
              placeholder="5"
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
              <option value="yards">Yards</option>
              <option value="meters">Meters</option>
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
