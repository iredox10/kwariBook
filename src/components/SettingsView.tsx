import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Store, Plus, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function SettingsView() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const shops = useLiveQuery(() => db.shops.toArray());
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSubmitting] = useState(false);
  const [showAddShop, setShowAddShop] = useState(false);

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;
    
    setIsSubmitting(true);
    try {
      const id = await db.shops.add({ 
        name, 
        address, 
        updatedAt: Date.now() 
      });
      
      await db.sync_queue.add({
        action: 'CREATE',
        collection: 'shops',
        payload: { id, name, address, updatedAt: Date.now() },
        timestamp: Date.now()
      });

      setName('');
      setAddress('');
      setShowAddShop(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteShop = async (id: number) => {
    if (confirm('Are you sure? This will not delete inventory linked to this shop but might cause issues.')) {
      await db.shops.delete(id);
      // Logic to queue delete...
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Shops List */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-kwari-green/10 text-kwari-green rounded-2xl">
              <Store size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{t('shopProfile')}</h3>
          </div>
          {!showAddShop && (
            <button 
              onClick={() => setShowAddShop(true)}
              className="p-2 bg-kwari-green text-white rounded-xl flex items-center space-x-1 font-bold text-sm"
            >
              <Plus size={18} />
              <span>Add Shop</span>
            </button>
          )}
        </div>

        {showAddShop && (
          <form onSubmit={handleAddShop} className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('shopName')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-kwari-green"
                placeholder="E.g. Sani Textiles Warehouse"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">{t('marketAddress')}</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-kwari-green"
                placeholder="E.g. Block B, Kwari Market"
              />
            </div>
            <div className="flex space-x-2">
              <button 
                type="button" 
                onClick={() => setShowAddShop(false)}
                className="flex-1 p-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-200"
              >
                {t('cancel')}
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-xl shadow-md"
              >
                {isSaving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {shops?.map(shop => (
            <div key={shop.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="font-bold text-gray-800">{shop.name}</p>
                <p className="text-xs text-gray-500">{shop.address}</p>
              </div>
              <button 
                onClick={() => shop.id && deleteShop(shop.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {(!shops || shops.length === 0) && (
            <p className="text-center text-gray-400 text-sm py-4">No shops added yet.</p>
          )}
        </div>
      </div>

      <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
        <h4 className="text-red-600 font-bold mb-4 italic">Danger Zone</h4>
        <button 
          onClick={logout}
          className="w-full p-4 bg-white text-red-600 border border-red-200 font-bold rounded-2xl flex items-center justify-center space-x-2 hover:bg-red-50 transition-all"
        >
          <LogOut size={20} />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );
}
