import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { addSale, db, addCustomer } from '../lib/db';
import { X, Trash2, Mic, MicOff, UserPlus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

interface AddSaleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface SelectedItem {
  productId: number;
  quantity: number;
  price: number;
  name: string;
}

export function AddSaleForm({ onSuccess, onCancel }: AddSaleFormProps) {
  const { t } = useTranslation();
  const shops = useLiveQuery(() => db.shops.toArray());
  const brokers = useLiveQuery(() => db.brokers.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState<string>('');
  const [status, setStatus] = useState<'paid' | 'credit' | 'salo'>('paid');
  const [shopId, setShopId] = useState<string>('');
  const [brokerId, setBrokerId] = useState<string>('');
  const [laadaAmount, setLaadaAmount] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isNewCustomer, setIsNewShopCustomer] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');

  // Fetch inventory filtered by selected shop
  const inventory = useLiveQuery(
    () => shopId ? db.inventory.where('shopId').equals(parseInt(shopId)).toArray() : [],
    [shopId]
  );

  const totalAmount = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addItem = (productId: number) => {
    const product = inventory?.find(p => p.id === productId);
    if (!product) return;
    
    setSelectedItems([...selectedItems, {
      productId,
      quantity: 1,
      price: product.pricePerUnit,
      name: product.name
    }]);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const updateItemQuantity = (index: number, qty: number) => {
    const newItems = [...selectedItems];
    newItems[index].quantity = qty;
    setSelectedItems(newItems);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice recognition not supported in this browser.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'ha-NG';
    recognition.continuous = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (!customerName) setCustomerName(transcript);
    };

    recognition.start();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!customerName && !customerId) || selectedItems.length === 0 || !shopId) return;

    setIsSubmitting(true);
    try {
      let finalCustomerId = customerId ? parseInt(customerId) : undefined;
      let finalCustomerName = customerName;

      // Handle new customer creation
      if (isNewCustomer && customerName) {
        finalCustomerId = await addCustomer({
          name: customerName,
          phone: customerPhone,
        });
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
      }, selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity, name: i.name })));
      onSuccess();
    } catch (error) {
      console.error('Failed to add sale:', error);
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
      
      <h3 className="text-xl font-bold text-gray-800 mb-6">{t('addSale')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('selectShop')}
            </label>
            <select
              required
              value={shopId}
              onChange={(e) => {
                setShopId(e.target.value);
                setSelectedItems([]); 
              }}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
            >
              <option value="">{t('selectShop')}...</option>
              {shops?.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {t('customerName')}
              </label>
              <button 
                type="button"
                onClick={() => setIsNewShopCustomer(!isNewCustomer)}
                className="text-[10px] font-bold text-kwari-green flex items-center space-x-1 uppercase"
              >
                <UserPlus size={12} />
                <span>{isNewCustomer ? 'Select Existing' : 'New Customer'}</span>
              </button>
            </div>

            {!isNewCustomer ? (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
              >
                <option value="">Select Customer...</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all pr-12"
                    placeholder="Full Name"
                  />
                  <button 
                    type="button"
                    onClick={startListening}
                    className={`absolute right-2 bottom-2 p-2 rounded-full transition-colors ${
                      isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                </div>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green outline-none transition-all"
                  placeholder="Phone (Optional)"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">{t('inventory')}</label>
          <div className="flex space-x-2">
            <select 
              disabled={!shopId}
              onChange={(e) => e.target.value && addItem(parseInt(e.target.value))}
              value=""
              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none disabled:opacity-50"
            >
              <option value="">{shopId ? `${t('add')} ${t('inventory')}...` : 'Please select a shop first'}</option>
              {inventory?.filter(p => p.quantity > 0).map(p => (
                <option key={p.id} value={p.id}>{p.name} (₦{p.pricePerUnit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {selectedItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">₦{item.price} per unit</p>
                </div>
                <div className="flex items-center space-x-3">
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => updateItemQuantity(index, parseFloat(e.target.value))}
                    className="w-16 p-1 text-center bg-white border border-gray-200 rounded"
                    min="1"
                  />
                  <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedItems.length > 0 && (
            <div className="p-3 bg-kwari-green/5 rounded-lg border border-kwari-green/10 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">{t('amount')}</span>
              <span className="text-lg font-black text-kwari-green">₦ {totalAmount.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('selectBroker')}
            </label>
            <select
              value={brokerId}
              onChange={(e) => setBrokerId(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
            >
              <option value="">{t('selectBroker')}</option>
              {brokers?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('commission')} (La'ada)
            </label>
            <input
              type="number"
              value={laadaAmount}
              onChange={(e) => setLaadaAmount(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('status')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(['paid', 'credit', 'salo'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`p-3 text-sm font-medium rounded-lg border transition-all ${
                  status === s
                    ? 'bg-kwari-green text-white border-kwari-green'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t(s)}
              </button>
            ))}
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
