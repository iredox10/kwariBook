import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UserRole } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { User, Shield, UserX, UserCheck, Plus } from 'lucide-react';
import { clsx } from 'clsx';

export function StaffView() {
  const { user: currentUser } = useAuth();
  const users = useLiveQuery(() => db.users.toArray());
  const [showInvite, setShowInvite] = useState(false);
  
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('sales_boy');

  const updateUserRole = async (userId: number, newRole: UserRole) => {
    if (!userId) return;
    await db.users.update(userId, { role: newRole, updatedAt: Date.now() });
  };

  const toggleUserStatus = async (userId: number, currentStatus: boolean) => {
    if (!userId) return;
    await db.users.update(userId, { isActive: !currentStatus, updatedAt: Date.now() });
  };

  const inviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format phone number
    let formattedPhone = newStaffPhone.trim();
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+234' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+234' + formattedPhone;
    }

    await db.users.add({
       appwriteId: 'pending_' + formattedPhone, // Placeholder
       name: newStaffName,
       phone: formattedPhone,
       role: newStaffRole,
       isActive: true,
       shopIds: [],
       updatedAt: Date.now()
    });
    
    setShowInvite(false);
    setNewStaffName('');
    setNewStaffPhone('');
    alert('Staff added! When they login with this phone number, they will automatically get access.');
  };

  if (currentUser?.role !== 'owner') {
    return (
       <div className="p-8 text-center flex flex-col items-center justify-center h-full">
         <Shield size={48} className="text-red-500 mb-4" />
         <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
         <p className="text-gray-500 mt-2">Only the Alhaji (Owner) can manage staff.</p>
       </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Staff Management</h2>
           <p className="text-gray-500">Manage who has access to your shop.</p>
        </div>
        {!showInvite && (
            <button 
            onClick={() => setShowInvite(true)}
            className="bg-kwari-green text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-green-100"
            >
            <Plus size={20} />
            <span>Add Staff</span>
            </button>
        )}
      </div>

      {showInvite && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-in slide-in-from-top-4 fade-in">
           <h3 className="font-bold text-gray-800 mb-4">Add New Staff</h3>
           <form onSubmit={inviteStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                <input 
                  required
                  type="text" 
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-kwari-green"
                  placeholder="e.g. Musa Ibrahim"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input 
                  required
                  type="tel" 
                  value={newStaffPhone}
                  onChange={e => setNewStaffPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-kwari-green"
                  placeholder="e.g. 08012345678"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                <select 
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value as UserRole)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-kwari-green"
                >
                  <option value="sales_boy">Sales Boy (Can only sell)</option>
                  <option value="manager">Manager (Can manage stock)</option>
                  <option value="owner">Co-Owner (Full Access)</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-2">
                 <button type="button" onClick={() => setShowInvite(false)} className="flex-1 p-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                 <button type="submit" className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-xl shadow-lg shadow-green-100 hover:bg-opacity-90 transition-colors">Add Staff</button>
              </div>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {users?.map(user => (
           <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                 <div className={clsx("p-3 rounded-full", user.isActive ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400")}>
                    <User size={24} />
                 </div>
                 <div>
                    <p className="font-bold text-gray-800">{user.name} {user.appwriteId === currentUser?.appwriteId && '(You)'}</p>
                    <p className="text-xs text-gray-500">{user.phone || 'No phone'}</p>
                    <div className="flex items-center mt-1 space-x-2">
                       <span className={clsx("text-[10px] font-black uppercase px-2 py-0.5 rounded", 
                           user.role === 'owner' ? "bg-purple-100 text-purple-600" :
                           user.role === 'manager' ? "bg-amber-100 text-amber-600" :
                           "bg-gray-100 text-gray-600"
                       )}>
                           {user.role.replace('_', ' ')}
                       </span>
                       {!user.isActive && <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
                       {user.appwriteId?.startsWith('pending_') && <span className="text-[10px] font-black uppercase bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded">Pending</span>}
                    </div>
                 </div>
              </div>

              {user.appwriteId !== currentUser?.appwriteId && (
                <div className="flex items-center space-x-2 self-end sm:self-auto">
                   <select 
                     value={user.role}
                     onChange={(e) => updateUserRole(user.id!, e.target.value as UserRole)}
                     className="text-xs font-bold bg-gray-50 p-2 rounded-lg border-none outline-none focus:ring-1 focus:ring-kwari-green"
                   >
                      <option value="sales_boy">Sales Boy</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                   </select>
                   <button 
                     onClick={() => toggleUserStatus(user.id!, user.isActive)}
                     className={clsx("p-2 rounded-lg transition-colors", user.isActive ? "text-red-500 hover:bg-red-50" : "text-green-500 hover:bg-green-50")}
                     title={user.isActive ? "Deactivate" : "Activate"}
                   >
                      {user.isActive ? <UserX size={20} /> : <UserCheck size={20} />}
                   </button>
                </div>
              )}
           </div>
        ))}
      </div>
    </div>
  );
}
