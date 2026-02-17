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
      
      // If not found by ID, check by email (for pre-added staff via email invitation)
      if (!existingUser && currentUser.email) {
         const pendingUser = await db.users.filter(u => u.email?.toLowerCase() === currentUser.email?.toLowerCase()).first();
         if (pendingUser) {
            // Link the account
            await db.users.update(pendingUser.id!, {
               appwriteId: currentUser.$id,
               name: currentUser.name || pendingUser.name, 
               phone: currentUser.phone || pendingUser.phone,
               updatedAt: Date.now()
            });
            existingUser = pendingUser;
         }
      }
      
      if (!existingUser) {
        // Check if this is a new user trying to access
        const userCount = await db.users.count();
        
        if (userCount === 0) {
          // First user becomes owner
          await addUser({
            appwriteId: currentUser.$id,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            role: 'owner',
            isActive: true,
            shopIds: []
          });
        } else {
          // Unknown user - do NOT auto-create account
          // They need to be invited first by the owner
          await account.deleteSession('current');
          setAppwriteUser(null);
          alert('Access denied. Please contact the shop owner to be added as staff.');
          return;
        }
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
    } catch {
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
