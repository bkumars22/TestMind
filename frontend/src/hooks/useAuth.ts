import { useState, useCallback, useEffect } from 'react';
import { login as apiLogin, setToken, clearToken } from '../services/api';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Module-level state so auth persists across hook consumers without localStorage
let _authState: AuthState = { user: null, isAuthenticated: false };
const _listeners = new Set<() => void>();

function notifyListeners(): void {
  _listeners.forEach((fn) => fn());
}

export function useAuth(): UseAuthReturn {
  const [, rerender] = useState(0);

  // Subscribe to global auth state changes
  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await apiLogin(email, password);
    setToken(response.accessToken);
    const user: User = {
      id: 0,
      email: response.email,
      role: response.role as UserRole,
    };
    _authState = { user, isAuthenticated: true };
    notifyListeners();
  }, []);

  const logout = useCallback((): void => {
    clearToken();
    _authState = { user: null, isAuthenticated: false };
    notifyListeners();
  }, []);

  return {
    user: _authState.user,
    isAuthenticated: _authState.isAuthenticated,
    login,
    logout,
  };
}
