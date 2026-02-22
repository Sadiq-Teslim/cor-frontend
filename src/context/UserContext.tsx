// User Context - Global State Management
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, LanguageCode } from '../api/types';
import { userApi } from '../api';

interface UserContextType {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setUserId: (id: string | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_ID_KEY = 'cor_user_id';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserIdState] = useState<string | null>(() => {
    // Load from localStorage on init
    return localStorage.getItem(USER_ID_KEY);
  });
  const [isLoading, setIsLoading] = useState(false);

  const setUserId = (id: string | null) => {
    setUserIdState(id);
    if (id) {
      localStorage.setItem(USER_ID_KEY, id);
    } else {
      localStorage.removeItem(USER_ID_KEY);
    }
  };

  const refreshUser = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await userApi.getUser(userId);
      setUser(response.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // If user not found, clear stored ID
      setUserId(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setUserId(null);
  };

  // Auto-fetch user on mount if userId exists
  useEffect(() => {
    if (userId && !user) {
      refreshUser();
    }
  }, [userId]);

  return (
    <UserContext.Provider
      value={{
        user,
        userId,
        isLoading,
        setUser,
        setUserId,
        refreshUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
