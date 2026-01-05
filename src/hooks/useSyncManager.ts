import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { databases } from '../api/appwrite';
import { ID } from 'appwrite';

// Configuration from environment variables
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

  useEffect(() => {
    if (isOnline) {
      processQueue();
    }
  }, [isOnline]);

  const processQueue = async () => {
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
      } catch (error: any) {
        console.error('Sync error:', error.message);
        break;
      }
    }
    setIsSyncing(false);
  };

  return { isOnline, isSyncing, processQueue };
}
