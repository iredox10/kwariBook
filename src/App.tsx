import { useTranslation } from 'react-i18next';
import { 
  ShoppingBag, 
  Package, 
  Users, 
  Wallet, 
  Languages, 
  Plus, 
  CloudOff, 
  RefreshCw, 
  Calculator, 
  Share2,
  Bell,
  LogOut,
  User,
  ArrowRightLeft,
  Store,
  Eye,
  EyeOff,
  Star,
  RotateCcw,
  FileText,
  Search,
  Mic,
  Moon,
  Printer,
  ShieldAlert,
  Trash2,
  TrendingDown
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AddSaleForm } from './components/AddSaleForm';
import { AddInventoryForm } from './components/AddInventoryForm';
import { AddBrokerForm } from './components/AddBrokerForm';
import { AddExpenseForm } from './components/AddExpenseForm';
import { StockTransferForm } from './components/StockTransferForm';
import { DailyReconciliation } from './components/DailyReconciliation';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { CalculatorView } from './components/CalculatorView';
import { ReportsView } from './components/ReportsView';
import { ExpensesView } from './components/ExpensesView';
import { SuppliersView } from './components/SuppliersView';
import { SettingsView } from './components/SettingsView';
import { MarketLevyView } from './components/MarketLevyView';
import { ManualView } from './components/ManualView';
import { LoginView } from './components/LoginView';
import { StaffView } from './components/StaffView';
import { useSyncManager } from './hooks/useSyncManager';
import { useAuth } from './hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, reverseSale, addDebtPayment, flagCustomer } from './lib/db';
import { getNavItemsForRole, getMobileNavItemsForRole, FEATURES } from './lib/navigation';
import { sendDebtReminder, shareProfessionalReceipt, shareWaybill, shareNewArrivals } from './utils/whatsapp';
import { generateCustomerStatement } from './utils/reportGenerator';
import { account } from './api/appwrite';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddSale, setShowAddSale] = useState(false);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showEOD, setShowEOD] = useState(false);
  const [showRemnantsOnly, setShowRemnantsOnly] = useState(false);
  const [printItem, setPrintItem] = useState<any>(null);
  const [verifyingLink, setVerifyingLink] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [isSearchingVoice, setIsSearchingVoice] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);
  const [inventoryViewMode, setInventoryViewMode] = useState<'list' | 'dealer'>('list');
  
  const { user, loading: authLoading, checkUser, logout } = useAuth();
  const { isOnline, isSyncing, pullFromCloud } = useSyncManager();

  useEffect(() => {
    if (user?.appwriteId && isOnline) {
      pullFromCloud();
    }
  }, [user?.appwriteId, isOnline, pullFromCloud]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const secret = urlParams.get('secret');
    const userId = urlParams.get('userId');
    if (secret && userId) handleMagicLink(userId, secret);
  }, []);

  async function handleMagicLink(userId: string, secret: string) {
    setVerifyingLink(true);
    try {
      await account.updateMagicURLSession(userId, secret);
      window.history.replaceState({}, document.title, window.location.pathname);
      await checkUser();
    } catch (error) {
      console.error('Magic link verification failed:', error);
      alert('Login link expired or invalid.');
    } finally {
      setVerifyingLink(false);
    }
  }

  const startInventoryVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'ha-NG';
    recognition.onstart = () => setIsSearchingVoice(true);
    recognition.onend = () => setIsSearchingVoice(false);
    recognition.onresult = (event: any) => {
      setInventorySearch(event.results[0][0].transcript);
    };
    recognition.start();
  };
  
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const bundles = useLiveQuery(() => db.bundles.toArray());
  const dealers = useLiveQuery(() => db.dealers.toArray());
  const yards = useLiveQuery(() => db.yards.toArray());
  const shops = useLiveQuery(() => db.shops.toArray());
  const handleFlashSale = async () => {
    const discount = prompt("Enter discount percentage for all remnants (e.g. 50):");
    if (discount) {
      const pct = parseFloat(discount) / 100;
      const r_items = inventory?.filter(i => i.isRemnant) || [];
      for (const item of r_items) {
        await db.inventory.update(item.id!, {
          pricePerUnit: Math.round(item.pricePerUnit * (1 - pct)),
          updatedAt: Date.now()
        });
      }
      alert(`Applied ${discount}% discount to ${r_items.length} remnants.`);
    }
  };

  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().limit(50).toArray());
  const debtors = useLiveQuery(() => db.sales.where('status').anyOf(['credit', 'salo']).filter(s => !s.isReversed).toArray());
  const debtPayments = useLiveQuery(() => db.debt_payments.toArray());
  const brokers = useLiveQuery(() => db.brokers.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const transfers = useLiveQuery(() => db.transfers.orderBy('date').reverse().limit(10).toArray());
  const pendingSyncCount = useLiveQuery(() => db.sync_queue.count());

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                           item.category.toLowerCase().includes(inventorySearch.toLowerCase());
      if (showRemnantsOnly) return matchesSearch && item.isRemnant;
      return matchesSearch && !item.isRemnant;
    });
  }, [inventory, inventorySearch, showRemnantsOnly]);
  
  const totalDebt = useMemo(() => {
    if (!debtors || !debtPayments) return 0;
    const totalOriginal = debtors.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const totalPayments = debtors.reduce((acc, sale) => {
      const p = debtPayments.filter(dp => dp.saleId === sale.id).reduce((sum, dp) => sum + dp.amount, 0);
      return acc + p;
    }, 0);
    return totalOriginal - totalPayments;
  }, [debtors, debtPayments]);

  const totalSalesAmount = useLiveQuery(async () => {
    const allSales = await db.sales.filter(s => !s.isReversed).toArray();
    return allSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  });

  const customerMetrics = useMemo(() => {
    if (!sales || !customers) return {};
    const metrics: Record<number, { total: number, paid: number, score: number }> = {};
    
    sales.filter(s => !s.isReversed).forEach(sale => {
      if (sale.customerId) {
        if (!metrics[sale.customerId]) metrics[sale.customerId] = { total: 0, paid: 0, score: 0 };
        metrics[sale.customerId].total += sale.totalAmount;
        if (sale.status === 'paid') metrics[sale.customerId].paid += sale.totalAmount;
      }
    });

    Object.keys(metrics).forEach(id => {
      const m = metrics[parseInt(id)];
      m.score = m.total > 0 ? (m.paid / m.total) * 100 : 0;
    });

    return metrics;
  }, [sales, customers]);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ha' : 'en');
  };

  const formatCurrency = (val: number) => {
    if (privacyMode) return '₦ ••••';
    return `₦ ${val.toLocaleString()}`;
  };

  const handleReverse = async (saleId: number) => {
    const reason = prompt(t('reversalReason'));
    if (reason && user) {
      await reverseSale(saleId, user.phone || user.email || 'Unknown', reason);
    }
  };

  const handleReportScam = async (phone: string) => {
    const reason = prompt("Describe the scam (e.g. Sent fake SMS alert):");
    if (reason && user) {
      await flagCustomer({
        phone,
        reason,
        reportedBy: user.phone || user.email || 'Unknown',
        date: new Date()
      });
      alert("Customer flagged. This will help other Alhajis stay safe!");
    }
  };

  const handleDebtPayment = async (saleId: number, currentRemaining: number) => {
    const amount = prompt(`Enter payment amount (Max: ₦${currentRemaining.toLocaleString()}):`);
    if (amount) {
      const val = parseFloat(amount);
      if (val > 0 && val <= currentRemaining) {
        await addDebtPayment(saleId, val);
      } else {
        alert('Invalid amount');
      }
    }
  };

  const navItems = useMemo(() => {
    return getNavItemsForRole(user?.role);
  }, [user?.role]);

  const mobileNavItems = useMemo(() => {
    return getMobileNavItemsForRole(user?.role);
  }, [user?.role]);

  if (authLoading || verifyingLink) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw size={48} className="text-kwari-green animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">
          {verifyingLink ? 'Verifying your login link...' : 'Loading KwariBook...'}
        </h2>
      </div>
    );
  }

  const isAuthEnabled = !!import.meta.env.VITE_APPWRITE_PROJECT_ID;
  if (isAuthEnabled && !user) return <LoginView onLoginSuccess={checkUser} />;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full left-0 top-0">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-kwari-green">{t('appName')}</h1>
        </div>
        
        {user && (
          <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
             <div className="bg-kwari-green text-white p-2 rounded-full">
                <User size={16} />
             </div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-xs font-bold text-gray-800 truncate">{user.phone || user.email || user.name}</p>
                 <div className="flex items-center space-x-2">
                   <span className="text-[8px] font-black uppercase bg-gray-100 px-1 rounded">{user.role?.replace('_', ' ') || 'Staff'}</span>
                   <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center space-x-1">
                     <LogOut size={10} />
                     <span>Logout</span>
                   </button>
                 </div>
              </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowEOD(false); }}
              className={cn(
                "flex items-center space-x-3 w-full p-2.5 rounded-xl transition-colors",
                activeTab === item.id && !showEOD
                  ? "bg-kwari-green text-white shadow-md shadow-green-100" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <item.icon size={18} />
              <span className="font-bold text-sm">{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>
        
        {/* Sync Status & Privacy */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
          {FEATURES.canTogglePrivacyMode(user?.role) && (
            <button 
              onClick={() => setPrivacyMode(!privacyMode)}
              className={cn(
                "flex items-center justify-between w-full p-2 rounded-lg text-xs font-bold transition-all",
                privacyMode ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-600"
              )}
            >
              <div className="flex items-center space-x-2">
                {privacyMode ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{t('alhajiMode')}</span>
              </div>
              <div className={cn("w-8 h-4 rounded-full relative transition-colors", privacyMode ? "bg-amber-500" : "bg-gray-400")}>
                 <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all", privacyMode ? "right-0.5" : "left-0.5")} />
              </div>
            </button>
          )}

          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>{isOnline ? 'Online' : 'Offline'}</span>
            {!isOnline && <CloudOff size={12} className="text-red-400" />}
          </div>
          {pendingSyncCount !== undefined && pendingSyncCount > 0 && (
            <div className="flex items-center space-x-2 text-kwari-gold">
              <RefreshCw size={12} className={cn(isSyncing && "animate-spin")} />
              <span className="text-[10px] font-black">{pendingSyncCount} {t('pendingSync')}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={toggleLanguage}
            className="flex items-center space-x-3 w-full p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Languages size={20} />
            <span className="font-medium">{i18n.language === 'en' ? 'Hausa' : 'English'}</span>
          </button>
        </div>
      </aside>

      {/* Header (Mobile & Desktop) */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center md:hidden">
        <h1 className="text-xl font-bold text-kwari-green">{t('appName')}</h1>
        <div className="flex items-center space-x-3">
          {FEATURES.canTogglePrivacyMode(user?.role) && (
            <button onClick={() => setPrivacyMode(!privacyMode)} className={cn("p-2 rounded-full", privacyMode ? "text-amber-600 bg-amber-50" : "text-gray-400")}>
              {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}
          {!isOnline && <CloudOff size={20} className="text-red-400" />}
          <button onClick={toggleLanguage} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
            <Languages size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{showEOD ? 'End of Day' : t(activeTab)}</h2>
              <p className="text-gray-500">Barka da zuwa KwariBook!</p>
            </div>
            {activeTab === 'sales' && !showAddSale && (
              <button 
                onClick={() => setShowAddSale(true)}
                className="bg-kwari-green text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-green-100 hover:bg-opacity-90 transition-all"
              >
                <Plus size={20} />
                <span>{t('add')}</span>
              </button>
            )}
            {activeTab === 'inventory' && !showAddInventory && !showTransfer && (
              <div className="flex space-x-2">
                <button 
                  onClick={() => shareNewArrivals(inventory?.slice(-5) || [])}
                  className="bg-amber-100 text-amber-700 border border-amber-200 p-3 rounded-xl flex items-center space-x-2 font-bold hover:bg-amber-200 transition-all"
                  title="Broadcast last 5 items"
                >
                  <Bell size={20} />
                  <span>Broadcast</span>
                </button>
                <button 
                  onClick={() => setShowRemnantsOnly(!showRemnantsOnly)} 
                  className={cn("p-3 rounded-xl flex items-center space-x-2 font-bold transition-all", showRemnantsOnly ? "bg-amber-600 text-white shadow-lg" : "bg-white text-amber-600 border border-amber-600")}
                >
                  <Trash2 size={20} />
                  <span>{showRemnantsOnly ? 'All Items' : 'Rage-rage'}</span>
                </button>
                {showRemnantsOnly && FEATURES.canEditInventory(user?.role) && (
                  <button 
                    onClick={handleFlashSale}
                    className="bg-red-600 text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-red-100 hover:bg-opacity-90 transition-all"
                  >
                    <TrendingDown size={20} />
                    <span>Flash Sale</span>
                  </button>
                )}
                {FEATURES.canAddInventory(user?.role) && (
                  <>
                    <button onClick={() => setShowTransfer(true)} className="bg-white text-kwari-green border border-kwari-green p-3 rounded-xl flex items-center space-x-2 font-bold hover:bg-green-50 transition-all">
                      <ArrowRightLeft size={20} />
                      <span>{t('transfer')}</span>
                    </button>
                    <button onClick={() => setShowAddInventory(true)} className="bg-kwari-green text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-green-100 hover:bg-opacity-90 transition-all">
                      <Plus size={20} />
                      <span>{t('add')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
            {activeTab === 'expenses' && !showAddExpense && FEATURES.canManageExpenses(user?.role) && (
              <button onClick={() => setShowAddExpense(true)} className="bg-kwari-red text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-red-100 hover:bg-opacity-90 transition-all">
                <Plus size={20} />
                <span>{t('add')}</span>
              </button>
            )}
          </div>

          {showEOD ? <DailyReconciliation /> : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {!shops || shops.length === 0 ? (
                    <div className="bg-kwari-green/10 p-8 rounded-3xl border-2 border-kwari-green border-dashed text-center">
                      <Store size={48} className="mx-auto text-kwari-green mb-4" />
                      <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to KwariBook!</h3>
                      <p className="text-gray-600 mb-6">To start recording sales, you first need to add your shop.</p>
                      {FEATURES.canManageShops(user?.role) && (
                        <button onClick={() => setActiveTab('settings')} className="bg-kwari-green text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-opacity-90 transition-all">
                          Set Up My Shop
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-gray-500 text-sm font-medium mb-4">{t('totalSales')}</h3>
                          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalSalesAmount || 0)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-gray-500 text-sm font-medium mb-4">{t('bashi')}</h3>
                          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalDebt)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                          <h3 className="text-gray-500 text-sm font-medium mb-4">{t('inventory')}</h3>
                          <p className="text-2xl font-bold text-gray-800">{inventory?.length || 0} {t('inventory')}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {FEATURES.canAddSale(user?.role) && (
                          <button onClick={() => { setActiveTab('sales'); setShowAddSale(true); }} className="p-4 bg-kwari-green text-white rounded-xl flex flex-col items-center justify-center space-y-2 shadow-md">
                            <Plus size={24} /> <span className="text-xs font-bold">{t('addSale')}</span>
                          </button>
                        )}
                        {FEATURES.canAddInventory(user?.role) && (
                          <button onClick={() => { setActiveTab('inventory'); setShowAddInventory(true); }} className="p-4 bg-white text-gray-700 border border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 transition-all">
                            <Package size={24} className="text-kwari-gold" /> <span className="text-xs font-bold">{t('addInventory')}</span>
                          </button>
                        )}
                        <button onClick={() => setShowEOD(true)} className="p-4 bg-gray-900 text-white rounded-xl flex flex-col items-center justify-center space-y-2 shadow-md">
                          <Moon size={24} className="text-kwari-green" /> <span className="text-xs font-bold">End of Day</span>
                        </button>
                        {FEATURES.canUseCalculators(user?.role) && (
                          <button onClick={() => setActiveTab('calculators')} className="p-4 bg-white text-gray-700 border border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 transition-all">
                            <Calculator size={24} className="text-blue-500" /> <span className="text-xs font-bold">{t('calculators')}</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4">{t('history')}</h3>
                        <div className="space-y-4">
                          {sales?.filter(s => !s.isReversed).slice(0, 10).map((sale) => (
                            <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div><p className="font-bold text-gray-800 text-sm">{sale.customerName}</p><p className="text-[10px] text-gray-400">{new Date(sale.date).toLocaleDateString()}</p></div>
                              <div className="text-right"><p className="font-bold text-kwari-green text-sm">{formatCurrency(sale.totalAmount)}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'sales' && (
                <div className="space-y-6">
                  {showAddSale ? <AddSaleForm onSuccess={() => setShowAddSale(false)} onCancel={() => setShowAddSale(false)} /> : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                      {sales?.map((sale) => {
                        const customer = customers?.find(c => c.id === sale.customerId);
                        return (
                          <div key={sale.id} className={cn("p-4 flex items-center justify-between hover:bg-gray-50 transition-colors", sale.isReversed && "opacity-50 grayscale bg-gray-50")}>
                            <div className="flex items-center space-x-4">
                              <div className={cn("p-2 rounded-full", sale.isReversed ? "bg-gray-200 text-gray-400" : sale.status === 'paid' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                {sale.isReversed ? <RotateCcw size={20} /> : <ShoppingBag size={20} />}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-bold text-gray-800">{sale.customerName}</p>
                                  {sale.isReversed && <span className="text-[8px] font-black uppercase bg-gray-200 text-gray-600 px-1 rounded">{t('reversed')}</span>}
                                </div>
                                <p className="text-[10px] text-gray-500">
                                  {new Date(sale.date).toLocaleDateString()} • {t('recordedBy')}: {sale.createdBy}
                                </p>
                                {sale.isReversed && (
                                  <p className="text-[10px] text-red-500 italic mt-1">
                                    {t('reversedBy')}: {sale.reversedBy} ({sale.reversalReason})
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className={cn("font-bold text-gray-900", sale.isReversed && "line-through")}>{formatCurrency(sale.totalAmount)}</p>
                              </div>
                              {!sale.isReversed && (
                                <>
                                  <button onClick={() => shareProfessionalReceipt(sale, shops?.find(s => s.id === sale.shopId))} className="p-2 text-gray-400 hover:text-kwari-green" title={t('shareReceipt')}><Share2 size={20} /></button>
                                  {customer?.phone && (
                                    <button onClick={() => handleReportScam(customer.phone)} className="p-2 text-gray-400 hover:text-red-600" title="Report Fake Alert"><ShieldAlert size={20} /></button>
                                  )}
                                  {FEATURES.canReverseSale(user?.role) && (
                                    <button onClick={() => sale.id && handleReverse(sale.id)} className="p-2 text-gray-400 hover:text-red-500" title={t('reverse')}><RotateCcw size={20} /></button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-6 pb-10">
                  {showAddInventory ? <AddInventoryForm onSuccess={() => setShowAddInventory(false)} onCancel={() => setShowAddInventory(false)} /> : 
                  showTransfer ? <StockTransferForm onSuccess={() => setShowTransfer(false)} onCancel={() => setShowTransfer(false)} /> : (
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setInventoryViewMode('list')}
                          className={cn(
                            "flex-1 p-2 rounded-lg font-bold text-sm transition-all",
                            inventoryViewMode === 'list' ? "bg-kwari-green text-white" : "bg-gray-100 text-gray-600"
                          )}
                        >
                          All Items
                        </button>
                        <button
                          onClick={() => setInventoryViewMode('dealer')}
                          className={cn(
                            "flex-1 p-2 rounded-lg font-bold text-sm transition-all",
                            inventoryViewMode === 'dealer' ? "bg-kwari-green text-white" : "bg-gray-100 text-gray-600"
                          )}
                        >
                          Dealer View
                        </button>
                      </div>

                      {inventoryViewMode === 'list' && (
                        <>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <Search size={18} />
                            </div>
                            <input 
                              type="text"
                              value={inventorySearch}
                              onChange={(e) => setInventorySearch(e.target.value)}
                              placeholder="Speak or type to search fabrics..."
                              className="w-full pl-10 pr-12 p-3 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-kwari-green"
                            />
                            <button 
                              onClick={startInventoryVoiceSearch}
                              className={cn(
                                "absolute inset-y-0 right-0 pr-3 flex items-center",
                                isSearchingVoice ? "text-red-500 animate-pulse" : "text-gray-400"
                              )}
                            >
                              <Mic size={20} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredInventory?.map((item) => {
                              const shop = shops?.find(s => s.id === item.shopId);
                              const bundle = item.parentId ? bundles?.find(b => b.id === item.parentId) : undefined;
                              return (
                                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      {(item.photo || bundle?.image) && (
                                        <img src={item.photo || bundle?.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                                      )}
                                      <div>
                                        <p className="font-bold text-gray-800">{item.name}</p>
                                        <div className="flex flex-wrap gap-1 mb-1">
                                          <p className="text-[8px] text-kwari-green font-black uppercase tracking-tight bg-green-50 px-1.5 py-0.5 rounded">
                                            {shop?.name || 'Unknown Shop'}
                                          </p>
                                          {item.isRemnant && (
                                            <p className="text-[8px] text-amber-600 font-black uppercase tracking-tight bg-amber-50 px-1.5 py-0.5 rounded">
                                              Remnant
                                            </p>
                                          )}
                                          {bundle?.color && (
                                            <span className="text-[8px] font-black uppercase tracking-tight bg-gray-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: bundle.color }} />
                                              {bundle.color}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500">{item.category}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="text-right mr-2">
                                        <p className="text-sm font-bold text-kwari-green">{item.quantity} {t(item.unit)}</p>
                                        <p className="text-[10px] font-medium text-gray-500">Sell: {formatCurrency(item.pricePerUnit)}</p>
                                        <p className="text-[10px] font-medium text-gray-500">Buy: {formatCurrency(item.purchasePrice)}</p>
                                      </div>
                                      <button 
                                        onClick={() => setPrintItem(item)}
                                        className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                                        title="Print Label"
                                      >
                                        <Printer size={18} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-500">
                                    <div>Barcode: {item.barcode || 'Auto'}</div>
                                    <div>Unit: {t(item.unit)}</div>
                                    <div>Dealer: {item.category || '—'}</div>
                                    <div>Created by: {item.createdBy || '—'}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}

                      {inventoryViewMode === 'dealer' && (
                        <>
                          {!selectedDealerId && (
                            <div className="space-y-4">
                              <h3 className="font-bold text-gray-800">Select a Dealer</h3>
                              <div className="grid grid-cols-1 gap-3">
                                {dealers?.map((dealer) => {
                                  const shop = shops?.find(s => s.id === dealer.shopId);
                                  const dealerBundles = bundles?.filter(b => b.dealerId === dealer.id) || [];
                                  return (
                                    <button
                                      key={dealer.id}
                                      onClick={() => setSelectedDealerId(dealer.id!)}
                                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-left hover:border-kwari-green transition-all"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="font-bold text-gray-800">{dealer.name}</p>
                                          <p className="text-xs text-gray-500">{shop?.name || 'Unknown Shop'}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold text-kwari-green">{dealer.quantity} bundles</p>
                                          <p className="text-[10px] text-gray-500">Buy: {formatCurrency(dealer.priceBought)}</p>
                                          <p className="text-[10px] text-gray-500">Sell: {formatCurrency(dealer.priceSell)}</p>
                                        </div>
                                      </div>
                                      <div className="mt-2 flex gap-1 flex-wrap">
                                        {dealerBundles.slice(0, 5).map((b) => (
                                          <span
                                            key={b.id}
                                            className="inline-block w-4 h-4 rounded-full border"
                                            style={{ backgroundColor: b.color }}
                                            title={b.color}
                                          />
                                        ))}
                                        {dealerBundles.length > 5 && (
                                          <span className="text-[10px] text-gray-400">+{dealerBundles.length - 5} more</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                                {(!dealers || dealers.length === 0) && (
                                  <p className="text-center text-gray-400 py-8">No dealers yet. Add inventory using the Dealer → Bundle → Yard flow.</p>
                                )}
                              </div>
                            </div>
                          )}

                          {selectedDealerId && !selectedBundleId && (
                            <div className="space-y-4">
                              <button
                                onClick={() => setSelectedDealerId(null)}
                                className="text-kwari-green font-bold text-sm"
                              >
                                ← Back to Dealers
                              </button>
                              <h3 className="font-bold text-gray-800">
                                {dealers?.find(d => d.id === selectedDealerId)?.name} - Select a Bundle
                              </h3>
                              <div className="grid grid-cols-1 gap-3">
                                {bundles?.filter(b => b.dealerId === selectedDealerId).map((bundle) => {
                                  const bundleYards = yards?.filter(y => y.bundleId === bundle.id) || [];
                                  const totalYards = bundleYards.reduce((sum, y) => sum + y.quantity, 0);
                                  return (
                                    <button
                                      key={bundle.id}
                                      onClick={() => setSelectedBundleId(bundle.id!)}
                                      className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-left hover:border-kwari-green transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        {bundle.image && (
                                          <img src={bundle.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                                        )}
                                        <div
                                          className="w-12 h-12 rounded-lg border"
                                          style={{ backgroundColor: bundle.color }}
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-800">Bundle</p>
                                            <span className="text-[10px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded">{bundle.color}</span>
                                          </div>
                                          <p className="text-xs text-gray-500">{bundleYards.length} yards • {totalYards} total quantity</p>
                                          <p className="text-[10px] text-gray-500">
                                            Buy: {formatCurrency(bundle.priceBought)} | Sell: {formatCurrency(bundle.priceSell)}
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {selectedDealerId && selectedBundleId && (
                            <div className="space-y-4">
                              <button
                                onClick={() => setSelectedBundleId(null)}
                                className="text-kwari-green font-bold text-sm"
                              >
                                ← Back to Bundles
                              </button>
                              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                  {bundles?.find(b => b.id === selectedBundleId)?.image && (
                                    <img 
                                      src={bundles.find(b => b.id === selectedBundleId)?.image} 
                                      alt="" 
                                      className="w-16 h-16 rounded-lg object-cover" 
                                    />
                                  )}
                                  <div
                                    className="w-16 h-16 rounded-lg border"
                                    style={{ backgroundColor: bundles?.find(b => b.id === selectedBundleId)?.color }}
                                  />
                                  <div>
                                    <h3 className="font-bold text-gray-800">
                                      {dealers?.find(d => d.id === selectedDealerId)?.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">Bundle Color: {bundles?.find(b => b.id === selectedBundleId)?.color}</p>
                                  </div>
                                </div>
                              </div>
                              <h4 className="font-bold text-gray-800">Yards in this Bundle</h4>
                              <div className="grid grid-cols-1 gap-3">
                                {yards?.filter(y => y.bundleId === selectedBundleId).map((yard) => (
                                  <div
                                    key={yard.id}
                                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        {yard.image && (
                                          <img src={yard.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                        )}
                                        <div>
                                          <p className="font-bold text-gray-800">{yard.name}</p>
                                          <div className="flex items-center gap-1">
                                            <span
                                              className="inline-block w-3 h-3 rounded-full"
                                              style={{ backgroundColor: yard.color }}
                                            />
                                            <span className="text-[10px] text-gray-500">{yard.color}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-kwari-green">{yard.quantity} yards</p>
                                        <p className="text-[10px] text-gray-500">Buy: {formatCurrency(yard.priceBought)}</p>
                                        <p className="text-[10px] text-gray-500">Sell: {formatCurrency(yard.priceSell)}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {yards?.filter(y => y.bundleId === selectedBundleId).length === 0 && (
                                  <p className="text-center text-gray-400 py-4">No yards in this bundle.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {transfers && transfers.length > 0 && (
                        <div className="mt-8">
                          <h4 className="font-bold text-gray-800 mb-4 px-1">Recent Transfers</h4>
                          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                            {transfers.map(transfer => {
                              const fromShop = shops?.find(s => s.id === transfer.fromShopId);
                              const toShop = shops?.find(s => s.id === transfer.toShopId);
                              const product = inventory?.find(p => p.id === transfer.productId);
                              return (
                                <div key={transfer.id} className="p-4 flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ArrowRightLeft size={16} /></div>
                                    <div>
                                      <p className="text-xs font-bold text-gray-800">{product?.name || 'Deleted Item'}</p>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                                        {fromShop?.name} → {toShop?.name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                      <p className="text-xs font-black text-gray-900">{transfer.quantity} Units</p>
                                      <p className="text-[8px] text-gray-400">{new Date(transfer.date).toLocaleDateString()}</p>
                                    </div>
                                    <button 
                                      onClick={() => shareWaybill(transfer, fromShop, toShop, product)}
                                      className="p-2 text-gray-400 hover:text-kwari-green"
                                      title="Share Waybill"
                                    >
                                      <Share2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'expenses' && (
                <div className="space-y-6">
                  {showAddExpense ? <AddExpenseForm onSuccess={() => setShowAddExpense(false)} onCancel={() => setShowAddExpense(false)} /> : <ExpensesView />}
                </div>
              )}

              {activeTab === 'suppliers' && <SuppliersView />}

              {activeTab === 'market_dues' && <MarketLevyView />}

              {activeTab === 'bashi' && (
                <div className="space-y-6 pb-10">
                  <div className="bg-kwari-red text-white p-6 rounded-xl shadow-lg shadow-red-100 flex items-center justify-between">
                      <div><h3 className="text-sm font-medium opacity-80">{t('totalDebt')}</h3><p className="text-3xl font-bold">{formatCurrency(totalDebt)}</p></div>
                      <Wallet size={48} className="opacity-20" />
                  </div>
                  
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-800 px-1">Customer Credit Scores</h3>
                      <div className="grid grid-cols-1 gap-3">
                        {customers?.map(customer => {
                          const metrics = customerMetrics[customer.id!] || { total: 0, paid: 0, score: 0 };
                          const customerDebts = debtors?.filter(d => d.customerId === customer.id) || [];
                          const isGoodPayer = metrics.score >= 80;
                          
                          if (customerDebts.length === 0 && metrics.total === 0) return null;

                          return (
                            <div key={customer.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={cn(
                                    "p-2 rounded-xl",
                                    isGoodPayer ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                                  )}>
                                    <User size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-800">{customer.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Score: {Math.round(metrics.score)}%</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button 
                                    onClick={() => generateCustomerStatement(customer, sales?.filter(s => s.customerId === customer.id) || [], shops?.[0])}
                                    className="p-2 text-gray-400 hover:text-kwari-green"
                                    title="Download Statement"
                                  >
                                    <FileText size={18} />
                                  </button>
                                  {[1,2,3,4,5].map(star => (
                                    <Star 
                                      key={star} 
                                      size={12} 
                                      className={cn(star <= (metrics.score / 20) ? "text-kwari-gold fill-kwari-gold" : "text-gray-200")} 
                                    />
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {customerDebts.map(debt => {
                                  const paidOnThis = debtPayments?.filter(dp => dp.saleId === debt.id).reduce((sum, dp) => sum + dp.amount, 0) || 0;
                                  const remaining = debt.totalAmount - paidOnThis;
                                  
                                  return (
                                    <div key={debt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                      <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-700">{new Date(debt.date).toLocaleDateString()}</p>
                                        <div className="w-24 h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                          <div className="h-full bg-kwari-green" style={{ width: `${(paidOnThis / debt.totalAmount) * 100}%` }} />
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <div className="text-right">
                                          <p className="text-xs font-black text-gray-900">{formatCurrency(remaining)}</p>
                                          {paidOnThis > 0 && <p className="text-[8px] text-gray-400 font-bold">Paid: {formatCurrency(paidOnThis)}</p>}
                                        </div>
                                        <button onClick={() => sendDebtReminder(debt)} className="p-1.5 text-kwari-red"><Bell size={16} /></button>
                                        <button onClick={() => handleDebtPayment(debt.id!, remaining)} className="bg-kwari-green text-white px-3 py-1 rounded-lg text-[10px] font-black">Record Payment</button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                  </div>
                </div>
              )}

              {activeTab === 'brokers' && (
                <div className="space-y-6 pb-10">
                  {showAddBroker ? <AddBrokerForm onSuccess={() => setShowAddBroker(false)} onCancel={() => setShowAddBroker(false)} /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {brokers?.map((broker) => (
                        <div key={broker.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                          <div className="flex items-center space-x-3"><div className="bg-kwari-green/10 text-kwari-green p-2 rounded-full"><Users size={20} /></div><div><p className="font-bold text-gray-800">{broker.name}</p><p className="text-xs text-gray-500">{broker.phone}</p></div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

          {activeTab === 'calculators' && <CalculatorView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'staff' && <StaffView />}
          {activeTab === 'manual' && <ManualView />}
          {activeTab === 'settings' && <SettingsView />}

            </>
          )}
        </div>
      </main>

      {printItem && (
        <BarcodeLabelModal item={printItem} onClose={() => setPrintItem(null)} />
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-20 overflow-x-auto shadow-2xl">
        {mobileNavItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setShowAddSale(false); setShowAddInventory(false); setShowAddBroker(false); setShowTransfer(false); setShowAddExpense(false); setShowEOD(false); }}
            className={cn("flex flex-col items-center p-2 rounded-lg transition-colors", activeTab === item.id && !showEOD ? "text-kwari-green" : "text-gray-500")}
          >
            <item.icon size={18} /> <span className="text-[9px] mt-1 font-bold tracking-tight">{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
