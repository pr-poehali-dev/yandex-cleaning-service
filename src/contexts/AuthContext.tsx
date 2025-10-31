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
    const verifyStoredToken = async () => {
      const storedToken = localStorage.getItem('sessionToken');
      const storedUser = localStorage.getItem('user');
      
      console.log('🔐 AuthContext: Checking stored token...', { hasToken: !!storedToken, hasUser: !!storedUser });
      
      if (!storedToken || !storedUser) {
        console.log('❌ AuthContext: No token or user in localStorage');
        setIsLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        
        console.log('🌐 AuthContext: Verifying token with backend...');
        const response = await fetch('https://functions.poehali.dev/06df3397-13af-46f0-946a-f5d38aa6f60f?endpoint=verify', {
          method: 'GET',
          headers: {
            'X-Session-Token': storedToken
          }
        });

        console.log('📡 AuthContext: Backend response:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ AuthContext: Token validation result:', data);
          if (data.valid) {
            setUser(parsedUser);
            setSessionToken(storedToken);
          } else {
            console.log('❌ AuthContext: Token invalid, clearing storage');
            localStorage.clear();
            setUser(null);
            setSessionToken(null);
          }
        } else {
          console.log('❌ AuthContext: Backend rejected token, clearing storage');
          localStorage.clear();
          setUser(null);
          setSessionToken(null);
        }
      } catch (error) {
        console.error('❌ AuthContext: Token verification failed:', error);
        localStorage.clear();
        setUser(null);
        setSessionToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyStoredToken();
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
    console.log('🚪 AuthContext: Logging out...');
    localStorage.clear();
    setUser(null);
    setSessionToken(null);
    window.location.href = '/auth';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};