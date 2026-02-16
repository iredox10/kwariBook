import { useState, useEffect } from 'react';
import { account } from '../api/appwrite';
import type { Models } from 'appwrite';
import { db, addUser } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

export function useAuth() {
  const [appwriteUser, setAppwriteUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await account.get();
      setAppwriteUser(currentUser);

      // Check if user exists locally
      let existingUser = await db.users.where('appwriteId').equals(currentUser.$id).first();
      
      // If not found by ID, check by phone (for pre-added staff)
      if (!existingUser && currentUser.phone) {
         const pendingUser = await db.users.filter(u => u.phone === currentUser.phone).first();
         if (pendingUser) {
            // Link the account
            await db.users.update(pendingUser.id!, {
               appwriteId: currentUser.$id,
               // Use the Appwrite name if available, otherwise keep the pre-set name
               name: currentUser.name || pendingUser.name, 
               email: currentUser.email || pendingUser.email,
               updatedAt: Date.now()
            });
            existingUser = pendingUser;
         }
      }
      
      if (!existingUser) {
        // First user is owner, others are sales_boy
        const userCount = await db.users.count();
        const role = userCount === 0 ? 'owner' : 'sales_boy';
        
        await addUser({
          appwriteId: currentUser.$id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone,
          role: role,
          isActive: true,
          shopIds: [] // Empty means access to all or none? Let's assume empty = all for owner, none for others unless specified
        });
      } else {
        // Update local details if changed on Appwrite (optional, but good practice)
        if (existingUser.name !== currentUser.name || existingUser.phone !== currentUser.phone) {
           await db.users.update(existingUser.id!, {
             name: currentUser.name,
             phone: currentUser.phone,
             updatedAt: Date.now()
           });
        }
      }
    } catch (err) {
      setAppwriteUser(null);
    } finally {
      setLoading(false);
    }
  }

  const user = useLiveQuery(
    async () => {
      if (!appwriteUser?.$id) return null;
      return await db.users.where('appwriteId').equals(appwriteUser.$id).first();
    },
    [appwriteUser?.$id]
  );

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setAppwriteUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return { 
    user, 
    loading, 
    isAuthenticated: !!appwriteUser,
    checkUser, 
    logout 
  };
}
