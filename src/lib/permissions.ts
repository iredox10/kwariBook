import type { UserRole } from './db';

export type Permission =
  | 'view_dashboard'
  | 'view_reports'
  | 'manage_inventory'
  | 'manage_staff'
  | 'delete_sales'
  | 'manage_expenses'
  | 'manage_suppliers'
  | 'view_cost_price'
  | 'view_analytics';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'view_dashboard',
    'view_reports',
    'manage_inventory',
    'manage_staff',
    'delete_sales',
    'manage_expenses',
    'manage_suppliers',
    'view_cost_price',
    'view_analytics'
  ],
  manager: [
    'view_dashboard',
    'view_reports',
    'manage_inventory',
    'manage_expenses',
    'manage_suppliers',
    'view_cost_price'
  ],
  sales_boy: [
    'view_dashboard'
  ]
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
