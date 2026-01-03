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
const SHOPS_COLLECTION_ID = 'shops';
const CUSTOMERS_COLLECTION_ID = 'customers';
const EXPENSES_COLLECTION_ID = 'expenses';

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
              laadaAmount: item.payload.laadaAmount
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
                shopId: item.payload.shopId,
                localId: item.payload.id
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
                { quantity: item.payload.quantity }
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
              localId: item.payload.id
            }
          );
          await db.expenses.update(item.payload.id, { appwriteId: response.$id });
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
              date: item.payload.date
            }
          );
        } else if (item.collection === 'shops' && (item.action === 'CREATE' || item.action === 'UPDATE')) {
          if (item.action === 'CREATE') {
            await databases.createDocument(
              DATABASE_ID,
              SHOPS_COLLECTION_ID,
              ID.unique(),
              {
                name: item.payload.name,
                address: item.payload.address
              }
            );
          }
        } else if (item.collection === 'sales' && item.action === 'UPDATE') {
          const localRecord = await db.sales.get(item.payload.id);
          if (localRecord?.appwriteId) {
             await databases.updateDocument(
               DATABASE_ID,
               SALES_COLLECTION_ID,
               localRecord.appwriteId,
               { status: item.payload.status }
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
