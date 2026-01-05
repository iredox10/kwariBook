import { useState, useEffect } from 'react';
import { account } from '../api/appwrite';
import type { Models } from 'appwrite';

export function useAuth() {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await account.get();
      // Check for 'admin' label or specific metadata. 
      // For this local version, we'll allow setting it via preferences.
      const isAdmin = currentUser.prefs?.role !== 'staff';
      setUser({ ...currentUser, isAdmin } as any);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    try {
      await account.deleteSession('current');
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return { user, loading, checkUser, logout };
}
