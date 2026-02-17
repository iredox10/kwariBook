import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type UserRole } from '../lib/db';
import { useAuth } from '../hooks/useAuth';
import { User, Shield, UserX, UserCheck, Plus, Mail, Clock, Send, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { account } from '../api/appwrite';
import { ID } from 'appwrite';

export function StaffView() {
  const { user: currentUser } = useAuth();
  const users = useLiveQuery(() => db.users.toArray());
  const [showInvite, setShowInvite] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [newStaffEmail, setNewStaffEmail] = useState('');
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
    
    const email = newStaffEmail.trim().toLowerCase();
    
    const existingUser = await db.users.filter(u => u.email?.toLowerCase() === email).first();
    if (existingUser) {
      alert('A user with this email already exists!');
      return;
    }

    setIsSending(true);
    
    try {
      const redirectUrl = window.location.origin;
      await account.createMagicURLToken(
        ID.unique(), 
        email, 
        redirectUrl,
        false
      );

      await db.users.add({
        appwriteId: 'pending_' + email,
        name: newStaffName,
        email: email,
        role: newStaffRole,
        isActive: true,
        shopIds: [],
        updatedAt: Date.now()
      });

      setShowInvite(false);
      setNewStaffName('');
      setNewStaffEmail('');
      alert(`Invitation sent to ${email}! They will receive a magic link to login.`);
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      if (error.message?.includes('already exists')) {
        await db.users.add({
          appwriteId: 'pending_' + email,
          name: newStaffName,
          email: email,
          role: newStaffRole,
          isActive: true,
          shopIds: [],
          updatedAt: Date.now()
        });
        alert(`User already has an account. They have been added as ${newStaffRole.replace('_', ' ')}.`);
        setShowInvite(false);
        setNewStaffName('');
        setNewStaffEmail('');
      } else {
        alert('Failed to send invitation: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setIsSending(false);
    }
  };

  const resendInvite = async (email: string) => {
    if (!confirm(`Resend invitation to ${email}?`)) return;
    
    setIsSending(true);
    try {
      const redirectUrl = window.location.origin;
      await account.createMagicURLToken(
        ID.unique(), 
        email, 
        redirectUrl,
        false
      );
      alert(`Invitation resent to ${email}!`);
    } catch (error: any) {
      alert('Failed to resend: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSending(false);
    }
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
           <p className="text-gray-500">Add staff via email invitation.</p>
        </div>
        {!showInvite && (
            <button 
            onClick={() => setShowInvite(true)}
            className="bg-kwari-green text-white p-3 rounded-xl flex items-center space-x-2 font-bold shadow-lg shadow-green-100"
            >
            <Plus size={20} />
            <span>Invite Staff</span>
            </button>
        )}
      </div>

      {showInvite && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <h3 className="font-bold text-gray-800 mb-4">Invite New Staff</h3>
           <form onSubmit={inviteStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
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
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    required
                    type="email" 
                    value={newStaffEmail}
                    onChange={e => setNewStaffEmail(e.target.value)}
                    className="w-full pl-10 p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-kwari-green"
                    placeholder="staff@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                <select 
                  value={newStaffRole}
                  onChange={e => setNewStaffRole(e.target.value as UserRole)}
                  className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-kwari-green"
                >
                  <option value="sales_boy">Sales Staff - Record sales, view inventory</option>
                  <option value="manager">Manager - Manage inventory, expenses, reports</option>
                  <option value="owner">Co-Owner - Full access</option>
                </select>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-700">
                <strong>Note:</strong> An email with a magic login link will be sent to this address. The staff member can click the link to instantly log in and access KwariBook.
              </div>
              <div className="flex space-x-3 pt-2">
                 <button 
                   type="button" 
                   onClick={() => setShowInvite(false)} 
                   className="flex-1 p-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                   disabled={isSending}
                 >
                   Cancel
                 </button>
                 <button 
                   type="submit" 
                   disabled={isSending}
                   className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-xl shadow-lg shadow-green-100 hover:bg-opacity-90 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                 >
                   {isSending ? (
                     <>
                       <Loader2 size={18} className="animate-spin" />
                       <span>Sending...</span>
                     </>
                   ) : (
                     <>
                       <Send size={18} />
                       <span>Send Invitation</span>
                     </>
                   )}
                 </button>
              </div>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {users?.map(user => {
          const isPending = user.appwriteId?.startsWith('pending_');
          return (
            <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                 <div className={clsx("p-3 rounded-full", 
                   isPending ? "bg-yellow-50 text-yellow-600" :
                   user.isActive ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                 )}>
                    {isPending ? <Clock size={24} /> : <User size={24} />}
                 </div>
                 <div>
                    <p className="font-bold text-gray-800">{user.name} {user.appwriteId === currentUser?.appwriteId && '(You)'}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Mail size={12} />
                      {user.email || 'No email'}
                    </p>
                    <div className="flex items-center mt-1 space-x-2 flex-wrap gap-y-1">
                       <span className={clsx("text-[10px] font-black uppercase px-2 py-0.5 rounded", 
                           user.role === 'owner' ? "bg-purple-100 text-purple-600" :
                           user.role === 'manager' ? "bg-amber-100 text-amber-600" :
                           "bg-gray-100 text-gray-600"
                       )}>
                           {user.role.replace('_', ' ')}
                       </span>
                       {!user.isActive && <span className="text-[10px] font-black uppercase bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactive</span>}
                       {isPending && <span className="text-[10px] font-black uppercase bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded">Pending</span>}
                    </div>
                 </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                 {isPending && user.email && (
                   <button
                     onClick={() => resendInvite(user.email!)}
                     disabled={isSending}
                     className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                     title="Resend invitation"
                   >
                     <Send size={18} />
                   </button>
                 )}
                 {user.appwriteId !== currentUser?.appwriteId && (
                   <>
                     <select 
                       value={user.role}
                       onChange={(e) => updateUserRole(user.id!, e.target.value as UserRole)}
                       className="text-xs font-bold bg-gray-50 p-2 rounded-lg border-none outline-none focus:ring-1 focus:ring-kwari-green"
                     >
                       <option value="sales_boy">Sales Staff</option>
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
                   </>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
