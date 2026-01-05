# KwariBook 🚀

Specialized Business Management System for traders in **Kantin Kwari, Kano**. Built for Northern Nigeria's largest textile market.

## 🌟 What makes it unique?
- **Hausa First:** Native toggle between English and Hausa.
- **Anti-Scam:** Community flagging for fake alerts and a transfer verification checklist.
- **Remnant Tracking:** Automated management of "Rage-rage" (leftover yards).
- **Alhaji Mode:** Privacy toggle to hide money from staff.
- **Offline-First:** Works in the thick of the market with zero signal.

## 🛠 Tech Stack
- **Frontend:** React 18 + Vite + **Tailwind CSS v4**
- **PWA:** Full offline caching and home screen installation.
- **Database:** **Dexie.js** (Local IndexedDB) for speed and offline persistence.
- **Cloud:** **Appwrite** for Authentication, Sync, and Cloud Storage.
- **Reporting:** **jsPDF** for professional Bank and Customer statements.

## 📖 Comprehensive Guides
- [User Manual (English & Hausa)](./MANUAL.md)
- [Full Technical Documentation](./FULL_PROJECT_DOCUMENTATION.md)

## 🚀 Features Implemented
- [x] **Dual Authentication:** Phone OTP & Email Magic Link.
- [x] **Multi-Shop Control:** Manage multiple shops and stock transfers.
- [x] **Audit Trail:** Anti-theft logs and sale reversals.
- [x] **Smart Inventory:** Tracking by Bales, Bundles, and Suits with Wholesale logic.
- [x] **Financial Intelligence:** Net Profit (Revenue - Cost - Expenses) and Daily Reconciliation.
- [x] **Customer CRM:** Loyalty star ratings based on "Bashi" repayment history.
- [x] **Market Logistics:** Digital Waybills for porters (Yan Dako) and Supplier Payables.
- [x] **Professional Branding:** Canvas-based receipts and Digital Business Cards.
- [x] **Specialized Tools:** Zakat (Nisab check) and multi-currency FX converters.
- [x] **Voice & Scan:** Hausa Voice Search and Barcode/QR scanning.

## ⚙️ Setup

### Installation
```bash
bun install
```

### Configure Appwrite
Create a `.env` file based on `.env.example` and run the auto-setup:
```bash
bun run setup_appwrite.ts
```

### Development
```bash
bun dev
```

---
**KwariBook - Built for the market, by the market.**
**KwariBook - An gina shi domin kasuwa, daga kasuwa.**
