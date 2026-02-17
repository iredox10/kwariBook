import type { UserRole } from './db';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Wallet, 
  Calculator, 
  BarChart3, 
  Settings as SettingsIcon,
  Truck,
  Receipt,
  Gavel,
  BookOpen,
  type LucideIcon
} from 'lucide-react';

export interface NavItem {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  allowedRoles: UserRole[];
  order: number;
  showInMobile?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, allowedRoles: ['owner', 'manager', 'sales_boy'], order: 1, showInMobile: true },
  { id: 'sales', labelKey: 'sales', icon: ShoppingBag, allowedRoles: ['owner', 'manager', 'sales_boy'], order: 2, showInMobile: true },
  { id: 'inventory', labelKey: 'inventory', icon: Package, allowedRoles: ['owner', 'manager', 'sales_boy'], order: 3, showInMobile: true },
  { id: 'bashi', labelKey: 'bashi', icon: Wallet, allowedRoles: ['owner', 'manager', 'sales_boy'], order: 4, showInMobile: true },
  { id: 'expenses', labelKey: 'expenses', icon: Receipt, allowedRoles: ['owner', 'manager'], order: 5, showInMobile: false },
  { id: 'suppliers', labelKey: 'suppliers', icon: Truck, allowedRoles: ['owner', 'manager'], order: 6, showInMobile: false },
  { id: 'market_dues', labelKey: 'market_dues', icon: Gavel, allowedRoles: ['owner', 'manager'], order: 7, showInMobile: false },
  { id: 'brokers', labelKey: 'brokers', icon: Users, allowedRoles: ['owner', 'manager'], order: 8, showInMobile: false },
  { id: 'calculators', labelKey: 'calculators', icon: Calculator, allowedRoles: ['owner', 'manager'], order: 9, showInMobile: false },
  { id: 'reports', labelKey: 'reports', icon: BarChart3, allowedRoles: ['owner', 'manager'], order: 10, showInMobile: false },
  { id: 'staff', labelKey: 'staff', icon: Users, allowedRoles: ['owner'], order: 11, showInMobile: false },
  { id: 'manual', labelKey: 'manual', icon: BookOpen, allowedRoles: ['owner', 'manager', 'sales_boy'], order: 12, showInMobile: false },
  { id: 'settings', labelKey: 'settings', icon: SettingsIcon, allowedRoles: ['owner', 'manager', 'sales_boy'], order: 13, showInMobile: false },
];

export function getNavItemsForRole(role: UserRole | undefined): NavItem[] {
  if (!role) return NAV_ITEMS.filter(i => ['dashboard', 'sales', 'inventory', 'bashi', 'manual', 'settings'].includes(i.id));
  return NAV_ITEMS.filter(item => item.allowedRoles.includes(role)).sort((a, b) => a.order - b.order);
}

export function getMobileNavItemsForRole(role: UserRole | undefined): NavItem[] {
  return getNavItemsForRole(role).filter(item => item.showInMobile);
}

export const ROLE_INFO: Record<UserRole, { title: string; titleHausa: string; description: string; color: string }> = {
  owner: {
    title: 'Owner',
    titleHausa: 'Mai Gida',
    description: 'Full access to all features and settings',
    color: 'text-kwari-green'
  },
  manager: {
    title: 'Manager',
    titleHausa: 'Manaja',
    description: 'Manage operations, inventory, and expenses',
    color: 'text-blue-600'
  },
  sales_boy: {
    title: 'Sales Staff',
    titleHausa: 'Yaron Kasuwa',
    description: 'Record sales and view inventory',
    color: 'text-amber-600'
  }
};

export const FEATURES = {
  canAddSale: (role: UserRole | undefined) => role ? ['owner', 'manager', 'sales_boy'].includes(role) : false,
  canReverseSale: (role: UserRole | undefined) => role === 'owner',
  canDeleteSale: (role: UserRole | undefined) => role === 'owner',
  canAddInventory: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canEditInventory: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canTransferStock: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canViewInventory: (role: UserRole | undefined) => role ? ['owner', 'manager', 'sales_boy'].includes(role) : false,
  canViewCostPrice: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canManageExpenses: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canManageSuppliers: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canViewReports: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canViewAnalytics: (role: UserRole | undefined) => role === 'owner',
  canRecordDebtPayment: (role: UserRole | undefined) => role ? ['owner', 'manager', 'sales_boy'].includes(role) : false,
  canViewDebts: (role: UserRole | undefined) => role ? ['owner', 'manager', 'sales_boy'].includes(role) : false,
  canManageStaff: (role: UserRole | undefined) => role === 'owner',
  canManageShops: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canExportData: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canTogglePrivacyMode: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canManageMarketDues: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canManageBrokers: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
  canUseCalculators: (role: UserRole | undefined) => role ? ['owner', 'manager'].includes(role) : false,
} as const;
