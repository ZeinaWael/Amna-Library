import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDto } from '../types/api';

type AuthState = {
  token: string | null;
  user: UserDto | null;
  expiresAt: string | null;
  login: (token: string, user: UserDto, expiresAt: string) => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      expiresAt: null,
      login: (token, user, expiresAt) => set({ token, user, expiresAt }),
      logout: () => set({ token: null, user: null, expiresAt: null }),
    }),
    { name: 'auth' }
  )
);
