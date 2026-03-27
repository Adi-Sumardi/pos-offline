import { useAuthStore } from '@/stores/useAuthStore';
import type { User } from '@/db/schema';

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: 'admin',
    fullName: 'Super Admin',
    pinHash: 'hash123',
    role: 'admin',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  describe('initial state', () => {
    it('should start with no user and unauthenticated', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should set user and mark as authenticated', () => {
      const user = mockUser();
      useAuthStore.getState().login(user);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should update user on subsequent login', () => {
      const admin = mockUser({ id: 1, username: 'admin' });
      const kasir = mockUser({ id: 2, username: 'kasir1', role: 'kasir' });

      useAuthStore.getState().login(admin);
      useAuthStore.getState().login(kasir);

      const state = useAuthStore.getState();
      expect(state.user?.id).toBe(2);
      expect(state.user?.role).toBe('kasir');
    });

    // BUG CHECK: Login with inactive user
    it('should allow login with inactive user (no validation)', () => {
      const inactiveUser = mockUser({ isActive: false });
      useAuthStore.getState().login(inactiveUser);

      // The store doesn't validate isActive — that should be checked elsewhere
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('should clear user and mark as unauthenticated', () => {
      useAuthStore.getState().login(mockUser());
      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
