import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const salesCollectionId = process.env.VITE_APPWRITE_SALES_COLLECTION_ID;
const inventoryCollectionId = process.env.VITE_APPWRITE_INVENTORY_COLLECTION_ID;
const brokersCollectionId = process.env.VITE_APPWRITE_BROKERS_COLLECTION_ID;
const transfersCollectionId = 'transfers';
const shopsCollectionId = 'shops';
const customersCollectionId = 'customers';
const expensesCollectionId = 'expenses';
const debtPaymentsCollectionId = 'debt_payments';
const zakatCollectionId = 'zakat';
const suppliersCollectionId = 'suppliers';
const supplierTransactionsCollectionId = 'supplier_transactions';
const usersCollectionId = 'users';

if (!projectId) console.log('Missing VITE_APPWRITE_PROJECT_ID');
if (!apiKey) console.log('Missing APPWRITE_API_KEY');
if (!databaseId) console.log('Missing VITE_APPWRITE_DATABASE_ID');

if (!projectId || !apiKey || !databaseId) {
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

async function setup() {
  try {
    console.log('Starting Appwrite setup...');

    // 1. Create Database
    try {
      await databases.create(databaseId!, 'KwariBook DB');
      console.log('Database created successfully.');
    } catch (e: any) {
      if (e.code === 409) console.log('Database already exists.');
      else throw e;
    }

    // 2. Setup Sales Collection
    await setupCollection(salesCollectionId!, 'Sales', [
      { key: 'customerName', type: 'string', size: 255, required: true },
      { key: 'customerId', type: 'integer', required: false },
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'shopId', type: 'integer', required: true },
      { key: 'localId', type: 'integer', required: true },
      { key: 'brokerId', type: 'integer', required: false },
      { key: 'laadaAmount', type: 'double', required: false },
      { key: 'createdBy', type: 'string', size: 255, required: true },
      { key: 'isReversed', type: 'boolean', required: false, default: false },
      { key: 'reversedBy', type: 'string', size: 255, required: false },
      { key: 'reversalReason', type: 'string', size: 500, required: false },
      { key: 'items', type: 'string', size: 5000, required: false }, 
    ]);

    // 3. Setup Inventory Collection
    await setupCollection(inventoryCollectionId!, 'Inventory', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'category', type: 'string', size: 255, required: false },
      { key: 'quantity', type: 'double', required: true },
      { key: 'unit', type: 'string', size: 20, required: true },
      { key: 'pricePerUnit', type: 'double', required: true },
      { key: 'purchasePrice', type: 'double', required: true },
      { key: 'purchaseCurrency', type: 'string', size: 10, required: true, default: 'NGN' },
      { key: 'wholesalePrice', type: 'double', required: false },
      { key: 'wholesaleThreshold', type: 'double', required: false },
      { key: 'shopId', type: 'integer', required: true },
      { key: 'localId', type: 'integer', required: true },
      { key: 'createdBy', type: 'string', size: 255, required: true },
      { key: 'photo', type: 'string', size: 100000, required: false }, 
    ]);

    // 4. Setup Brokers Collection
    await setupCollection(brokersCollectionId!, 'Brokers', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 20, required: true },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 5. Setup Customers Collection
    await setupCollection(customersCollectionId, 'Customers', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 20, required: true },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 6. Setup Expenses Collection
    await setupCollection(expensesCollectionId, 'Expenses', [
      { key: 'category', type: 'string', size: 50, required: true },
      { key: 'amount', type: 'double', required: true },
      { key: 'description', type: 'string', size: 500, required: false },
      { key: 'date', type: 'datetime', required: true },
      { key: 'shopId', type: 'integer', required: true },
      { key: 'localId', type: 'integer', required: true },
      { key: 'createdBy', type: 'string', size: 255, required: true },
    ]);

    // 7. Setup Transfers Collection
    await setupCollection(transfersCollectionId, 'Transfers', [
      { key: 'fromShopId', type: 'integer', required: true },
      { key: 'toShopId', type: 'integer', required: true },
      { key: 'productId', type: 'integer', required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'createdBy', type: 'string', size: 255, required: true },
    ]);

    // 8. Setup Shops Collection
    await setupCollection(shopsCollectionId, 'Shops', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'address', type: 'string', size: 500, required: true },
      { key: 'building', type: 'string', size: 255, required: false },
      { key: 'block', type: 'string', size: 50, required: false },
      { key: 'floor', type: 'string', size: 50, required: false },
      { key: 'landmark', type: 'string', size: 255, required: false },
      { key: 'logo', type: 'string', size: 100000, required: false },
    ]);

    // 9. Setup Debt Payments Collection
    await setupCollection(debtPaymentsCollectionId, 'Debt Payments', [
      { key: 'saleId', type: 'integer', required: true },
      { key: 'amount', type: 'double', required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 10. Setup Zakat Collection
    await setupCollection(zakatCollectionId, 'Zakat Records', [
      { key: 'amount', type: 'double', required: true },
      { key: 'totalWealth', type: 'double', required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'note', type: 'string', size: 500, required: false },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 11. Setup Suppliers Collection
    await setupCollection(suppliersCollectionId, 'Suppliers', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 20, required: false },
      { key: 'currency', type: 'string', size: 10, required: true, default: 'NGN' },
      { key: 'totalDebt', type: 'double', required: true, default: 0 },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 12. Setup Supplier Transactions Collection
    await setupCollection(supplierTransactionsCollectionId, 'Supplier Transactions', [
      { key: 'supplierId', type: 'integer', required: true },
      { key: 'amount', type: 'double', required: true },
      { key: 'currency', type: 'string', size: 10, required: true },
      { key: 'rate', type: 'double', required: false },
      { key: 'type', type: 'string', size: 20, required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'description', type: 'string', size: 500, required: false },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 13. Setup Users Collection (for multi-device sync)
    await setupCollection(usersCollectionId, 'Users', [
      { key: 'appwriteId', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 20, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'role', type: 'string', size: 20, required: true, default: 'sales_boy' },
      { key: 'shopIds', type: 'string', size: 1000, required: false },
      { key: 'isActive', type: 'boolean', required: true, default: true },
    ]);

    console.log('Appwrite setup completed successfully!');
  } catch (error: any) {
    console.error('Setup failed:', error.message);
  }
}

async function setupCollection(id: string, name: string, attributes: any[]) {
  try {
    await databases.createCollection(databaseId!, id, name);
    console.log(`Collection "${name}" created.`);
  } catch (e: any) {
    if (e.code === 409) console.log(`Collection "${name}" already exists.`);
    else throw e;
  }

  for (const attr of attributes) {
    try {
      if (attr.type === 'string') {
        await databases.createStringAttribute(databaseId!, id, attr.key, attr.size, attr.required, attr.default);
      } else if (attr.type === 'double') {
        await databases.createFloatAttribute(databaseId!, id, attr.key, attr.required, undefined, undefined, attr.default);
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(databaseId!, id, attr.key, attr.required, undefined, undefined, attr.default);
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(databaseId!, id, attr.key, attr.required, attr.default);
      } else if (attr.type === 'boolean') {
        await databases.createBooleanAttribute(databaseId!, id, attr.key, attr.required, attr.default);
      }
      console.log(`Attribute "${attr.key}" added to "${name}".`);
    } catch (e: any) {
      if (e.code === 409) console.log(`Attribute "${attr.key}" already exists in "${name}".`);
      else console.error(`Error adding attribute "${attr.key}":`, e.message);
    }
  }
}

setup();
