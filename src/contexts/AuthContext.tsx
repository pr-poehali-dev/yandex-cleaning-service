import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  phone: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (phone: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (phone: string) => {
    const response = await fetch('https://functions.poehali.dev/25f40378-63b1-483f-8211-dfd2ccbe897b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    
    if (!response.ok) {
      throw new Error('Failed to login');
    }
    
    const userData = await response.json();
    const newUser: User = {
      id: userData.id,
      phone: userData.phone,
      createdAt: userData.createdAt
    };
    
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('userId', String(newUser.id));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};