import { create } from 'zustand';
import type { User } from '@/db/schema';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: (user: User) =>
    set({
      user,
      isAuthenticated: true,
    }),

  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),
}));

/**
 * Helper hook: check if current user is admin
 */
export function useIsAdmin(): boolean {
  const user = useAuthStore((s) => s.user);
  return user?.role === 'admin';
}
