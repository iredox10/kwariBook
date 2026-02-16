import Dexie, { type EntityTable } from 'dexie';

interface Sale {
  id?: number;
  customerName: string;
  customerId?: number;
  totalAmount: number;
  items?: { productId: number, quantity: number, name: string, price: number, purchasePrice: number }[];
  date: Date;
  status: 'paid' | 'credit' | 'salo';
  brokerId?: number;
  laadaAmount?: number;
  shopId: number;
  isReversed?: boolean;
  reversedBy?: string;
  reversalReason?: string;
  createdBy: string;
  appwriteId?: string;
  updatedAt: number;
}

interface Customer {
  id?: number;
  name: string;
  phone: string;
  isFlagged?: boolean;
  appwriteId?: string;
  updatedAt: number;
}

interface FlaggedCustomer {
  id?: number;
  phone: string;
  reason: string;
  reportedBy: string;
  date: Date;
  appwriteId?: string;
}

interface Supplier {
  id?: number;
  name: string;
  phone?: string;
  currency: 'NGN' | 'USD' | 'RMB';
  totalDebt: number; 
  appwriteId?: string;
  updatedAt: number;
}

interface SupplierTransaction {
  id?: number;
  supplierId: number;
  amount: number;
  currency: 'NGN' | 'USD' | 'RMB';
  rate?: number; 
  type: 'purchase' | 'payment';
  date: Date;
  description: string;
  appwriteId?: string;
  updatedAt: number;
}

interface InventoryItem {
  id?: number;
  name: string;
  category: string;
  quantity: number;
  unit: 'suit' | 'bundle' | 'bale' | 'yards' | 'meters';
  pricePerUnit: number;
  purchasePrice: number;
  purchaseCurrency: 'NGN' | 'USD' | 'RMB';
  wholesalePrice?: number;
  wholesaleThreshold?: number;
  photo?: string;
  barcode?: string;
  isRemnant?: boolean;
  parentId?: number;
  shopId: number;
  createdBy: string;
  appwriteId?: string;
  updatedAt: number;
}

interface Broker {
  id?: number;
  name: string;
  phone: string;
  appwriteId?: string;
  updatedAt: number;
}

interface Shop {
  id?: number;
  name: string;
  address: string;
  building?: string;
  block?: string;
  floor?: string;
  landmark?: string;
  logo?: string; 
  appwriteId?: string;
  updatedAt: number;
}

interface StockTransfer {
  id?: number;
  fromShopId: number;
  toShopId: number;
  productId: number;
  quantity: number;
  date: Date;
  createdBy: string;
  appwriteId?: string;
  updatedAt: number;
}

interface Expense {
  id?: number;
  category: 'porter' | 'fuel' | 'rent' | 'commission' | 'levy' | 'other';
  amount: number;
  description: string;
  date: Date;
  shopId: number;
  createdBy: string;
  appwriteId?: string;
  updatedAt: number;
}

interface MarketLevy {
  id?: number;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  lastPaidDate?: Date;
  shopId: number;
  appwriteId?: string;
  updatedAt: number;
}

interface ZakatPayment {
  id?: number;
  amount: number;
  totalWealth: number;
  date: Date;
  note: string;
  appwriteId?: string;
  updatedAt: number;
}

interface DebtPayment {
  id?: number;
  saleId: number;
  amount: number;
  date: Date;
  appwriteId?: string;
  updatedAt: number;
}

export type UserRole = 'owner' | 'manager' | 'sales_boy';

interface User {
  id?: number;
  appwriteId: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  shopIds: number[];
  isActive: boolean;
  lastLogin?: Date;
  updatedAt: number;
}

interface SyncQueueItem {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: string;
  payload: any;
  timestamp: number;
}

const db = new Dexie('KwariBookDB') as Dexie & {
  sales: EntityTable<Sale, 'id'>;
  customers: EntityTable<Customer, 'id'>;
  flagged_customers: EntityTable<FlaggedCustomer, 'id'>;
  suppliers: EntityTable<Supplier, 'id'>;
  supplier_transactions: EntityTable<SupplierTransaction, 'id'>;
  inventory: EntityTable<InventoryItem, 'id'>;
  brokers: EntityTable<Broker, 'id'>;
  shops: EntityTable<Shop, 'id'>;
  transfers: EntityTable<StockTransfer, 'id'>;
  expenses: EntityTable<Expense, 'id'>;
  market_levies: EntityTable<MarketLevy, 'id'>;
  zakat: EntityTable<ZakatPayment, 'id'>;
  debt_payments: EntityTable<DebtPayment, 'id'>;
  users: EntityTable<User, 'id'>;
  sync_queue: EntityTable<SyncQueueItem, 'id'>;
};

