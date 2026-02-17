import { useState, type FormEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { addInventoryItem, addDealerHierarchy, db } from '../lib/db';
import { X, Camera, Plus } from 'lucide-react';
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
  const [bundleCount, setBundleCount] = useState('1');
  const [bundles, setBundles] = useState<Array<{ color: string; image: string | null; yards: Array<{ name: string; color: string; quantity: string; priceBought: string; priceSell: string; image: string | null; }>; }>>([
    {
      color: '#000000',
      image: null,
      yards: [
        { name: '', color: '#000000', quantity: '', priceBought: '', priceSell: '', image: null }
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

  const pickColorFromImage = (e: React.MouseEvent<HTMLImageElement>, bundleIndex: number) => {
    const imgEl = e.currentTarget;
    if (!imgEl.naturalWidth || !imgEl.naturalHeight) return;
    const rect = imgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imgEl.naturalWidth / rect.width);
    const y = (e.clientY - rect.top) * (imgEl.naturalHeight / rect.height);

    const canvas = document.createElement('canvas');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    const hex = `#${[pixel[0], pixel[1], pixel[2]]
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')}`;
    setBundles(prev => prev.map((b, i) => i === bundleIndex ? { ...b, color: hex, yards: b.yards.map(y => ({ ...y, color: hex })) } : b));
  };

  const [bundlePriceOverride, setBundlePriceOverride] = useState<{ bought: string; sell: string } | null>(null);
  const bundleCountNumber = Math.max(1, parseInt(bundleCount || '1', 10));
  const dealerBuyNumber = parseFloat(dealerBuy || '0');
  const dealerSellNumber = parseFloat(dealerSell || '0');
  const bundlePriceBoughtComputed = bundleCountNumber ? dealerBuyNumber / bundleCountNumber : 0;
  const bundlePriceSellComputed = bundleCountNumber ? dealerSellNumber / bundleCountNumber : 0;
  const bundlePriceBoughtFinal = bundlePriceOverride?.bought ? parseFloat(bundlePriceOverride.bought) : bundlePriceBoughtComputed;
  const bundlePriceSellFinal = bundlePriceOverride?.sell ? parseFloat(bundlePriceOverride.sell) : bundlePriceSellComputed;

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
          quantity: parseFloat(bundleCount || '0'),
          priceBought: bundlePriceBoughtFinal,
          priceSell: bundlePriceSellFinal,
          color: bundle.color,
          image: bundle.image || undefined,
          shopId: parseInt(shopId)
        }));
        const yardsByBundle = bundles.map(bundle =>
          bundle.yards.map(yard => {
            const yardQty = parseFloat(yard.quantity || '0');
            const yardPriceBought = yardQty ? bundlePriceBoughtFinal / yardQty : 0;
            const yardPriceSell = yardQty ? bundlePriceSellFinal / yardQty : 0;
            return {
              name: dealerName,
              color: bundle.color,
              image: bundle.image || undefined,
              quantity: yardQty,
              priceBought: yardPriceBought,
              priceSell: yardPriceSell,
              shopId: parseInt(shopId)
            };
          })
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
                  <div className="mt-1 text-xs font-bold text-gray-600">
                    ₦{dealerBuyNumber.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price to Sell</label>
                  <input
                    type="number"
                    value={dealerSell}
                    onChange={(e) => setDealerSell(e.target.value)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg outline-none"
                  />
                  <div className="mt-1 text-xs font-bold text-gray-600">
                    ₦{dealerSellNumber.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
                <h5 className="font-bold text-gray-700">Bundle Settings</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Number of Bundles</label>
                    <input
                      type="number"
                      value={bundleCount}
                      onChange={(e) => {
                        const value = e.target.value;
                        const count = Math.max(1, parseInt(value || '1', 10));
                        setBundleCount(value);
                        setBundles(prev => {
                          const next = [...prev];
                          if (count > next.length) {
                            for (let i = next.length; i < count; i += 1) {
                              next.push({ color: '#000000', image: null, yards: [{ name: '', color: '#000000', quantity: '', priceBought: '', priceSell: '', image: null }] });
                            }
                          } else if (count < next.length) {
                            next.splice(count);
                          }
                          return next;
                        });
                      }}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bundle Price Bought</label>
                    <input
                      type="number"
                      value={bundlePriceOverride?.bought ?? ''}
                      onChange={(e) => setBundlePriceOverride(prev => ({ bought: e.target.value, sell: prev?.sell ?? '' }))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      placeholder={`Auto: ₦${bundlePriceBoughtComputed.toLocaleString()}`}
                    />
                    <div className="mt-1 text-xs font-bold text-gray-600">Auto: ₦{bundlePriceBoughtComputed.toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bundle Price Sell</label>
                    <input
                      type="number"
                      value={bundlePriceOverride?.sell ?? ''}
                      onChange={(e) => setBundlePriceOverride(prev => ({ bought: prev?.bought ?? '', sell: e.target.value }))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      placeholder={`Auto: ₦${bundlePriceSellComputed.toLocaleString()}`}
                    />
                    <div className="mt-1 text-xs font-bold text-gray-600">Auto: ₦{bundlePriceSellComputed.toLocaleString()}</div>
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => setBundlePriceOverride(null)}
                      className="text-xs font-bold text-kwari-green"
                    >
                      Reset to auto
                    </button>
                  </div>
                </div>
              </div>

              {bundles.map((bundle, bIndex) => (
                <div key={bIndex} className="bg-white p-4 rounded-xl border border-gray-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-gray-700">Bundle {bIndex + 1}</h5>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={bundle.color}
                        onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, color: e.target.value } : b))}
                        className="w-12 h-12 p-1 bg-white border border-gray-200 rounded-lg"
                        aria-label="Bundle color"
                      />
                      <span className="text-sm font-bold text-gray-600">{bundle.color}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bundle Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, image: reader.result as string } : b));
                          };
                          reader.readAsDataURL(file);
                        }}
                        className="w-full text-sm"
                      />
                      {bundle.image && (
                        <img
                          src={bundle.image}
                          alt="Bundle"
                          className="mt-2 w-28 h-28 object-cover rounded-lg border cursor-crosshair"
                          title="Click to pick color"
                          onClick={(e) => pickColorFromImage(e, bIndex)}
                        />
                      )}
                      {bundle.image && (
                        <div className="mt-2 flex items-center gap-3">
                          {'EyeDropper' in window ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const picker = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
                                try {
                                  const result = await picker.open();
                                  const hex = result.sRGBHex as string;
                                  setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, color: hex, yards: b.yards.map(y => ({ ...y, color: hex })) } : b));
                                } catch {
                                  // User cancelled
                                }
                              }}
                              className="text-xs font-bold text-kwari-green"
                            >
                              Use eyedropper
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">Eyedropper not supported. Click image to pick color.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h6 className="font-bold text-gray-600">Yards</h6>
                      <button
                        type="button"
                        onClick={() => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: [...b.yards, { name: '', color: '#000000', quantity: '', priceBought: '', priceSell: '', image: null }] } : b))}
                        className="text-kwari-green text-sm font-bold"
                      >
                        <Plus size={14} /> Add Yard
                      </button>
                    </div>

                    {bundle.yards.map((yard, yIndex) => (
                      <div key={yIndex} className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700">
                          {dealerName || 'Dealer Name'}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={bundle.color}
                            onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, color: e.target.value, yards: b.yards.map((y) => ({ ...y, color: e.target.value })) } : b))}
                            className="w-10 h-10 p-1 bg-white border border-gray-200 rounded-lg"
                            aria-label="Yard color"
                          />
                          <span className="text-xs font-bold text-gray-600">{bundle.color}</span>
                        </div>
                        <input
                          type="number"
                          placeholder="Quantity"
                          value={yard.quantity}
                          onChange={(e) => setBundles(prev => prev.map((b, i) => i === bIndex ? { ...b, yards: b.yards.map((y, j) => j === yIndex ? { ...y, quantity: e.target.value } : y) } : b))}
                          className="p-2 bg-gray-50 border border-gray-200 rounded-lg"
                        />
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                          Buy: ₦{(() => {
                            const qty = parseFloat(yard.quantity || '0');
                            const price = qty ? bundlePriceBoughtComputed / qty : 0;
                            return price.toLocaleString();
                          })()}
                        </div>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                          Sell: ₦{(() => {
                            const qty = parseFloat(yard.quantity || '0');
                            const price = qty ? bundlePriceSellComputed / qty : 0;
                            return price.toLocaleString();
                          })()}
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Yard Image (inherits bundle image)</label>
                          {bundle.image ? (
                            <img src={bundle.image} alt="Yard" className="w-20 h-20 object-cover rounded-lg border" />
                          ) : (
                            <div className="text-xs text-gray-400">No bundle image</div>
                          )}
                        </div>
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
