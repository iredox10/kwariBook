import Dexie, { type EntityTable } from 'dexie';

interface Sale {
  id?: number;
  customerName: string;
  customerId?: number;
  totalAmount: number;
  items?: { productId: number, quantity: number, name: string }[];
  date: Date;
  status: 'paid' | 'credit' | 'salo';
  brokerId?: number;
  laadaAmount?: number;
  shopId: number;
  appwriteId?: string;
  updatedAt: number;
}

interface Customer {
  id?: number;
  name: string;
  phone: string;
  appwriteId?: string;
  updatedAt: number;
}

interface InventoryItem {
  id?: number;
  name: string;
  category: string;
  quantity: number;
  unit: 'suit' | 'bundle' | 'bale';
  pricePerUnit: number;
  shopId: number;
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
  appwriteId?: string;
  updatedAt: number;
}

interface Expense {
  id?: number;
  category: 'porter' | 'fuel' | 'rent' | 'commission' | 'other';
  amount: number;
  description: string;
  date: Date;
  shopId: number;
  appwriteId?: string;
  updatedAt: number;
}

interface SyncQueueItem {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  collection: 'sales' | 'inventory' | 'brokers' | 'shops' | 'transfers' | 'expenses' | 'customers';
  payload: any;
  timestamp: number;
}

const db = new Dexie('KwariBookDB') as Dexie & {
  sales: EntityTable<Sale, 'id'>;
  customers: EntityTable<Customer, 'id'>;
  inventory: EntityTable<InventoryItem, 'id'>;
  brokers: EntityTable<Broker, 'id'>;
  shops: EntityTable<Shop, 'id'>;
  transfers: EntityTable<StockTransfer, 'id'>;
  expenses: EntityTable<Expense, 'id'>;
  sync_queue: EntityTable<SyncQueueItem, 'id'>;
};

db.version(7).stores({
  sales: '++id, customerName, customerId, date, status, shopId, appwriteId',
  customers: '++id, name, phone, appwriteId',
  inventory: '++id, name, category, unit, shopId, appwriteId',
  brokers: '++id, name, phone, appwriteId',
  shops: '++id, name, appwriteId',
  transfers: '++id, fromShopId, toShopId, productId, appwriteId',
  expenses: '++id, category, date, shopId',
  sync_queue: '++id, action, collection, timestamp'
});

// Helper to add a customer
export async function addCustomer(customer: Omit<Customer, 'id' | 'updatedAt'>) {
  const data: Customer = { ...customer, updatedAt: Date.now() };
  const id = await db.customers.add(data);
  await db.sync_queue.add({
    action: 'CREATE',
    collection: 'customers',
    payload: { ...data, id },
    timestamp: Date.now()
  });
  return id;
}

// Helper to add an expense
export async function addExpense(expense: Omit<Expense, 'id' | 'updatedAt'>) {
  const data: Expense = { ...expense, updatedAt: Date.now() };
  const id = await db.expenses.add(data);
  await db.sync_queue.add({
    action: 'CREATE',
    collection: 'expenses',
    payload: { ...data, id },
    timestamp: Date.now()
  });
  return id;
}

// Helper to add sale with sync queuing and inventory deduction
export async function addSale(sale: Omit<Sale, 'id' | 'updatedAt' | 'items'>, items: { productId: number, quantity: number, name: string }[] = []) {
  return await db.transaction('rw', db.sales, db.inventory, db.sync_queue, async () => {
    const saleData: Sale = {
      ...sale,
      items,
      updatedAt: Date.now(),
    };
    
    const id = await db.sales.add(saleData);
    
    // Deduct stock
    for (const item of items) {
      const invItem = await db.inventory.get(item.productId);
      if (invItem) {
        await db.inventory.update(item.productId, {
          quantity: invItem.quantity - item.quantity,
          updatedAt: Date.now()
        });
        
        // Queue inventory update
        await db.sync_queue.add({
          action: 'UPDATE',
          collection: 'inventory',
          payload: { id: item.productId, quantity: invItem.quantity - item.quantity, updatedAt: Date.now() },
          timestamp: Date.now()
        });
      }
    }

    await db.sync_queue.add({
      action: 'CREATE',
      collection: 'sales',
      payload: { ...saleData, id },
      timestamp: Date.now(),
    });
    
    return id;
  });
}

// Helper to add inventory with sync queuing
export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'updatedAt'>) {
  const itemData: InventoryItem = {
    ...item,
    updatedAt: Date.now(),
  };
  
  const id = await db.inventory.add(itemData);
  
  await db.sync_queue.add({
    action: 'CREATE',
    collection: 'inventory',
    payload: { ...itemData, id },
    timestamp: Date.now(),
  });
  
  return id;
}

// Helper to record payment for a sale
export async function recordPayment(saleId: number) {
  const sale = await db.sales.get(saleId);
  if (!sale) return;

  await db.sales.update(saleId, {
    status: 'paid',
    updatedAt: Date.now(),
  });

  await db.sync_queue.add({
    action: 'UPDATE',
    collection: 'sales',
    payload: { id: saleId, status: 'paid', updatedAt: Date.now() },
    timestamp: Date.now(),
  });
}

// Helper to add broker with sync queuing
export async function addBroker(broker: Omit<Broker, 'id' | 'updatedAt'>) {
  const brokerData: Broker = {
    ...broker,
    updatedAt: Date.now(),
  };
  
  const id = await db.brokers.add(brokerData);
  
  await db.sync_queue.add({
    action: 'CREATE',
    collection: 'brokers',
    payload: { ...brokerData, id },
    timestamp: Date.now(),
  });
  
  return id;
}

// Helper to transfer stock between shops
export async function transferStock(transfer: Omit<StockTransfer, 'id' | 'updatedAt'>) {
  return await db.transaction('rw', db.inventory, db.transfers, db.sync_queue, async () => {
    const fromItem = await db.inventory.get(transfer.productId);
    if (!fromItem || fromItem.quantity < transfer.quantity) {
      throw new Error('Insufficient stock for transfer');
    }

    // 1. Decrement from origin
    await db.inventory.update(transfer.productId, {
      quantity: fromItem.quantity - transfer.quantity,
      updatedAt: Date.now()
    });

    // 2. Increment in destination (or create if not exists)
    let toItem = await db.inventory
      .where({ name: fromItem.name, shopId: transfer.toShopId })
      .first();

    if (toItem) {
      await db.inventory.update(toItem.id!, {
        quantity: toItem.quantity + transfer.quantity,
        updatedAt: Date.now()
      });
    } else {
      toItem = {
        name: fromItem.name,
        category: fromItem.category,
        quantity: transfer.quantity,
        unit: fromItem.unit,
        pricePerUnit: fromItem.pricePerUnit,
        shopId: transfer.toShopId,
        updatedAt: Date.now()
      };
      const newId = await db.inventory.add(toItem);
      toItem.id = newId;
    }

    // 3. Record transfer
    const transferData: StockTransfer = {
      ...transfer,
      updatedAt: Date.now()
    };
    await db.transfers.add(transferData);

    // 4. Queue everything for sync
    await db.sync_queue.add({
      action: 'UPDATE',
      collection: 'inventory',
      payload: { id: transfer.productId, quantity: fromItem.quantity - transfer.quantity, updatedAt: Date.now() },
      timestamp: Date.now()
    });

    await db.sync_queue.add({
      action: 'CREATE',
      collection: 'transfers',
      payload: transferData,
      timestamp: Date.now()
    });

    return true;
  });
}

export type { Sale, Customer, InventoryItem, Broker, Shop, StockTransfer, Expense, SyncQueueItem };
export { db };
