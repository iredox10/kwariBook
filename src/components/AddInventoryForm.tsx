import { useState, type FormEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { addInventoryItem, addDealerHierarchy, db } from '../lib/db';
import { X, Camera, Plus, Trash2 } from 'lucide-react';
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
  
  const [mode, setMode] = useState<'simple' | 'dealer'>('simple');
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
  const [dealerName, setDealerName] = useState('');
  const [dealerQty, setDealerQty] = useState('');
  const [dealerBuy, setDealerBuy] = useState('');
  const [dealerSell, setDealerSell] = useState('');
  const [bundles, setBundles] = useState<Array<{ quantity: string; priceBought: string; priceSell: string; color: string; yards: Array<{ name: string; color: string; quantity: string; priceBought: string; priceSell: string; }>; }>>([
    {
      quantity: '',
      priceBought: '',
      priceSell: '',
      color: '',
      yards: [
        { name: '', color: '', quantity: '', priceBought: '', priceSell: '' }
      ]
    }
  ]);

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
    if (!shopId || !user) return;

    setIsSubmitting(true);
    try {
      if (mode === 'simple') {
        if (!name || !quantity || !price) return;
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
      } else {
        if (!dealerName || !dealerQty || !dealerBuy || !dealerSell) return;
        const parsedBundles = bundles.map(bundle => ({
          quantity: parseFloat(bundle.quantity || '0'),
          priceBought: parseFloat(bundle.priceBought || '0'),
          priceSell: parseFloat(bundle.priceSell || '0'),
          color: bundle.color,
          shopId: parseInt(shopId)
        }));
        const yardsByBundle = bundles.map(bundle =>
          bundle.yards.map(yard => ({
            name: yard.name,
            color: yard.color,
            quantity: parseFloat(yard.quantity || '0'),
            priceBought: parseFloat(yard.priceBought || '0'),
            priceSell: parseFloat(yard.priceSell || '0'),
            shopId: parseInt(shopId)
          }))
        );
        await addDealerHierarchy(
          {
            name: dealerName,
            quantity: parseFloat(dealerQty),
            priceBought: parseFloat(dealerBuy),
            priceSell: parseFloat(dealerSell),
            shopId: parseInt(shopId),
            createdBy: user.phone || user.email || 'Unknown'
          },
          parsedBundles,
          yardsByBundle
        );
      }
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
              Inventory Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('simple')}
                className={`p-3 rounded-lg border font-bold text-sm ${mode === 'simple' ? 'bg-kwari-green text-white border-kwari-green' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Simple Item
              </button>
              <button
                type="button"
                onClick={() => setMode('dealer')}
                className={`p-3 rounded-lg border font-bold text-sm ${mode === 'dealer' ? 'bg-kwari-green text-white border-kwari-green' : 'bg-white text-gray-600 border-gray-200'}`}
              >
                Dealer → Bundle → Yard
              </button>
            </div>
          </div>
        </div>

        {mode === 'simple' && (
          <>
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
                onChange={(e) => setPurchaseCurrency(e.target.value as 'NGN' | 'USD' | 'RMB')}
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
              onChange={(e) => setUnit(e.target.value as 'suit' | 'bundle' | 'bale' | 'yards' | 'meters')}
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
          </>
        )}

        {mode === 'dealer' && (
          <>
            <div className="bg-kwari-green/5 p-4 rounded-xl border border-kwari-green/10 space-y-4">
              <h4 className="font-bold text-gray-800">Dealer Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dealer Name</label>
                  <input
                    type="text"
                    value={dealerName}
                    onChange={(e) => setDealerName(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none"
                    placeholder="e.g. Atampa Dealer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dealer Quantity</label>
                  <input
                    type="number"
                    value={dealerQty}
                    onChange={(e) => setDealerQty(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Bought</label>
                  <input
                    type="number"
                    value={dealerBuy}
                    onChange={(e) => setDealerBuy(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price to Sell</label>
                  <input
                    type="number"
                    value={dealerSell}
                    onChange={(e) => setDealerSell(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800">Bundles</h4>
                <button
                  type="button"
                  onClick={() => setBundles(prev => [...prev, { quantity: '', priceBought: '', priceSell: '', color: '', yards: [{ name: '', color: '', quantity: '', priceBought: '', priceSell: '' }] }])}
                  className="flex items-center space-x-2 text-kwari-green font-bold"
                >
                  <Plus size={16} />
                  <span>Add Bundle</span>
                </button>
              </div>

              {bundles.map((bundle, bIndex) => (
                <div key={bIndex} className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-gray-700">Bundle {bIndex + 1}</h5>
                    {bundles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setBundles(prev => prev.filter((_, i) => i !== bIndex))}
                        className="text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={bundle.quantity}
                      onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, quantity: e.target.value } : b))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Color"
                      value={bundle.color}
                      onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, color: e.target.value } : b))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Price Bought"
                      value={bundle.priceBought}
                      onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, priceBought: e.target.value } : b))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Price Sell"
                      value={bundle.priceSell}
                      onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, priceSell: e.target.value } : b))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h6 className="font-bold text-gray-600">Yards</h6>
                      <button
                        type="button"
                        onClick={() => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: [...b.yards, { name: '', color: '', quantity: '', priceBought: '', priceSell: '' }] } : b))}
                        className="text-kwari-green text-sm font-bold"
                      >
                        <Plus size={14} /> Add Yard
                      </button>
                    </div>

                    {bundle.yards.map((yard, yIndex) => (
                      <div key={yIndex} className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Yard Name"
                          value={yard.name}
                          onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: b.yards.map((y, j) => j === yIndex ? { ...y, name: e.target.value } : y) } : b))}
                          className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Color"
                          value={yard.color}
                          onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: b.yards.map((y, j) => j === yIndex ? { ...y, color: e.target.value } : y) } : b))}
                          className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={yard.quantity}
                          onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: b.yards.map((y, j) => j === yIndex ? { ...y, quantity: e.target.value } : y) } : b))}
                          className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Price Bought"
                          value={yard.priceBought}
                          onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: b.yards.map((y, j) => j === yIndex ? { ...y, priceBought: e.target.value } : y) } : b))}
                          className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Price Sell"
                          value={yard.priceSell}
                          onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: b.yards.map((y, j) => j === yIndex ? { ...y, priceSell: e.target.value } : y) } : b))}
                          className="p-2 bg-gray-50 border border-gray-200 rounded-lg col-span-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
          </>
        )}
      </form>
    </div>
  );
}