db.version(17).stores({
  sales: '++id, customerName, customerId, date, status, shopId, isReversed, createdBy, appwriteId',
  customers: '++id, name, phone, appwriteId',
  flagged_customers: '++id, phone',
  suppliers: '++id, name, appwriteId',
  supplier_transactions: '++id, supplierId, date, type',
  inventory: '++id, name, category, unit, shopId, createdBy, barcode, parentId, isRemnant, appwriteId',
  brokers: '++id, name, phone, appwriteId',
  shops: '++id, name, appwriteId',
  transfers: '++id, fromShopId, toShopId, productId, date, createdBy, appwriteId',
  expenses: '++id, category, date, shopId, createdBy',
  market_levies: '++id, name, shopId',
  zakat: '++id, date',
  debt_payments: '++id, saleId, date',
  users: '++id, appwriteId, role, isActive',
  sync_queue: '++id, action, collection, timestamp'
});

export async function recordZakat(zakat: Omit<ZakatPayment, 'id' | 'updatedAt'>) {
  const data: ZakatPayment = { ...zakat, updatedAt: Date.now() };
  const id = await db.zakat.add(data);
  await db.sync_queue.add({ action: 'CREATE', collection: 'zakat', payload: { ...data, id }, timestamp: Date.now() });
  return id;
}

export async function addCustomer(customer: Omit<Customer, 'id' | 'updatedAt'>) {
  const data: Customer = { ...customer, updatedAt: Date.now() };
  const id = await db.customers.add(data);
  await db.sync_queue.add({ action: 'CREATE', collection: 'customers', payload: { ...data, id }, timestamp: Date.now() });
  return id;
}

export async function flagCustomer(flagData: Omit<FlaggedCustomer, 'id'>) {
  const id = await db.flagged_customers.add(flagData);
  await db.sync_queue.add({ action: 'CREATE', collection: 'flagged_customers', payload: { ...flagData, id }, timestamp: Date.now() });
  return id;
}

export async function addSupplier(supplier: Omit<Supplier, 'id' | 'updatedAt'>) {
  const data: Supplier = { ...supplier, updatedAt: Date.now() };
  const id = await db.suppliers.add(data);
  await db.sync_queue.add({ action: 'CREATE', collection: 'suppliers', payload: { ...data, id }, timestamp: Date.now() });
  return id;
}

export async function addSupplierTransaction(tx: Omit<SupplierTransaction, 'id' | 'updatedAt'>) {
  return await db.transaction('rw', db.suppliers, db.supplier_transactions, db.sync_queue, async () => {
    const supplier = await db.suppliers.get(tx.supplierId);
    if (!supplier) throw new Error('Supplier not found');
    const data: SupplierTransaction = { ...tx, updatedAt: Date.now() };
    const id = await db.supplier_transactions.add(data);
    const balanceChange = tx.type === 'purchase' ? tx.amount : -tx.amount;
    const newBalance = supplier.totalDebt + balanceChange;
    await db.suppliers.update(tx.supplierId, { totalDebt: newBalance, updatedAt: Date.now() });
    await db.sync_queue.add({ action: 'CREATE', collection: 'supplier_transactions', payload: { ...data, id }, timestamp: Date.now() });
    await db.sync_queue.add({ action: 'UPDATE', collection: 'suppliers', payload: { id: tx.supplierId, totalDebt: newBalance, updatedAt: Date.now() }, timestamp: Date.now() });
    return id;
  });
}

export async function addExpense(expense: Omit<Expense, 'id' | 'updatedAt'>) {
  const data: Expense = { ...expense, updatedAt: Date.now() };
  const id = await db.expenses.add(data);
  await db.sync_queue.add({ action: 'CREATE', collection: 'expenses', payload: { ...data, id }, timestamp: Date.now() });
  return id;
}

export async function addSale(sale: Omit<Sale, 'id' | 'updatedAt' | 'items'>, items: { productId: number, quantity: number, name: string, price: number, purchasePrice: number }[] = []) {
  return await db.transaction('rw', db.sales, db.inventory, db.sync_queue, async () => {
    const saleData: Sale = { ...sale, items, updatedAt: Date.now() };
    const id = await db.sales.add(saleData);
    for (const item of items) {
      const invItem = await db.inventory.get(item.productId);
      if (invItem) {
        await db.inventory.update(item.productId, { quantity: invItem.quantity - item.quantity, updatedAt: Date.now() });
        await db.sync_queue.add({ action: 'UPDATE', collection: 'inventory', payload: { id: item.productId, quantity: invItem.quantity - item.quantity, updatedAt: Date.now() }, timestamp: Date.now() });
      }
    }
    await db.sync_queue.add({ action: 'CREATE', collection: 'sales', payload: { ...saleData, id }, timestamp: Date.now() });
    return id;
  });
}

