import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Store, Plus, Trash2, LogOut, Download, Table, MapPin, Share2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { exportToCSV } from '../utils/exportData';
import { shareDigitalCard } from '../utils/whatsapp';

export function SettingsView() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const shops = useLiveQuery(() => db.shops.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [building, setBuilding] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [landmark, setLandmark] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [isSaving, setIsSubmitting] = useState(false);
  const [showAddShop, setShowAddShop] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) return;
    
    setIsSubmitting(true);
    try {
      const shopData = { 
        name, 
        address, 
        building,
        block,
        floor,
        landmark,
        logo: logo || undefined,
        updatedAt: Date.now() 
      };
      const id = await db.shops.add(shopData);
      
      await db.sync_queue.add({
        action: 'CREATE',
        collection: 'shops',
        payload: { ...shopData, id },
        timestamp: Date.now()
      });

      setName('');
      setAddress('');
      setBuilding('');
      setBlock('');
      setFloor('');
      setLandmark('');
      setLogo(null);
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
    }
  };

  const handleExportAll = () => {
    if (sales) exportToCSV(sales, 'KwariBook_Sales');
    if (inventory) exportToCSV(inventory, 'KwariBook_Inventory');
    if (expenses) exportToCSV(expenses, 'KwariBook_Expenses');
  };

  const handleShareCard = (shop: any) => {
    const topItems = inventory?.filter(i => i.shopId === shop.id).slice(0, 3) || [];
    shareDigitalCard(shop, topItems);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      {/* Shops List */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-kwari-green/10 text-kwari-green rounded-2xl">
              <Store size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{t('shopProfile')}</h3>
          </div>
          {!showAddShop && (user?.role === 'owner' || user?.role === 'manager') && (
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
            <div className="flex flex-col items-center mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Shop Logo</label>
              <div 
                onClick={() => document.getElementById('logo-input')?.click()}
                className="w-20 h-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-50"
              >
                {logo ? <img src={logo} className="w-full h-full object-contain" /> : <Plus className="text-gray-400" />}
              </div>
              <input id="logo-input" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">{t('shopName')}</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-kwari-green"
                  placeholder="E.g. Sani Textiles"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Building Name</label>
                <input
                  type="text" value={building} onChange={(e) => setBuilding(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-kwari-green"
                  placeholder="E.g. Gidan Inuwa Wada"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase">Block</label>
                <input type="text" value={block} onChange={(e) => setBlock(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-xs" placeholder="B" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase">Floor</label>
                <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-xs" placeholder="2nd" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase">Landmark</label>
                <input type="text" value={landmark} onChange={(e) => setLandmark(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-xs" placeholder="Near Mosque" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Full Address (Legacy)</label>
              <input
                type="text" required value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-kwari-green"
                placeholder="E.g. Block B, Kwari Market"
              />
            </div>

            <div className="flex space-x-2">
              <button type="button" onClick={() => setShowAddShop(false)} className="flex-1 p-3 bg-white text-gray-500 font-bold rounded-xl border border-gray-200">{t('cancel')}</button>
              <button type="submit" disabled={isSaving} className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-xl shadow-md">{isSaving ? 'Saving...' : 'Add'}</button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {shops?.map(shop => (
            <div key={shop.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  {shop.logo ? (
                    <img src={shop.logo} className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-gray-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-kwari-green flex items-center justify-center text-white font-bold">{shop.name.charAt(0)}</div>
                  )}
                  <div>
                    <p className="font-bold text-gray-800">{shop.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{shop.address}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => handleShareCard(shop)}
                    className="p-2 text-kwari-green hover:bg-green-100 rounded-lg transition-colors"
                    title="Share Business Card"
                  >
                    <Share2 size={18} />
                  </button>
                  {(user?.role === 'owner' || user?.role === 'manager') && (
                    <button onClick={() => shop.id && deleteShop(shop.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-kwari-green bg-green-50/50 p-2 rounded-lg">
                <MapPin size={12} />
                <span>{shop.building ? `${shop.building}, ` : ''}{shop.block ? `Block ${shop.block}, ` : ''}{shop.floor ? `${shop.floor} Floor, ` : ''}{shop.landmark ? `(${shop.landmark})` : ''}</span>
              </div>
            </div>
          ))}
          {(!shops || shops.length === 0) && (
            <p className="text-center text-gray-400 text-sm py-4">No shops added yet.</p>
          )}
        </div>
      </div>

      {(user?.role === 'owner' || user?.role === 'manager') && (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
              <Table size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Data Backup</h3>
          </div>
          <p className="text-sm text-gray-500 mb-6">Download your data as CSV files to open in Excel.</p>
          <button 
            onClick={handleExportAll}
            className="w-full p-4 bg-gray-900 text-white font-black rounded-2xl shadow-lg flex items-center justify-center space-x-2 hover:bg-black transition-all"
          >
            <Download size={20} />
            <span>Export all to Excel (.csv)</span>
          </button>
        </div>
      )}

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
