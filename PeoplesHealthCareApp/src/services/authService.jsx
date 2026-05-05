import api from './api';
import * as SecureStore from 'expo-secure-store';

const authService = {
  login: async (identifier, password) => {
    const response = await api.post('/auth/login', { identifier, password });
    if (response.data.success) {
      await SecureStore.setItemAsync('token', response.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    if (response.data.success) {
      await SecureStore.setItemAsync('token', response.data.token);
      await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  },

  getCurrentUser: async () => {
    try {
      const userStr = await SecureStore.getItemAsync('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken: async () => {
    return await SecureStore.getItemAsync('token');
  },

  isLoggedIn: async () => {
    const token = await SecureStore.getItemAsync('token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('user');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export default authService;
