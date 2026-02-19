import { useState, type FormEvent, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addSale, db, addCustomer, type Dealer, type Bundle, type Yard, type InventoryItem } from '../lib/db';
import { X, Trash2, UserPlus, Scan, AlertTriangle, ShieldCheck, CheckSquare, Square, Mic, MicOff, ChevronRight, Package, Layers, Ruler, Plus, Minus } from 'lucide-react';
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
  sourceType: 'yard' | 'bundle' | 'dealer';
  sourceId: number;
  color?: string;
  image?: string;
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

  const [viewMode, setViewMode] = useState<'list' | 'dealer'>('dealer');
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);

  const inventory = useLiveQuery(
    () => shopId ? db.inventory.where('shopId').equals(parseInt(shopId)).toArray() : [],
    [shopId]
  );

  const dealers = useLiveQuery(
    () => shopId ? db.dealers.where('shopId').equals(parseInt(shopId)).toArray() : [],
    [shopId]
  );

  const bundles = useLiveQuery(
    () => db.bundles.toArray(),
    []
  );

  const yards = useLiveQuery(
    () => db.yards.toArray(),
    []
  );

  const filteredBundles = useMemo(() => {
    if (!selectedDealerId || !bundles) return [];
    return bundles.filter(b => b.dealerId === selectedDealerId);
  }, [selectedDealerId, bundles]);

  const filteredYards = useMemo(() => {
    if (!selectedBundleId || !yards) return [];
    return yards.filter(y => y.bundleId === selectedBundleId);
  }, [selectedBundleId, yards]);

  const getInventoryItemForYard = (yardId: number): InventoryItem | undefined => {
    return inventory?.find(i => i.parentId === yardId && i.unit === 'yards');
  };

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
    setSelectedItems([...selectedItems, { 
      productId, 
      quantity: initialQty, 
      price: salePrice, 
      purchasePrice, 
      name: product.name,
      sourceType: 'yard',
      sourceId: productId
    }]);
  };

  const addYardToSale = (yard: Yard, quantity?: number) => {
    const invItem = getInventoryItemForYard(yard.id!);
    if (!invItem) return;
    const existingIndex = selectedItems.findIndex(i => i.sourceId === yard.id && i.sourceType === 'yard');
    const qty = quantity || 1;
    if (existingIndex > -1) {
      updateItemQuantity(existingIndex, selectedItems[existingIndex].quantity + qty);
      return;
    }
    setSelectedItems(prev => [...prev, {
      productId: invItem.id!,
      quantity: qty,
      price: yard.priceSell,
      purchasePrice: yard.priceBought,
      name: yard.name,
      sourceType: 'yard',
      sourceId: yard.id!,
      color: yard.color,
      image: yard.image
    }]);
  };

  const addBundleToSale = (bundle: Bundle) => {
    const bundleYards = yards?.filter(y => y.bundleId === bundle.id) || [];
    bundleYards.forEach(yard => {
      const invItem = getInventoryItemForYard(yard.id!);
      if (invItem && invItem.quantity > 0) {
        const existingIndex = selectedItems.findIndex(i => i.sourceId === yard.id && i.sourceType === 'yard');
        if (existingIndex > -1) {
          updateItemQuantity(existingIndex, selectedItems[existingIndex].quantity + yard.quantity);
        } else {
          setSelectedItems(prev => [...prev, {
            productId: invItem.id!,
            quantity: yard.quantity,
            price: yard.priceSell,
            purchasePrice: yard.priceBought,
            name: yard.name,
            sourceType: 'yard',
            sourceId: yard.id!,
            color: yard.color
          }]);
        }
      }
    });
  };

  const addDealerToSale = (dealer: Dealer) => {
    const dealerBundles = bundles?.filter(b => b.dealerId === dealer.id) || [];
    dealerBundles.forEach(bundle => {
      addBundleToSale(bundle);
    });
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

  useEffect(() => {
    if (shopId) {
      setSelectedDealerId(null);
      setSelectedBundleId(null);
      setSelectedItems([]);
    }
  }, [shopId]);

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

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative max-h-[90vh] overflow-y-auto">
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
            <label className="block text-sm font-medium text-gray-700">Select Items to Sell</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setViewMode('dealer')} className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'dealer' ? 'bg-kwari-green text-white' : 'bg-gray-100 text-gray-600')}>Dealer View</button>
              <button type="button" onClick={() => setViewMode('list')} className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-all", viewMode === 'list' ? 'bg-kwari-green text-white' : 'bg-gray-100 text-gray-600')}>List View</button>
              <button type="button" onClick={() => setIsScanning(!isScanning)} className={cn("p-2 rounded-lg transition-colors", isScanning ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600")}><Scan size={18} /></button>
            </div>
          </div>

          {isScanning && <div id="reader" className="w-full overflow-hidden rounded-xl border border-gray-200"></div>}

          {viewMode === 'list' && (
            <div className="flex space-x-2">
              <select disabled={!shopId} onChange={(e) => e.target.value && addItem(parseInt(e.target.value))} value="" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none">
                <option value="">{shopId ? `${t('add')} ${t('inventory')}...` : 'Select shop first'}</option>
                {inventory?.filter(p => p.quantity > 0).map(p => <option key={p.id} value={p.id}>{p.name} {p.isRemnant ? '(Remnant)' : ''} ({formatCurrency(p.pricePerUnit)}/unit - {p.quantity} available)</option>)}
              </select>
            </div>
          )}

          {viewMode === 'dealer' && shopId && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 min-h-[200px]">
              {!selectedDealerId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <Package size={18} />
                      Select a Dealer
                    </h4>
                    <span className="text-xs text-gray-500">{dealers?.length || 0} dealers</span>
                  </div>
                  {dealers?.map((dealer) => {
                    const dealerBundles = bundles?.filter(b => b.dealerId === dealer.id) || [];
                    const totalYards = dealerBundles.reduce((sum, b) => {
                      const bundleYards = yards?.filter(y => y.bundleId === b.id) || [];
                      return sum + bundleYards.reduce((s, y) => s + y.quantity, 0);
                    }, 0);
                    return (
                      <div
                        key={dealer.id}
                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-kwari-green transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-800">{dealer.name}</p>
                              <span className="text-[10px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded">{dealer.quantity} bundles</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>Buy: {formatCurrency(dealer.priceBought)}</span>
                              <span>Sell: {formatCurrency(dealer.priceSell)}</span>
                              <span>{totalYards} yards total</span>
                            </div>
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {dealerBundles.slice(0, 6).map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-block w-5 h-5 rounded-full border"
                                  style={{ backgroundColor: b.color }}
                                  title={b.color}
                                />
                              ))}
                              {dealerBundles.length > 6 && (
                                <span className="text-[10px] text-gray-400 self-center">+{dealerBundles.length - 6}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedDealerId(dealer.id!)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-200 transition-all flex items-center gap-1"
                            >
                              View <ChevronRight size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => addDealerToSale(dealer)}
                              className="px-4 py-2 bg-kwari-green text-white font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all"
                            >
                              Sell All
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {(!dealers || dealers.length === 0) && (
                    <p className="text-center text-gray-400 py-8">No dealers found for this shop.</p>
                  )}
                </div>
              )}

              {selectedDealerId && !selectedBundleId && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDealerId(null)}
                    className="text-kwari-green font-bold text-sm flex items-center gap-1"
                  >
                    ← Back to Dealers
                  </button>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <Layers size={18} />
                      {dealers?.find(d => d.id === selectedDealerId)?.name} - Bundles
                    </h4>
                  </div>
                  {filteredBundles.map((bundle) => {
                    const bundleYards = yards?.filter(y => y.bundleId === bundle.id) || [];
                    const totalYards = bundleYards.reduce((sum, y) => sum + y.quantity, 0);
                    return (
                      <div
                        key={bundle.id}
                        className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-kwari-green transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {bundle.image && (
                              <img src={bundle.image} alt="" className="w-14 h-14 rounded-lg object-cover border" />
                            )}
                            <div
                              className="w-14 h-14 rounded-lg border flex items-center justify-center text-white font-black text-xs"
                              style={{ backgroundColor: bundle.color }}
                            >
                              {bundle.color}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">Bundle</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{bundleYards.length} yards</span>
                                <span>•</span>
                                <span>{totalYards} qty total</span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                <span>Buy: {formatCurrency(bundle.priceBought)}</span>
                                <span>Sell: {formatCurrency(bundle.priceSell)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedBundleId(bundle.id!)}
                              className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-200 transition-all flex items-center gap-1"
                            >
                              View Yards <ChevronRight size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => addBundleToSale(bundle)}
                              className="px-4 py-2 bg-kwari-green text-white font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all"
                            >
                              Sell Bundle
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredBundles.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No bundles found for this dealer.</p>
                  )}
                </div>
              )}

              {selectedDealerId && selectedBundleId && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBundleId(null)}
                    className="text-kwari-green font-bold text-sm flex items-center gap-1"
                  >
                    ← Back to Bundles
                  </button>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                      <Ruler size={18} />
                      {dealers?.find(d => d.id === selectedDealerId)?.name} - Yards
                    </h4>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-6 h-6 rounded-full border"
                        style={{ backgroundColor: bundles?.find(b => b.id === selectedBundleId)?.color }}
                      />
                      <span className="text-xs font-bold text-gray-500">{bundles?.find(b => b.id === selectedBundleId)?.color}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredYards.map((yard) => {
                      const invItem = getInventoryItemForYard(yard.id!);
                      const availableQty = invItem?.quantity || 0;
                      const isInCart = selectedItems.some(i => i.sourceId === yard.id && i.sourceType === 'yard');
                      const cartItem = selectedItems.find(i => i.sourceId === yard.id && i.sourceType === 'yard');
                      return (
                        <div
                          key={yard.id}
                          className={cn(
                            "bg-white p-4 rounded-xl border shadow-sm transition-all",
                            isInCart ? "border-kwari-green ring-2 ring-kwari-green/20" : "border-gray-100 hover:border-kwari-green"
                          )}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {yard.image && (
                              <img src={yard.image} alt="" className="w-12 h-12 rounded-lg object-cover border" />
                            )}
                            <div
                              className="w-12 h-12 rounded-lg border flex items-center justify-center"
                              style={{ backgroundColor: yard.color }}
                            />
                            <div className="flex-1">
                              <p className="font-bold text-gray-800">{yard.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="text-kwari-green font-bold">{availableQty} available</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>Buy: {formatCurrency(yard.priceBought)}/unit</span>
                            <span className="font-bold text-gray-800">Sell: {formatCurrency(yard.priceSell)}/unit</span>
                          </div>
                          {availableQty > 0 ? (
                            <div className="flex items-center gap-2">
                              {isInCart && cartItem ? (
                                <div className="flex items-center gap-2 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (cartItem.quantity > 1) {
                                        updateItemQuantity(selectedItems.indexOf(cartItem), cartItem.quantity - 1);
                                      } else {
                                        removeItem(selectedItems.indexOf(cartItem));
                                      }
                                    }}
                                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                                  >
                                    <Minus size={14} />
                                  </button>
                                  <span className="font-bold text-gray-800 w-12 text-center">{cartItem.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (cartItem.quantity < availableQty) {
                                        updateItemQuantity(selectedItems.indexOf(cartItem), cartItem.quantity + 1);
                                      }
                                    }}
                                    className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                                  >
                                    <Plus size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addYardToSale(yard, availableQty)}
                                    className="flex-1 py-2 bg-kwari-green/10 text-kwari-green font-bold text-xs rounded-lg hover:bg-kwari-green/20 transition-all"
                                  >
                                    Sell All ({availableQty})
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => addYardToSale(yard, 1)}
                                    className="flex-1 py-2 bg-kwari-green text-white font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all"
                                  >
                                    Add to Sale
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => addYardToSale(yard, availableQty)}
                                    className="py-2 px-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-lg hover:bg-gray-200 transition-all"
                                  >
                                    All ({availableQty})
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="text-center text-xs text-red-500 font-bold py-2">Out of Stock</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {filteredYards.length === 0 && (
                    <p className="text-center text-gray-400 py-8">No yards found for this bundle.</p>
                  )}
                </div>
              )}

              {!shopId && (
                <p className="text-center text-gray-400 py-8">Select a shop to view dealers.</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-800 text-sm">Selected Items ({selectedItems.length})</h4>
          {selectedItems.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 flex-1">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded-lg object-cover border" />
                    ) : item.color ? (
                      <span className="w-8 h-8 rounded-lg border" style={{ backgroundColor: item.color }} />
                    ) : null}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.price)}/unit × {item.quantity} = {formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value) || 1)} 
                      className="w-16 p-1 text-center bg-white border border-gray-200 rounded" 
                      min="1" 
                    />
                    <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No items selected. Use the view above to add items.</p>
          )}
          {selectedItems.length > 0 && (
            <div className="p-3 bg-kwari-green/5 rounded-lg border border-kwari-green/10 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">{t('amount')}</span>
              <span className="text-lg font-black text-kwari-green">{formatCurrency(totalAmount)}</span>
            </div>
          )}
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
          <button type="submit" disabled={isSubmitting || selectedItems.length === 0} className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50">{isSubmitting ? t('recording') : t('save')}</button>
        </div>
      </form>

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
