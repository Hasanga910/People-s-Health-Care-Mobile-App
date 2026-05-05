import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const loggedIn = await authService.isLoggedIn();
      if (loggedIn) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    if (data.success) setUser(data.user);
    return data;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
