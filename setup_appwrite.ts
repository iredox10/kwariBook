import { Client, Databases, ID } from 'node-appwrite';

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID;
const salesCollectionId = process.env.VITE_APPWRITE_SALES_COLLECTION_ID;
const inventoryCollectionId = process.env.VITE_APPWRITE_INVENTORY_COLLECTION_ID;
const brokersCollectionId = process.env.VITE_APPWRITE_BROKERS_COLLECTION_ID;
const transfersCollectionId = 'transfers';
const shopsCollectionId = 'shops';

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
      { key: 'totalAmount', type: 'double', required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'date', type: 'datetime', required: true },
      { key: 'localId', type: 'integer', required: true },
      { key: 'shopId', type: 'integer', required: true },
      { key: 'brokerId', type: 'integer', required: false },
      { key: 'laadaAmount', type: 'double', required: false },
    ]);

    // 3. Setup Inventory Collection
    await setupCollection(inventoryCollectionId!, 'Inventory', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'category', type: 'string', size: 255, required: false },
      { key: 'quantity', type: 'double', required: true },
      { key: 'unit', type: 'string', size: 20, required: true },
      { key: 'pricePerUnit', type: 'double', required: true },
      { key: 'shopId', type: 'integer', required: true },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 4. Setup Brokers Collection
    await setupCollection(brokersCollectionId!, 'Brokers', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 20, required: true },
      { key: 'localId', type: 'integer', required: true },
    ]);

    // 5. Setup Transfers Collection
    await setupCollection(transfersCollectionId, 'Transfers', [
      { key: 'fromShopId', type: 'integer', required: true },
      { key: 'toShopId', type: 'integer', required: true },
      { key: 'productId', type: 'integer', required: true },
      { key: 'quantity', type: 'double', required: true },
      { key: 'date', type: 'datetime', required: true },
    ]);

    // 6. Setup Shops Collection
    await setupCollection(shopsCollectionId, 'Shops', [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'address', type: 'string', size: 500, required: true },
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
        await databases.createStringAttribute(databaseId!, id, attr.key, attr.size, attr.required);
      } else if (attr.type === 'double') {
        await databases.createFloatAttribute(databaseId!, id, attr.key, attr.required);
      } else if (attr.type === 'integer') {
        await databases.createIntegerAttribute(databaseId!, id, attr.key, attr.required);
      } else if (attr.type === 'datetime') {
        await databases.createDatetimeAttribute(databaseId!, id, attr.key, attr.required);
      }
      console.log(`Attribute "${attr.key}" added to "${name}".`);
    } catch (e: any) {
      if (e.code === 409) console.log(`Attribute "${attr.key}" already exists in "${name}".`);
      else console.error(`Error adding attribute "${attr.key}":`, e.message);
    }
  }
}

setup();
