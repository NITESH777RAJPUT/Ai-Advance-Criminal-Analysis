import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('intel_user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('intel_auth_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('intel_auth_token');
      if (savedToken) {
        try {
          const profile = await authApi.getMe();
          setUser(profile);
          localStorage.setItem('intel_user_profile', JSON.stringify(profile));
        } catch (e) {
          console.warn('Session expired, logging out', e);
          localStorage.removeItem('intel_auth_token');
          localStorage.removeItem('intel_user_profile');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('intel_auth_token', res.access_token);
    localStorage.setItem('intel_user_profile', JSON.stringify(res.user));
    return res.user;
  };

  const signup = async (userData) => {
    const res = await authApi.signup(userData);
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('intel_auth_token', res.access_token);
      localStorage.setItem('intel_user_profile', JSON.stringify(res.user));
    }
    return res;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout error', e);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('intel_auth_token');
      localStorage.removeItem('intel_user_profile');
    }
  };

  const demoLogin = async (role) => {
    if (role === 'admin') {
      return await login('admin@intelligence.gov', 'Admin@123');
    } else {
      return await login('investigator@intelligence.gov', 'Investigator@123');
    }
  };

  const isAdmin = user?.role === 'admin';
  const isInvestigator = user?.role === 'investigator' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        isAdmin,
        isInvestigator,
        login,
        signup,
        logout,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

