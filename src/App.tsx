import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
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
  BarChart3,
  Settings as SettingsIcon,
  ArrowRightLeft,
  Store,
  Receipt,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AddSaleForm } from './components/AddSaleForm';
import { AddInventoryForm } from './components/AddInventoryForm';
import { AddBrokerForm } from './components/AddBrokerForm';
import { AddExpenseForm } from './components/AddExpenseForm';
import { StockTransferForm } from './components/StockTransferForm';
import { CalculatorView } from './components/CalculatorView';
import { ReportsView } from './components/ReportsView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import { useSyncManager } from './hooks/useSyncManager';
import { useAuth } from './hooks/useAuth';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, recordPayment } from './lib/db';
import { sendDebtReminder, shareProfessionalReceipt } from './utils/whatsapp';
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
  const [verifyingLink, setVerifyingLink] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  
  const { user, loading: authLoading, checkUser, logout } = useAuth();
  const { isOnline, isSyncing } = useSyncManager();

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
  
  const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().limit(50).toArray());
  const inventory = useLiveQuery(() => db.inventory.toArray());
  const shops = useLiveQuery(() => db.shops.toArray());
  const debtors = useLiveQuery(() => db.sales.where('status').anyOf(['credit', 'salo']).toArray());
  const brokers = useLiveQuery(() => db.brokers.toArray());
  const customers = useLiveQuery(() => db.customers.toArray());
  const pendingSyncCount = useLiveQuery(() => db.sync_queue.count());
  
  const totalDebt = debtors?.reduce((acc, sale) => acc + sale.totalAmount, 0) || 0;
  const totalSalesAmount = useLiveQuery(async () => {
    const allSales = await db.sales.toArray();
    return allSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  });

  // Calculate Customer Scores
  const customerMetrics = useMemo(() => {
    if (!sales || !customers) return {};
    const metrics: Record<number, { total: number, paid: number, score: number }> = {};
    
    sales.forEach(sale => {
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

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'sales', label: t('sales'), icon: ShoppingBag },
    { id: 'inventory', label: t('inventory'), icon: Package },
    { id: 'expenses', label: t('expenses'), icon: Receipt },
    { id: 'bashi', label: t('bashi'), icon: Wallet },
    { id: 'brokers', label: t('brokers'), icon: Users },
    { id: 'calculators', label: t('calculators'), icon: Calculator },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'settings', label: t('settings'), icon: SettingsIcon },
  ];

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
                <p className="text-xs font-bold text-gray-800 truncate">{user.phone || user.email}</p>
                <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center space-x-1">
                   <LogOut size={10} />
                   <span>Logout</span>
                </button>
             </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center space-x-3 w-full p-2.5 rounded-xl transition-colors",
                activeTab === item.id 
                  ? "bg-kwari-green text-white shadow-md shadow-green-100" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <item.icon size={18} />
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        
        {/* Sync Status & Privacy */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-3">
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
          <button onClick={() => setPrivacyMode(!privacyMode)} className={cn("p-2 rounded-full", privacyMode ? "text-amber-600 bg-amber-50" : "text-gray-400")}>
            {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
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
              <h2 className="text-2xl font-bold text-gray-800">{t(activeTab)}</h2>
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
                <button onClick={() => setShowTransfer(true)} className="bg-white text-kwari-green border border-kwari-green p-3 rounded-xl flex items-center space-x-2 font-bold hover:bg-green-50 transition-all">
                  <ArrowRightLeft size={20} />
                  <span>{t('transfer')}</span>
                </button>
                <button onClick={() => setShowAddInventory(true)} className="bg-kwari-green text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-green-100 hover:bg-opacity-90 transition-all">
                  <Plus size={20} />
                  <span>{t('add')}</span>
                </button>
              </div>
            )}
            {activeTab === 'expenses' && !showAddExpense && (
              <button onClick={() => setShowAddExpense(true)} className="bg-kwari-red text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-red-100 hover:bg-opacity-90 transition-all">
                <Plus size={20} />
                <span>{t('add')}</span>
              </button>
            )}
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {!shops || shops.length === 0 ? (
                <div className="bg-kwari-green/10 p-8 rounded-3xl border-2 border-kwari-green border-dashed text-center">
                  <Store size={48} className="mx-auto text-kwari-green mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to KwariBook!</h3>
                  <p className="text-gray-600 mb-6">To start recording sales, you first need to add your shop.</p>
                  <button onClick={() => setActiveTab('settings')} className="bg-kwari-green text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-green-100 hover:bg-opacity-90 transition-all">
                    Set Up My Shop
                  </button>
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
                    <button onClick={() => { setActiveTab('sales'); setShowAddSale(true); }} className="p-4 bg-kwari-green text-white rounded-xl flex flex-col items-center justify-center space-y-2 shadow-md">
                      <Plus size={24} /> <span className="text-xs font-bold">{t('addSale')}</span>
                    </button>
                    <button onClick={() => { setActiveTab('inventory'); setShowAddInventory(true); }} className="p-4 bg-white text-gray-700 border border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 transition-all">
                      <Package size={24} className="text-kwari-gold" /> <span className="text-xs font-bold">{t('addInventory')}</span>
                    </button>
                    <button onClick={() => { setActiveTab('expenses'); setShowAddExpense(true); }} className="p-4 bg-white text-gray-700 border border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 transition-all">
                      <Receipt size={24} className="text-kwari-red" /> <span className="text-xs font-bold">{t('addExpense')}</span>
                    </button>
                    <button onClick={() => setActiveTab('calculators')} className="p-4 bg-white text-gray-700 border border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 transition-all">
                      <Calculator size={24} className="text-blue-500" /> <span className="text-xs font-bold">{t('calculators')}</span>
                    </button>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">{t('history')}</h3>
                    <div className="space-y-4">
                      {sales?.map((sale) => (
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
                  {sales?.map((sale) => (
                    <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={cn("p-2 rounded-full", sale.status === 'paid' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}><ShoppingBag size={20} /></div>
                        <div><p className="font-bold text-gray-800">{sale.customerName}</p><p className="text-xs text-gray-500">{new Date(sale.date).toLocaleDateString()}</p></div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right"><p className="font-bold text-gray-900">{formatCurrency(sale.totalAmount)}</p></div>
                        <button onClick={() => shareProfessionalReceipt(sale, shops?.find(s => s.id === sale.shopId))} className="p-2 text-gray-400 hover:text-kwari-green"><Share2 size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {showAddInventory ? <AddInventoryForm onSuccess={() => setShowAddInventory(false)} onCancel={() => setShowAddInventory(false)} /> : 
               showTransfer ? <StockTransferForm onSuccess={() => setShowTransfer(false)} onCancel={() => setShowTransfer(false)} /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inventory?.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div><p className="font-bold text-gray-800">{item.name}</p><p className="text-xs text-gray-500">{item.category}</p></div>
                      <div className="text-right"><p className="text-sm font-bold text-kwari-green">{item.quantity} {t(item.unit)}</p><p className="text-xs font-medium text-gray-500">{formatCurrency(item.pricePerUnit)}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              {showAddExpense ? <AddExpenseForm onSuccess={() => setShowAddExpense(false)} onCancel={() => setShowAddExpense(false)} /> : <ExpensesView />}
            </div>
          )}

          {activeTab === 'bashi' && (
            <div className="space-y-6">
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
                            {customerDebts.map(debt => (
                              <div key={debt.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-xs font-bold text-gray-700">{new Date(debt.date).toLocaleDateString()}</p>
                                  <p className="text-[10px] text-gray-400 uppercase font-black">{t(debt.status)}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-black text-gray-900">{formatCurrency(debt.totalAmount)}</p>
                                  <button onClick={() => sendDebtReminder(debt)} className="p-1.5 text-kwari-red"><Bell size={16} /></button>
                                  <button onClick={() => recordPayment(debt.id!)} className="bg-kwari-green text-white px-3 py-1 rounded-lg text-[10px] font-black">{t('recordPayment')}</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'brokers' && (
            <div className="space-y-6">
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
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-20 overflow-x-auto">
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveTab(item.id); setShowAddSale(false); setShowAddInventory(false); setShowAddBroker(false); setShowTransfer(false); setShowAddExpense(false); }}
            className={cn("flex flex-col items-center p-2 rounded-lg transition-colors", activeTab === item.id ? "text-kwari-green" : "text-gray-500")}
          >
            <item.icon size={18} /> <span className="text-[9px] mt-1 font-bold tracking-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
