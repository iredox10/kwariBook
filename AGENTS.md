# KwariBook Agent Guide

This repository contains the source code for **KwariBook**, a React-based application for managing shop sales, inventory, and expenses, tailored for the "Kwari" market context (likely Kano, Nigeria, given the Hausa language references and specific terminology like "bashi", "laada").

## 1. Build, Lint, and Test

This project uses **Bun** as the package manager and **Vite** as the build tool.

### Commands
*   **Install Dependencies**:
    ```bash
    bun install
    ```
*   **Development Server**:
    ```bash
    bun run dev
    ```
*   **Build for Production**:
    ```bash
    bun run build
    ```
    *   This runs `tsc -b` (TypeScript build) and `vite build`.
*   **Linting**:
    ```bash
    bun run lint
    ```
    *   Uses ESLint. Run this before committing changes.
*   **Testing**:
    *   *Note*: Currently, there are no test scripts configured in `package.json`.
    *   If you need to add tests, recommend using **Vitest** as it pairs well with Vite.
    *   *Do not* attempt to run `npm test` or `bun test` unless you have explicitly set up the test environment first.

## 2. Code Style & Conventions

### General
*   **Language**: TypeScript. Enforce strict typing.
*   **Formatting**:
    *   Indentation: **2 spaces**.
    *   Semi-colons: **Always**.
    *   Quotes: Single quotes `'` preferred for strings, double quotes `"` for JSX attributes.
*   **Directory Structure**:
    *   `src/components/`: UI Components (PascalCase).
    *   `src/hooks/`: Custom React hooks (camelCase, prefixed with `use`).
    *   `src/lib/`: Core libraries and configurations (e.g., `db.ts` for Dexie).
    *   `src/utils/`: Helper functions.

### Components (React)
*   **Functional Components**: Use function declarations.
    ```tsx
    export function MyComponent({ prop }: Props) { ... }
    ```
*   **Naming**: PascalCase for component filenames and function names (e.g., `AddSaleForm.tsx`).
*   **Props**: Define props with `interface` or `type`.
*   **Styling**:
    *   Use **Tailwind CSS**.
    *   Use the `cn(...)` utility (combines `clsx` and `tailwind-merge`) for conditional class names.
    *   Example: `className={cn("p-4 rounded", isActive && "bg-green-500")}`.

### State & Data Management
*   **Local State**: Use `useState` and `useReducer`.
*   **Database**:
    *   The app uses **Dexie.js** (IndexedDB) for local data persistence.
    *   Access data in components using the `useLiveQuery` hook from `dexie-react-hooks`.
    *   Database schema and logic reside in `src/lib/db.ts`.
*   **Async/Effects**:
    *   Use `useEffect` sparingly. Prefer event handlers or derived state.
    *   Handle async errors with `try/catch` and user-facing feedback (console logs are okay for debugging but alert/toast the user on failure).

### Imports
*   **Grouping**:
    1.  Third-party libraries (React, Lucide, Dexie, etc.).
    2.  Local components.
    3.  Local hooks/utils/lib.
    4.  Styles/Assets.
*   **Style**: Named imports preferred.
    ```tsx
    import { useState } from 'react';
    import { ShoppingBag, Plus } from 'lucide-react';
    import { db } from '../lib/db';
    ```

### Internationalization (i18n)
*   The app supports multiple languages (English/Hausa).
*   Use `useTranslation` hook: `const { t } = useTranslation();`.
*   Do not hardcode text strings; use translation keys (e.g., `t('dashboard')`).

## 3. Specific Rules
*   **"Alhaji" Mode**: Respect the privacy mode (`privacyMode` state) which masks currency values.
*   **Offline First**: The app is designed to work offline (PWA). Ensure features degrade gracefully if the network is unavailable (though Dexie is local, external APIs like Appwrite need checks).
*   **Performance**: Be mindful of re-renders with `useLiveQuery`.

## 4. Environment
*   Node/Bun environment.
*   `.env` files usage for Appwrite Project ID (`VITE_APPWRITE_PROJECT_ID`).
