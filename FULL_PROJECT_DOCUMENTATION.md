# KwariBook: Comprehensive Project Documentation & Technical Guide

## 1. Project Inception & Goal
**KwariBook** was designed to solve the unique challenges faced by textile traders in **Kantin Kwari, Kano**—the largest textile market in Northern Nigeria. Unlike generic bookkeeping apps, KwariBook is built for high-density market environments with low internet connectivity, high cash-handling risks, and complex credit (Bashi) relationships.

**Mission:** To digitize the Northern Nigerian market economy by building trust, ensuring staff accountability, and professionalizing local trade.

---

## 2. Technical Stack (The Engine)
*   **Frontend Framework:** React 18 with Vite (TypeScript).
*   **Styling:** **Tailwind CSS v4** (Utility-first, CSS-variables based architecture).
*   **Local Database:** **Dexie.js** (IndexedDB wrapper). 
    *   *Why?* Enables 100% offline functionality. Every transaction is saved instantly to the device with zero latency.
*   **Cloud Backend:** **Appwrite**.
    *   *Why?* Handles Authentication, Real-time Database Sync, and Serverless Functions.
*   **PWA Engine:** `vite-plugin-pwa`.
    *   *Why?* Allows the app to be "installed" on Android/iOS without an App Store, and caches all assets for offline startup.
*   **State Management:** **TanStack Query v5** + custom **SyncManager**.
*   **Localization:** `i18next` with English and **Native Hausa** support.
*   **PDF Generation:** `jsPDF` + `jspdf-autotable`.
*   **Image Generation:** HTML5 Canvas (for receipts and business cards).
*   **Barcode/QR:** `Html5Qrcode` for scanning and `JsBarcode` for label printing.

---

## 3. Deep Dive: Key Feature Modules

### A. Core Bookkeeping & Sales
*   **Itemized Sales:** Record sales by selecting fabrics directly from inventory.
*   **Automated Pricing:** Supports Retail and Wholesale pricing. The app automatically applies the lower price if the quantity threshold (e.g., 5 bundles) is met.
*   **Staff Tracking:** Every record is tagged with the user who created it (e.g., "Shop Boy Musa").
*   **Anti-Theft Audit Trail:** Records cannot be deleted. If a mistake is made, the Alhaji must "Reverse" the sale with a mandatory reason. Reversing a sale automatically returns the items to stock.

### B. Disruptive "Kwari-Market" Features
*   **Scam Alert (Community Driven):** Alhaji can flag phone numbers associated with "Fake Alerts" (fake SMS transfer notifications). This database is shared to warn other users before they finalize a risky sale.
*   **Fake Alert Verification Checklist:** A mandatory 3-point checklist for transfer payments:
    1. Verify actual Bank App balance.
    2. Confirm Sender Name.
    3. Confirm Bank Push Notification.
*   **Remnant (Rage-rage) Tracking:** When a bundle or bale is cut, the app prompts for the leftover yards/meters. These remnants are added to a special inventory category with an automatic 20% discount.
*   **Maze Navigation:** In Settings, shops define their location by Building, Block, Floor, and Landmark. This data is printed on receipts so customers can find the shop again in the market maze.

### C. Advanced Financial Forensics
*   **Net Profit Report:** Calculates `Total Sales - (Purchase Cost of Goods + Operational Expenses)`.
*   **Daily Reconciliation (End of Day):** Calculates the exact amount of physical cash that should be in the trader's pocket at 6:00 PM.
*   **Partial Debt Payments:** Track credit sales with progress bars. Record installments (e.g., ₦10k now, ₦10k next week) until the debt is cleared.
*   **Zakat Calculator & Ledger:** An Islamic finance module that checks current wealth against the **Nisab threshold** (based on gold price) and tracks historical Zakat payments.

### D. Logistics & Marketing
*   **Supplier Payables:** Track debts owed **to** suppliers in China, Dubai, or local wholesalers in multiple currencies (USD, RMB, NGN).
*   **Digital Waybills:** Instantly generate a delivery note for porters (Yan Dako) and share it via WhatsApp.
*   **Digital Business Card:** Generate a high-quality visual card with the shop's logo and top fabric designs to share with new prospects.
*   **New Arrival Broadcast:** A one-tap tool to share the latest stock patterns with customers on WhatsApp.

---

## 4. Technical Architecture: Offline-to-Cloud Sync
KwariBook uses a **Dual-Write Sync Strategy**:
1.  **Local Write:** Data is saved immediately to Dexie.js (IndexedDB). The UI updates in milliseconds (Optimistic UI).
2.  **Sync Queue:** The action (CREATE/UPDATE/DELETE) is added to a `sync_queue` table.
3.  **Background Processor:** A `useSyncManager` hook listens for internet connectivity. When online, it loops through the queue and pushes data to Appwrite.
4.  **Identity:** UUIDs are generated on the client so that local and cloud records always match without ID conflicts.

---

## 5. Setup & Deployment Guide

### Prerequisites
*   [Bun](https://bun.sh) or Node.js.
*   Appwrite Account (Cloud or Self-hosted).

### Installation
```bash
cd kwaribook
bun install
```

### Environment Variables (.env)
You must create a `.env` file with:
*   `VITE_APPWRITE_ENDPOINT`: Your Appwrite URL.
*   `VITE_APPWRITE_PROJECT_ID`: Your Project ID.
*   `APPWRITE_API_KEY`: Secret key with database/collection write permissions.
*   `VITE_APPWRITE_DATABASE_ID`: The ID for your database.
*   Collection IDs for `sales`, `inventory`, `brokers`, etc.

### Backend Initialization
Run the automated setup script to create all collections and attributes:
```bash
bun run setup_appwrite.ts
```

### Development
```bash
bun dev
```

---

## 6. User Experience & Roles
*   **Alhaji (Admin):** Full access to Net Profit, Expenses, Supplier Debts, and Reversals.
*   **Shop Boy (Staff):** Limited access to Sales and Inventory. Sensitive financial data is hidden.
*   **Privacy Mode:** A global "Eye" toggle that masks all money amounts with `₦ ••••`, allowing the owner to use the app in front of customers or staff without exposing his wealth.

---

## 7. Future Roadmap
*   **AI Fabric Recognition:** Upload a photo and let AI find the matching item in inventory.
*   **Group Buying:** Allowing smaller traders to "Pool" resources to buy a bale from a supplier.
*   **Bank API Integration:** Real-time bank alert verification directly inside the app.

---
**KwariBook - Powering the Giant of the North.**
**KwariBook - Tabbatar da Kasuwancin Arewa.**
