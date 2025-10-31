import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: number;
  phone: string;
  createdAt: string;
  sessionToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionToken: string | null;
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
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('sessionToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (typeof parsedUser.id === 'number' && parsedUser.sessionToken) {
          setUser(parsedUser);
          setSessionToken(parsedUser.sessionToken);
        } else {
          localStorage.clear();
        }
      } catch {
        localStorage.clear();
      }
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
      createdAt: userData.createdAt,
      sessionToken: userData.sessionToken
    };
    
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('sessionToken', userData.sessionToken);
    setSessionToken(userData.sessionToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setSessionToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};