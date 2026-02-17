import { useEffect, useState, useCallback } from 'react';
import { db } from '../lib/db';
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

export function useSyncManager() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (isSyncing || !DATABASE_ID) return;
    
    const queueItems = await db.sync_queue.orderBy('timestamp').toArray();
    if (queueItems.length === 0) return;

    setIsSyncing(true);

    for (const item of queueItems) {
      try {
        if (item.collection === 'sales' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            SALES_COLLECTION_ID,
            ID.unique(),
            {
              customerName: item.payload.customerName,
              customerId: item.payload.customerId,
              totalAmount: item.payload.totalAmount,
              status: item.payload.status,
              date: item.payload.date,
              localId: item.payload.id,
              shopId: item.payload.shopId,
              brokerId: item.payload.brokerId,
              laadaAmount: item.payload.laadaAmount,
              createdBy: item.payload.createdBy,
              items: JSON.stringify(item.payload.items) 
            }
          );
          await db.sales.update(item.payload.id, { appwriteId: response.$id });
        } else if (item.collection === 'inventory' && (item.action === 'CREATE' || item.action === 'UPDATE')) {
          if (item.action === 'CREATE') {
            const response = await databases.createDocument(
              DATABASE_ID,
              INVENTORY_COLLECTION_ID,
              ID.unique(),
              {
                name: item.payload.name,
                category: item.payload.category,
                quantity: item.payload.quantity,
                unit: item.payload.unit,
                pricePerUnit: item.payload.pricePerUnit,
                purchasePrice: item.payload.purchasePrice,
                purchaseCurrency: item.payload.purchaseCurrency,
                wholesalePrice: item.payload.wholesalePrice,
                wholesaleThreshold: item.payload.wholesaleThreshold,
                photo: item.payload.photo,
                barcode: item.payload.barcode,
                shopId: item.payload.shopId,
                localId: item.payload.id,
                createdBy: item.payload.createdBy
              }
            );
            await db.inventory.update(item.payload.id, { appwriteId: response.$id });
          } else {
            const localRecord = await db.inventory.get(item.payload.id);
            if (localRecord?.appwriteId) {
              await databases.updateDocument(
                DATABASE_ID,
                INVENTORY_COLLECTION_ID,
                localRecord.appwriteId,
                { 
                  quantity: item.payload.quantity,
                  updatedAt: item.payload.updatedAt
                }
              );
            }
          }
        } else if (item.collection === 'brokers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            BROKERS_COLLECTION_ID,
            ID.unique(),
            {
              name: item.payload.name,
              phone: item.payload.phone,
              localId: item.payload.id
            }
          );
          await db.brokers.update(item.payload.id, { appwriteId: response.$id });
        } else if (item.collection === 'customers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            CUSTOMERS_COLLECTION_ID,
            ID.unique(),
            {
              name: item.payload.name,
              phone: item.payload.phone,
              localId: item.payload.id
            }
          );
          await db.customers.update(item.payload.id, { appwriteId: response.$id });
        } else if (item.collection === 'expenses' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            EXPENSES_COLLECTION_ID,
            ID.unique(),
            {
              category: item.payload.category,
              amount: item.payload.amount,
              description: item.payload.description,
              date: item.payload.date,
              shopId: item.payload.shopId,
              localId: item.payload.id,
              createdBy: item.payload.createdBy
            }
          );
          await db.expenses.update(item.payload.id, { appwriteId: response.$id });
        } else if (item.collection === 'suppliers' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            SUPPLIERS_COLLECTION_ID,
            ID.unique(),
            {
              name: item.payload.name,
              currency: item.payload.currency,
              totalDebt: item.payload.totalDebt,
              localId: item.payload.id
            }
          );
          await db.suppliers.update(item.payload.id, { appwriteId: response.$id });
        } else if (item.collection === 'supplier_transactions' && item.action === 'CREATE') {
          const response = await databases.createDocument(
            DATABASE_ID,
            SUPPLIER_TRANSACTIONS_COLLECTION_ID,
            ID.unique(),
            {
              supplierId: item.payload.supplierId,
              amount: item.payload.amount,
              currency: item.payload.currency,
              type: item.payload.type,
              date: item.payload.date,
              description: item.payload.description,
              localId: item.payload.id
            }
          );
          await db.supplier_transactions.update(item.payload.id, { appwriteId: response.$id });
        } else if (item.collection === 'debt_payments' && item.action === 'CREATE') {
          await databases.createDocument(
            DATABASE_ID,
            DEBT_PAYMENTS_COLLECTION_ID,
            ID.unique(),
            {
              saleId: item.payload.saleId,
              amount: item.payload.amount,
              date: item.payload.date,
              localId: item.payload.id
            }
          );
        } else if (item.collection === 'zakat' && item.action === 'CREATE') {
          await databases.createDocument(
            DATABASE_ID,
            ZAKAT_COLLECTION_ID,
            ID.unique(),
            {
              amount: item.payload.amount,
              totalWealth: item.payload.totalWealth,
              date: item.payload.date,
              note: item.payload.note,
              localId: item.payload.id
            }
          );
        } else if (item.collection === 'transfers' && item.action === 'CREATE') {
          await databases.createDocument(
            DATABASE_ID,
            TRANSFERS_COLLECTION_ID,
            ID.unique(),
            {
              fromShopId: item.payload.fromShopId,
              toShopId: item.payload.toShopId,
              productId: item.payload.productId,
              quantity: item.payload.quantity,
              date: item.payload.date,
              createdBy: item.payload.createdBy
            }
          );
        } else if (item.collection === 'sales' && item.action === 'UPDATE') {
          const localRecord = await db.sales.get(item.payload.id);
          if (localRecord?.appwriteId) {
             await databases.updateDocument(
               DATABASE_ID,
               SALES_COLLECTION_ID,
               localRecord.appwriteId,
               { 
                 status: item.payload.status,
                 isReversed: item.payload.isReversed,
                 reversedBy: item.payload.reversedBy,
                 reversalReason: item.payload.reversalReason,
                 updatedAt: item.payload.updatedAt
               }
             );
          }
        }
        await db.sync_queue.delete(item.id!);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Sync error:', message);
        break;
      }
    }
    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline, processQueue]);

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
          const brokerData = {
            name: doc.name,
            phone: doc.phone,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
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
          const customerData = {
            name: doc.name,
            phone: doc.phone,
            isFlagged: doc.isFlagged || false,
            appwriteId: doc.$id,
            updatedAt: new Date(doc.$updatedAt).getTime()
          };
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