export async function reverseSale(saleId: number, reversedBy: string, reason: string) {
  return await db.transaction('rw', db.sales, db.inventory, db.sync_queue, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale || sale.isReversed) return;
    await db.sales.update(saleId, { isReversed: true, reversedBy, reversalReason: reason, updatedAt: Date.now() });
    if (sale.items) {
      for (const item of sale.items) {
        const invItem = await db.inventory.get(item.productId);
        if (invItem) {
          const newQty = invItem.quantity + item.quantity;
          await db.inventory.update(item.productId, { quantity: newQty, updatedAt: Date.now() });
          await db.sync_queue.add({ action: 'UPDATE', collection: 'inventory', payload: { id: item.productId, quantity: newQty, updatedAt: Date.now() }, timestamp: Date.now() });
        }
      }
    }
    await db.sync_queue.add({ action: 'UPDATE', collection: 'sales', payload: { id: saleId, isReversed: true, reversedBy, reversalReason: reason, updatedAt: Date.now() }, timestamp: Date.now() });
  });
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'updatedAt'>) {
  const itemData: InventoryItem = { ...item, updatedAt: Date.now() };
  const id = await db.inventory.add(itemData);
  await db.sync_queue.add({ action: 'CREATE', collection: 'inventory', payload: { ...itemData, id }, timestamp: Date.now() });
  return id;
}

export async function recordPayment(saleId: number) {
  const sale = await db.sales.get(saleId);
  if (!sale) return;
  await db.sales.update(saleId, { status: 'paid', updatedAt: Date.now() });
  await db.sync_queue.add({ action: 'UPDATE', collection: 'sales', payload: { id: saleId, status: 'paid', updatedAt: Date.now() }, timestamp: Date.now() });
}

export async function addBroker(broker: Omit<Broker, 'id' | 'updatedAt'>) {
  const brokerData: Broker = { ...broker, updatedAt: Date.now() };
  const id = await db.brokers.add(brokerData);
  await db.sync_queue.add({ action: 'CREATE', collection: 'brokers', payload: { ...brokerData, id }, timestamp: Date.now() });
  return id;
}

export async function transferStock(transfer: Omit<StockTransfer, 'id' | 'updatedAt'>) {
  return await db.transaction('rw', db.inventory, db.transfers, db.sync_queue, async () => {
    const fromItem = await db.inventory.get(transfer.productId);
    if (!fromItem || fromItem.quantity < transfer.quantity) throw new Error('Insufficient stock for transfer');
    await db.inventory.update(transfer.productId, { quantity: fromItem.quantity - transfer.quantity, updatedAt: Date.now() });
    let toItem = await db.inventory.where({ name: fromItem.name, shopId: transfer.toShopId }).first();
    if (toItem) {
      await db.inventory.update(toItem.id!, { quantity: toItem.quantity + transfer.quantity, updatedAt: Date.now() });
    } else {
      const newItem: InventoryItem = { ...fromItem, id: undefined, quantity: transfer.quantity, shopId: transfer.toShopId, createdBy: transfer.createdBy, updatedAt: Date.now(), appwriteId: undefined };
      await db.inventory.add(newItem);
    }
    const transferData: StockTransfer = { ...transfer, updatedAt: Date.now() };
    await db.transfers.add(transferData);
    await db.sync_queue.add({ action: 'UPDATE', collection: 'inventory', payload: { id: transfer.productId, quantity: fromItem.quantity - transfer.quantity, updatedAt: Date.now() }, timestamp: Date.now() });
    await db.sync_queue.add({ action: 'CREATE', collection: 'transfers', payload: transferData, timestamp: Date.now() });
    return true;
  });
}

export async function addDebtPayment(saleId: number, amount: number) {
  return await db.transaction('rw', db.sales, db.debt_payments, db.sync_queue, async () => {
    const sale = await db.sales.get(saleId);
    if (!sale) throw new Error('Sale not found');
    const payment: DebtPayment = { saleId, amount, date: new Date(), updatedAt: Date.now() };
    const id = await db.debt_payments.add(payment);
    const allPayments = await db.debt_payments.where('saleId').equals(saleId).toArray();
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= sale.totalAmount) await db.sales.update(saleId, { status: 'paid', updatedAt: Date.now() });
    await db.sync_queue.add({ action: 'CREATE', collection: 'debt_payments', payload: { ...payment, id }, timestamp: Date.now() });
    return id;
  });
}

export async function addUser(user: Omit<User, 'id' | 'updatedAt'>) {
  const data: User = { ...user, updatedAt: Date.now() };
  const id = await db.users.add(data);
  await db.sync_queue.add({ action: 'CREATE', collection: 'users', payload: { ...data, id }, timestamp: Date.now() });
  return id;
}

export type { Sale, Customer, FlaggedCustomer, Supplier, SupplierTransaction, InventoryItem, Broker, Shop, StockTransfer, Expense, MarketLevy, ZakatPayment, DebtPayment, SyncQueueItem, User };
export { db };
