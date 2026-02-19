import { useEffect, useState, useCallback } from 'react';
import { db, SYNC_EVENT } from '../lib/db';
import { databases } from '../api/appwrite';
import { ID, Query } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '';
const SALES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_SALES_COLLECTION_ID || '';
const INVENTORY_COLLECTION_ID = import.meta.env.VITE_APPWRITE_INVENTORY_COLLECTION_ID || '';
const BROKERS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_BROKERS_COLLECTION_ID || '';
const TRANSFERS_COLLECTION_ID = 'transfers';
const CUSTOMERS_COLLECTION_ID = 'customers';
const EXPENSES_COLLECTION_ID = 'expenses';
const DEBT_PAYMENTS_COLLECTION_ID = 'debt_payments';
const ZAKAT_COLLECTION_ID = 'zakat';
const SUPPLIERS_COLLECTION_ID = 'suppliers';
const SUPPLIER_TRANSACTIONS_COLLECTION_ID = 'supplier_transactions';
const SHOPS_COLLECTION_ID = 'shops';
const USERS_COLLECTION_ID = 'users';
const DEALERS_COLLECTION_ID = 'dealers';
const BUNDLES_COLLECTION_ID = 'bundles';
const YARDS_COLLECTION_ID = 'yards';

export function useSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);
    const handleSyncEvent = () => processQueue();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(SYNC_EVENT, handleSyncEvent);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(SYNC_EVENT, handleSyncEvent);
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (isSyncing || !DATABASE_ID || !navigator.onLine) return;
    
    const queueItems = await db.sync_queue.orderBy('timestamp').toArray();
    if (queueItems.length === 0) return;

    setIsSyncing(true);
    console.log(`Processing ${queueItems.length} sync items...`);

    for (const item of queueItems) {
      try {
        const payload = item.payload as Record<string, unknown>;
        
        if (item.collection === 'sales' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            ID.unique(),
            {
              customerName: payload.customerName,
              customerId: payload.customerId,
              totalAmount: payload.totalAmount,
              status: payload.status,
              date: payload.date,
              localId: payload.id,
              shopId: payload.shopId,
              brokerId: payload.brokerId,
              laadaAmount: payload.laadaAmount,
              createdBy: payload.createdBy,
              items: payload.items ? JSON.stringify(payload.items) : ''
            }
          );
          await db.sales.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'inventory' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            INVENTORY_COLLECTION_ID,
            ID.unique(),
            {
              name: payload.name,
              category: payload.category,
              quantity: payload.quantity,
              unit: payload.unit,
              pricePerUnit: payload.pricePerUnit,
              purchasePrice: payload.purchasePrice,
              purchaseCurrency: payload.purchaseCurrency,
              wholesalePrice: payload.wholesalePrice,
              wholesaleThreshold: payload.wholesaleThreshold,
              photo: payload.photo,
              barcode: payload.barcode,
              shopId: payload.shopId,
              localId: payload.id,
              createdBy: payload.createdBy
            }
          );
          await db.inventory.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'inventory' && item.action === 'UPDATE') {
          const localRecord = await db.inventory.get(payload.id as number);
          if (localRecord?.appwriteId) {
            await databases.updateDocument(
              DATABASE_ID,
              INVENTORY_COLLECTION_ID,
              localRecord.appwriteId,
              { quantity: payload.quantity, updatedAt: payload.updatedAt }
            );
          }
        } else if (item.collection === 'brokers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            BROKERS_COLLECTION_ID,
            ID.unique(),
            { name: payload.name, phone: payload.phone, localId: payload.id }
          );
          await db.brokers.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'customers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            CUSTOMERS_COLLECTION_ID,
            ID.unique(),
            { name: payload.name, phone: payload.phone, localId: payload.id }
          );
          await db.customers.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'expenses' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            EXPENSES_COLLECTION_ID,
            ID.unique(),
            {
              category: payload.category,
              amount: payload.amount,
              description: payload.description,
              date: payload.date,
              shopId: payload.shopId,
              localId: payload.id,
              createdBy: payload.createdBy
            }
          );
          await db.expenses.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'suppliers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            SUPPLIERS_COLLECTION_ID,
            ID.unique(),
            {
              name: payload.name,
              phone: payload.phone,
              currency: payload.currency,
              totalDebt: payload.totalDebt,
              localId: payload.id
            }
          );
          await db.suppliers.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'supplier_transactions' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            SUPPLIER_TRANSACTIONS_COLLECTION_ID,
            ID.unique(),
            {
              supplierId: payload.supplierId,
              amount: payload.amount,
              currency: payload.currency,
              type: payload.type,
              date: payload.date,
              description: payload.description,
              localId: payload.id
            }
          );
          await db.supplier_transactions.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'debt_payments' && item.action === 'CREATE') {
          await databases.createDocument(
            DATABASE_ID,
            DEBT_PAYMENTS_COLLECTION_ID,
            ID.unique(),
            { saleId: payload.saleId, amount: payload.amount, date: payload.date, localId: payload.id }
          );
        } else if (item.collection === 'zakat' && item.action === 'CREATE') {
          await databases.createDocument(
            DATABASE_ID,
            ZAKAT_COLLECTION_ID,
            ID.unique(),
            { amount: payload.amount, totalWealth: payload.totalWealth, date: payload.date, note: payload.note, localId: payload.id }
          );
        } else if (item.collection === 'transfers' && item.action === 'CREATE') {
          await databases.createDocument(
            DATABASE_ID,
            TRANSFERS_COLLECTION_ID,
            ID.unique(),
            { fromShopId: payload.fromShopId, toShopId: payload.toShopId, productId: payload.productId, quantity: payload.quantity, date: payload.date, createdBy: payload.createdBy }
          );
        } else if (item.collection === 'sales' && item.action === 'UPDATE') {
          const localRecord = await db.sales.get(payload.id as number);
          if (localRecord?.appwriteId) {
            await databases.updateDocument(DATABASE_ID, SALES_COLLECTION_ID, localRecord.appwriteId, {
              status: payload.status,
              isReversed: payload.isReversed,
              reversedBy: payload.reversedBy,
              reversalReason: payload.reversalReason,
              updatedAt: payload.updatedAt
            });
          }
        } else if (item.collection === 'dealers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            DEALERS_COLLECTION_ID,
            ID.unique(),
            { name: payload.name, quantity: payload.quantity, priceBought: payload.priceBought, priceSell: payload.priceSell, shopId: payload.shopId, createdBy: payload.createdBy, localId: payload.id }
          );
          await db.dealers.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'bundles' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            BUNDLES_COLLECTION_ID,
            ID.unique(),
            { dealerId: payload.dealerId, quantity: payload.quantity, priceBought: payload.priceBought, priceSell: payload.priceSell, color: payload.color, image: payload.image, shopId: payload.shopId, localId: payload.id }
          );
          await db.bundles.update(payload.id as number, { appwriteId: response.$id });
        } else if (item.collection === 'yards' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            YARDS_COLLECTION_ID,
            ID.unique(),
            { bundleId: payload.bundleId, name: payload.name, color: payload.color, image: payload.image, quantity: payload.quantity, priceBought: payload.priceBought, priceSell: payload.priceSell, shopId: payload.shopId, localId: payload.id }
          );
          await db.yards.update(payload.id as number, { appwriteId: response.$id });
        }
        
        await db.sync_queue.delete(item.id!);
        console.log(`Synced ${item.collection} item`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Sync error:', message, 'for item:', item.collection);
      }
    }
    setIsSyncing(false);
    console.log('Sync queue processed');
  }, [isSyncing]);

  const pullFromCloud = useCallback(async () => {
    if (!DATABASE_ID) {
      console.log('No database configured, skipping pull');
      return;
    }

    setIsSyncing(true);
    console.log('Pulling data from cloud...');

    try {
      if (SALES_COLLECTION_ID) {
        const salesRes = await databases.listDocuments(DATABASE_ID, SALES_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of salesRes.documents) {
          const existing = await db.sales.where('appwriteId').equals(doc.$id).first();
          const saleData = {
            customerName: doc.customerName,
            customerId: doc.customerId,
            totalAmount: doc.totalAmount,
            status: doc.status,
            date: new Date(doc.date),
            shopId: doc.shopId,
            brokerId: doc.brokerId,
            laadaAmount: doc.laadaAmount,
            isReversed: doc.isReversed || false,
            reversedBy: doc.reversedBy,
            reversalReason: doc.reversalReason,
            createdBy: doc.createdBy,
            items: doc.items ? JSON.parse(doc.items) : [],
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.sales.update(existing.id!, saleData);
          } else {
            await db.sales.add(saleData);
          }
        }
        console.log(`Pulled ${salesRes.documents.length} sales`);
      }

      if (INVENTORY_COLLECTION_ID) {
        const invRes = await databases.listDocuments(DATABASE_ID, INVENTORY_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of invRes.documents) {
          const existing = await db.inventory.where('appwriteId').equals(doc.$id).first();
          const itemData = {
            name: doc.name,
            category: doc.category,
            quantity: doc.quantity,
            unit: doc.unit,
            pricePerUnit: doc.pricePerUnit,
            purchasePrice: doc.purchasePrice || 0,
            purchaseCurrency: doc.purchaseCurrency || 'NGN',
            wholesalePrice: doc.wholesalePrice,
            wholesaleThreshold: doc.wholesaleThreshold,
            photo: doc.photo,
            barcode: doc.barcode,
            isRemnant: doc.isRemnant || false,
            shopId: doc.shopId,
            createdBy: doc.createdBy,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.inventory.update(existing.id!, itemData);
          } else {
            await db.inventory.add(itemData);
          }
        }
        console.log(`Pulled ${invRes.documents.length} inventory items`);
      }

      if (BROKERS_COLLECTION_ID) {
        const brokersRes = await databases.listDocuments(DATABASE_ID, BROKERS_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of brokersRes.documents) {
          const existing = await db.brokers.where('appwriteId').equals(doc.$id).first();
          const brokerData = { name: doc.name, phone: doc.phone, appwriteId: doc.$id, updatedAt: new Date(doc.$updatedAt).getTime() };
          if (existing) {
            await db.brokers.update(existing.id!, brokerData);
          } else {
            await db.brokers.add(brokerData);
          }
        }
      }

      if (CUSTOMERS_COLLECTION_ID) {
        const customersRes = await databases.listDocuments(DATABASE_ID, CUSTOMERS_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of customersRes.documents) {
          const existing = await db.customers.where('appwriteId').equals(doc.$id).first();
          const customerData = { name: doc.name, phone: doc.phone, appwriteId: doc.$id, updatedAt: new Date(doc.$updatedAt).getTime() };
          if (existing) {
            await db.customers.update(existing.id!, customerData);
          } else {
            await db.customers.add(customerData);
          }
        }
      }

      if (EXPENSES_COLLECTION_ID) {
        const expensesRes = await databases.listDocuments(DATABASE_ID, EXPENSES_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of expensesRes.documents) {
          const existing = await db.expenses.where('appwriteId').equals(doc.$id).first();
          const expenseData = {
            category: doc.category,
            amount: doc.amount,
            description: doc.description,
            date: new Date(doc.date),
            shopId: doc.shopId,
            createdBy: doc.createdBy,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.expenses.update(existing.id!, expenseData);
          } else {
            await db.expenses.add(expenseData);
          }
        }
      }

      if (SUPPLIERS_COLLECTION_ID) {
        const suppliersRes = await databases.listDocuments(DATABASE_ID, SUPPLIERS_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of suppliersRes.documents) {
          const existing = await db.suppliers.where('appwriteId').equals(doc.$id).first();
          const supplierData = {
            name: doc.name,
            phone: doc.phone,
            currency: doc.currency || 'NGN',
            totalDebt: doc.totalDebt || 0,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.suppliers.update(existing.id!, supplierData);
          } else {
            await db.suppliers.add(supplierData);
          }
        }
      }

      if (SHOPS_COLLECTION_ID) {
        const shopsRes = await databases.listDocuments(DATABASE_ID, SHOPS_COLLECTION_ID, [Query.limit(100)]);
        for (const doc of shopsRes.documents) {
          const existing = await db.shops.where('appwriteId').equals(doc.$id).first();
          const shopData = {
            name: doc.name,
            address: doc.address,
            building: doc.building,
            block: doc.block,
            floor: doc.floor,
            landmark: doc.landmark,
            logo: doc.logo,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.shops.update(existing.id!, shopData);
          } else {
            await db.shops.add(shopData);
          }
        }
        console.log(`Pulled ${shopsRes.documents.length} shops`);
      }

      if (USERS_COLLECTION_ID) {
        const usersRes = await databases.listDocuments(DATABASE_ID, USERS_COLLECTION_ID, [Query.limit(100)]);
        for (const doc of usersRes.documents) {
          const existing = await db.users.where('appwriteId').equals(doc.$id).first();
          const userData = {
            appwriteId: doc.appwriteId || doc.$id,
            name: doc.name,
            phone: doc.phone,
            email: doc.email,
            role: doc.role || 'sales_boy',
            shopIds: doc.shopIds || [],
            isActive: doc.isActive ?? true,
            lastLogin: doc.lastLogin ? new Date(doc.lastLogin) : undefined,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.users.update(existing.id!, userData);
          } else {
            await db.users.add(userData);
          }
        }
        console.log(`Pulled ${usersRes.documents.length} users`);
      }

      if (DEALERS_COLLECTION_ID) {
        const dealersRes = await databases.listDocuments(DATABASE_ID, DEALERS_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of dealersRes.documents) {
          const existing = await db.dealers.where('appwriteId').equals(doc.$id).first();
          const dealerData = {
            name: doc.name,
            quantity: doc.quantity,
            priceBought: doc.priceBought,
            priceSell: doc.priceSell,
            shopId: doc.shopId,
            createdBy: doc.createdBy,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.dealers.update(existing.id!, dealerData);
          } else {
            await db.dealers.add(dealerData);
          }
        }
        console.log(`Pulled ${dealersRes.documents.length} dealers`);
      }

      if (BUNDLES_COLLECTION_ID) {
        const bundlesRes = await databases.listDocuments(DATABASE_ID, BUNDLES_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of bundlesRes.documents) {
          const existing = await db.bundles.where('appwriteId').equals(doc.$id).first();
          const bundleData = {
            dealerId: doc.dealerId,
            quantity: doc.quantity,
            priceBought: doc.priceBought,
            priceSell: doc.priceSell,
            color: doc.color,
            image: doc.image,
            shopId: doc.shopId,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.bundles.update(existing.id!, bundleData);
          } else {
            await db.bundles.add(bundleData);
          }
        }
        console.log(`Pulled ${bundlesRes.documents.length} bundles`);
      }

      if (YARDS_COLLECTION_ID) {
        const yardsRes = await databases.listDocuments(DATABASE_ID, YARDS_COLLECTION_ID, [Query.limit(5000)]);
        for (const doc of yardsRes.documents) {
          const existing = await db.yards.where('appwriteId').equals(doc.$id).first();
          const yardData = {
            bundleId: doc.bundleId,
            name: doc.name,
            color: doc.color,
            image: doc.image,
            quantity: doc.quantity,
            priceBought: doc.priceBought,
            priceSell: doc.priceSell,
            shopId: doc.shopId,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
          if (existing) {
            await db.yards.update(existing.id!, yardData);
          } else {
            await db.yards.add(yardData);
          }
        }
        console.log(`Pulled ${yardsRes.documents.length} yards`);
      }

      console.log('Pull from cloud complete!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Pull from cloud error:', message);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return { isOnline, isSyncing, processQueue, pullFromCloud };
}