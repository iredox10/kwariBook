import type { UserRole } from './db';

export type Permission =
  | 'view_dashboard'
  | 'record_sales'
  | 'view_sales'
  | 'reverse_sales'
  | 'delete_sales'
  | 'view_inventory'
  | 'manage_inventory'
  | 'transfer_stock'
  | 'view_cost_price'
  | 'view_debts'
  | 'record_debt_payments'
  | 'manage_expenses'
  | 'manage_suppliers'
  | 'view_reports'
  | 'view_analytics'
  | 'manage_staff'
  | 'manage_shops'
  | 'export_data'
  | 'toggle_privacy_mode'
  | 'manage_market_dues'
  | 'manage_brokers'
  | 'use_calculators';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'view_dashboard',
    'record_sales',
    'view_sales',
    'reverse_sales',
    'delete_sales',
    'view_inventory',
    'manage_inventory',
    'transfer_stock',
    'view_cost_price',
    'view_debts',
    'record_debt_payments',
    'manage_expenses',
    'manage_suppliers',
    'view_reports',
    'view_analytics',
    'manage_staff',
    'manage_shops',
    'export_data',
    'toggle_privacy_mode',
    'manage_market_dues',
    'manage_brokers',
    'use_calculators'
  ],
  manager: [
    'view_dashboard',
    'record_sales',
    'view_sales',
    'view_inventory',
    'manage_inventory',
    'transfer_stock',
    'view_cost_price',
    'view_debts',
    'record_debt_payments',
    'manage_expenses',
    'manage_suppliers',
    'view_reports',
    'manage_shops',
    'export_data',
    'toggle_privacy_mode',
    'manage_market_dues',
    'manage_brokers',
    'use_calculators'
  ],
  sales_boy: [
    'view_dashboard',
    'record_sales',
    'view_sales',
    'view_inventory',
    'view_debts',
    'record_debt_payments'
  ]
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    owner: 'Owner (Alhaji)',
    manager: 'Manager',
    sales_boy: 'Sales Staff'
  };
  return names[role] || role;
}
