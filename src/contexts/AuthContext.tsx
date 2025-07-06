import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  preferences: {
    theme: string;
    notifications: boolean;
    language: string;
  };
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profileData: any) => Promise<boolean>;
  getInitials: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      console.log('Auth Context: Checking auth status', {
        hasToken: !!token,
        hasStoredUser: !!storedUser,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });
      
      if (token && storedUser) {
        try {
          // Parse stored user first
          const userData = JSON.parse(storedUser);
          console.log('Auth Context: Found stored user:', userData.name, userData.email);
          
          // Verify token is still valid
          const response = await authAPI.getCurrentUser();
          console.log('Auth Context: Token validation successful');
          
          // Use fresh data from server
          setUser(response.data);
          
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(response.data));
          
        } catch (error: any) {
          console.error('Auth Context: Token validation failed:', error.response?.data || error.message);
          // Clear invalid auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        console.log('Auth Context: No valid auth data found');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth Context: Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Auth Context: Attempting login for:', email);
      const response = await authAPI.login({ email, password });
      const { token, user: userData } = response.data;
      
      console.log('Auth Context: Login response received:', { 
        hasToken: !!token, 
        hasUser: !!userData,
        userName: userData?.name,
        userEmail: userData?.email
      });
      
      if (!token || !userData) {
        throw new Error('Invalid response from server - missing token or user data');
      }
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      console.log('Auth Context: Login successful, user state updated');
      toast.success('Login successful!');
      return true;
    } catch (error: any) {
      console.error('Auth Context: Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Login failed');
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      console.log('Auth Context: Attempting registration for:', email);
      const response = await authAPI.register({ name, email, password });
      const { token, user: userData } = response.data;
      
      console.log('Auth Context: Registration response received:', { 
        hasToken: !!token, 
        hasUser: !!userData,
        userName: userData?.name,
        userEmail: userData?.email
      });
      
      if (!token || !userData) {
        throw new Error('Invalid response from server - missing token or user data');
      }
      
      // Store auth data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setUser(userData);
      
      console.log('Auth Context: Registration successful, user state updated');
      toast.success('Registration successful!');
      return true;
    } catch (error: any) {
      console.error('Auth Context: Registration error:', error.response?.data || error.message);
      toast.error(error.response?.data?.error || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    console.log('Auth Context: Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData: any): Promise<boolean> => {
    try {
      console.log('Auth Context: Updating profile');
      const response = await authAPI.updateProfile(profileData);
      setUser(response.data.user);
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      toast.success('Profile updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Auth Context: Profile update error:', error);
      toast.error(error.response?.data?.error || 'Profile update failed');
      return false;
    }
  };

  const getInitials = (): string => {
    if (!user) return 'U';
    return user.name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    getInitials
  };

  console.log('Auth Context: Current state:', { 
    hasUser: !!user, 
    loading, 
    userName: user?.name,
    userEmail: user?.email
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};