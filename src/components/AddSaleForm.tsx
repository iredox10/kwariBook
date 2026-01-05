import { useState, type FormEvent, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addSale, db, addCustomer } from '../lib/db';
import { X, Trash2, UserPlus, Scan, AlertTriangle, ShieldCheck, CheckSquare, Square, Mic, MicOff } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../hooks/useAuth';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AddSaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface SelectedItem {
  productId: number;
  quantity: number;
  price: number;
  purchasePrice: number;
  name: string;
}

export function AddSaleForm({ onSuccess, onCancel }: AddSaleFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const shops = useLiveQuery(() => db.shops.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const flagged = useLiveQuery(() => db.flagged_customers.toArray());
  const brokers = useLiveQuery(() => db.brokers.toArray());
  
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string>('');
  const [status, setStatus] = useState<'paid' | 'credit' | 'salo'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [shopId, setShopId] = useState<string>('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [laadaAmount, setLaadaAmount] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isNewCustomer, setIsNewShopCustomer] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRemnantModal, setShowRemnantModal] = useState(false);
  const [remnants, setRemnants] = useState<{ productId: number, quantity: number, unit: 'yards' | 'meters' }[]>([]);
  const [verifiedSteps, setVerifiedSteps] = useState<number[]>([]);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const inventory = useLiveQuery(
    () => shopId ? db.inventory.where('shopId').equals(parseInt(shopId)).toArray() : [],
    [shopId]
  );

  const isCustomerFlagged = useMemo(() => {
    if (!flagged) return false;
    const phone = isNewCustomer ? customerPhone : customers?.find(c => c.id === parseInt(customerId))?.phone;
    return flagged.some(f => f.phone === phone);
  }, [flagged, customerId, customerPhone, isNewCustomer, customers]);

  const getCorrectPrice = (productId: number, quantity: number) => {
    const product = inventory?.find(p => p.id === productId);
    if (!product) return { salePrice: 0, purchasePrice: 0 };
    let salePrice = product.pricePerUnit;
    if (product.wholesalePrice && product.wholesaleThreshold && quantity >= product.wholesaleThreshold) {
      salePrice = product.wholesalePrice;
    }
    return { salePrice, purchasePrice: product.purchasePrice };
  };

  const updateItemQuantity = (index: number, qty: number) => {
    const newItems = [...selectedItems];
    const { salePrice, purchasePrice } = getCorrectPrice(newItems[index].productId, qty);
    newItems[index].quantity = qty;
    newItems[index].price = salePrice;
    newItems[index].purchasePrice = purchasePrice;
    setSelectedItems(newItems);
  };

  const addItem = (productId: number) => {
    const product = inventory?.find(p => p.id === productId);
    if (!product) return;
    const existingIndex = selectedItems.findIndex(i => i.productId === productId);
    if (existingIndex > -1) {
      updateItemQuantity(existingIndex, selectedItems[existingIndex].quantity + 1);
      return;
    }
    const initialQty = 1;
    const { salePrice, purchasePrice } = getCorrectPrice(productId, initialQty);
    setSelectedItems([...selectedItems, { productId, quantity: initialQty, price: salePrice, purchasePrice, name: product.name }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ha-NG';
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      setCustomerName(event.results[0][0].transcript);
    };
    recognition.start();
  };

  useEffect(() => {
    if (isScanning) {
      scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scannerRef.current.render((decodedText) => {
        const product = inventory?.find(p => p.id === parseInt(decodedText) || p.name.toLowerCase() === decodedText.toLowerCase());
        if (product && product.id) {
          addItem(product.id);
          setIsScanning(false);
          scannerRef.current?.clear();
        }
      }, () => {});
    }
    return () => { scannerRef.current?.clear(); };
  }, [isScanning, inventory]);

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!customerName && !customerId) || selectedItems.length === 0 || !shopId || !user) return;

    if (status === 'paid' && paymentMethod === 'transfer' && verifiedSteps.length < 3) {
      setShowVerifyModal(true);
      return;
    }

    const hasBundles = selectedItems.some(item => {
      const p = inventory?.find(inv => inv.id === item.productId);
      return p?.unit === 'bundle' || p?.unit === 'bale';
    });

    if (hasBundles && !showRemnantModal && remnants.length === 0) {
      setShowRemnantModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      let finalCustomerId = customerId ? parseInt(customerId) : undefined;
      let finalCustomerName = customerName;
      if (isNewCustomer && customerName) {
        finalCustomerId = await addCustomer({ name: customerName, phone: customerPhone });
      } else if (customerId) {
        const existing = customers?.find(c => c.id === parseInt(customerId));
        if (existing) finalCustomerName = existing.name;
      }
      await addSale({
        customerName: finalCustomerName,
        customerId: finalCustomerId,
        totalAmount,
        status,
        date: new Date(),
        shopId: parseInt(shopId),
        brokerId: brokerId ? parseInt(brokerId) : undefined,
        laadaAmount: laadaAmount ? parseFloat(laadaAmount) : undefined,
        createdBy: user.phone || user.email || 'Unknown',
      }, selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity, name: i.name, price: i.price, purchasePrice: i.purchasePrice })));

      for (const rem of remnants) {
        const parent = inventory?.find(p => p.id === rem.productId);
        if (parent) {
          await db.inventory.add({
            name: `${parent.name} (Remnant)`,
            category: parent.category,
            quantity: rem.quantity,
            unit: rem.unit,
            pricePerUnit: parent.pricePerUnit * 0.8,
            purchasePrice: parent.purchasePrice,
            purchaseCurrency: parent.purchaseCurrency,
            isRemnant: true,
            parentId: parent.id,
            shopId: parent.shopId,
            createdBy: user.phone || user.email || 'Unknown',
            updatedAt: Date.now()
          });
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to add sale:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStep = (step: number) => {
    setVerifiedSteps(prev => prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
      <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
      <h3 className="text-xl font-bold text-gray-800 mb-6">{t('addSale')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {isCustomerFlagged && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 animate-pulse">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <p className="text-sm font-black text-red-700 uppercase">Scam Alert!</p>
              <p className="text-xs text-red-600">This customer has been flagged for fake alerts.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectShop')}</label>
            <select required value={shopId} onChange={(e) => { setShopId(e.target.value); setSelectedItems([]); }} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all">
              <option value="">{t('selectShop')}...</option>
              {shops?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">{t('customerName')}</label>
              <button type="button" onClick={() => setIsNewShopCustomer(!isNewCustomer)} className="text-[10px] font-bold text-kwari-green flex items-center space-x-1 uppercase"><UserPlus size={12} /><span>{isNewCustomer ? 'Select Existing' : 'New Customer'}</span></button>
            </div>
            {!isNewCustomer ? (
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all">
                <option value="">Select Customer...</option>
                {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <div className="relative">
                  <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none pr-12" placeholder="Full Name" />
                  <button type="button" onClick={startListening} className={cn("absolute right-2 bottom-2 p-2 rounded-full", isListening ? "bg-red-100 text-red-600 animate-pulse" : "text-gray-400 hover:bg-gray-100")}>
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>
                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Phone (Optional)" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">{t('inventory')}</label>
            <button type="button" onClick={() => setIsScanning(!isScanning)} className={cn("p-2 rounded-lg transition-colors", isScanning ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600")}><Scan size={18} /></button>
          </div>
          {isScanning && <div id="reader" className="w-full overflow-hidden rounded-xl border border-gray-200"></div>}
          <div className="flex space-x-2">
            <select disabled={!shopId} onChange={(e) => e.target.value && addItem(parseInt(e.target.value))} value="" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none">
              <option value="">{shopId ? `${t('add')} ${t('inventory')}...` : 'Select shop first'}</option>
              {inventory?.filter(p => p.quantity > 0).map(p => <option key={p.id} value={p.id}>{p.name} {p.isRemnant ? '(Remnant)' : ''} (₦{p.pricePerUnit})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1"><p className="text-sm font-bold text-gray-800">{item.name}</p><p className="text-xs text-gray-500">₦{item.price} per unit</p></div>
                <div className="flex items-center space-x-3">
                  <input type="number" value={item.quantity} onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value))} className="w-16 p-1 text-center bg-white border border-gray-200 rounded" min="1" />
                  <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}
          </div>
          {selectedItems.length > 0 && <div className="p-3 bg-kwari-green/5 rounded-lg border border-kwari-green/10 flex justify-between items-center"><span className="text-sm font-bold text-gray-600">{t('amount')}</span><span className="text-lg font-black text-kwari-green">₦ {totalAmount.toLocaleString()}</span></div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectBroker')}</label>
            <select value={brokerId} onChange={(e) => setBrokerId(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none">
              <option value="">{t('selectBroker')}</option>
              {brokers?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('commission')}</label>
            <input type="number" value={laadaAmount} onChange={(e) => setLaadaAmount(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('status')}</label>
            <div className="grid grid-cols-3 gap-2">
              {(['paid', 'credit', 'salo'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} className={cn("p-3 text-xs font-bold rounded-lg border transition-all", status === s ? "bg-kwari-green text-white border-kwari-green" : "bg-white text-gray-600 border-gray-200")}>{t(s)}</button>
              ))}
            </div>
          </div>
          {status === 'paid' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMethod('cash')} className={cn("p-3 text-xs font-bold rounded-lg border transition-all", paymentMethod === 'cash' ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200")}>Cash</button>
                <button type="button" onClick={() => setPaymentMethod('transfer')} className={cn("p-3 text-xs font-bold rounded-lg border transition-all", paymentMethod === 'transfer' ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}>Transfer</button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 flex space-x-3">
          <button type="button" onClick={onCancel} className="flex-1 p-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">{isSubmitting ? t('recording') : t('save')}</button>
        </div>
      </form>

      {/* Remnant Modal */}
      {showRemnantModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-2xl mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900">Any Remnants?</h2>
              <p className="text-gray-500 text-sm">Did you cut a bundle? Track the leftover "Rage-rage".</p>
            </div>

            <div className="space-y-4">
              {selectedItems.filter(i => {
                const p = inventory?.find(inv => inv.id === i.productId);
                return p?.unit === 'bundle' || p?.unit === 'bale';
              }).map(item => (
                <div key={item.productId} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">{item.name}</p>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Qty"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val > 0) {
                          setRemnants(prev => [...prev.filter(r => r.productId !== item.productId), { productId: item.productId, quantity: val, unit: 'yards' }]);
                        }
                      }}
                      className="flex-1 p-2 bg-white border border-gray-200 rounded-xl outline-none text-sm font-bold"
                    />
                    <select 
                      onChange={(e) => {
                        setRemnants(prev => prev.map(r => r.productId === item.productId ? { ...r, unit: e.target.value as any } : r));
                      }}
                      className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold"
                    >
                      <option value="yards">Yards</option>
                      <option value="meters">Meters</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button onClick={() => { setRemnants([]); setShowRemnantModal(false); handleSubmit(new Event('submit') as any); }} className="flex-1 py-4 font-bold text-gray-400">None</button>
              <button onClick={() => { setShowRemnantModal(false); handleSubmit(new Event('submit') as any); }} className="flex-[2] py-4 bg-kwari-green text-white font-black rounded-2xl shadow-lg">Save & Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Fake Alert Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-8 bg-blue-600 text-white text-center">
              <ShieldCheck size={48} className="mx-auto mb-4" />
              <h2 className="text-2xl font-black">Verify Transfer</h2>
              <p className="text-blue-100 text-sm mt-1">Don't fall for fake alerts!</p>
            </div>
            <div className="p-8 space-y-4">
              {[
                { id: 1, label: 'Check actual Bank Balance (Not SMS)' },
                { id: 2, label: 'Confirm Sender Name matches' },
                { id: 3, label: 'Wait for App Push Notification' }
              ].map(step => (
                <button key={step.id} onClick={() => toggleStep(step.id)} className={cn("w-full flex items-center space-x-3 p-4 rounded-2xl border-2 transition-all text-left", verifiedSteps.includes(step.id) ? "border-kwari-green bg-green-50 text-kwari-green" : "border-gray-100 bg-gray-50 text-gray-500")}>
                  {verifiedSteps.includes(step.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                  <span className="font-bold text-sm">{step.label}</span>
                </button>
              ))}
            </div>
            <div className="p-8 pt-0 flex space-x-3">
              <button onClick={() => setShowVerifyModal(false)} className="flex-1 py-4 font-bold text-gray-400">Back</button>
              <button disabled={verifiedSteps.length < 3} onClick={handleSubmit} className="flex-[2] py-4 bg-kwari-green text-white font-black rounded-2xl shadow-lg shadow-green-100 disabled:opacity-50 transition-all">Complete Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
