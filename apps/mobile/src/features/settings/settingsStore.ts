import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Backend = 'mock' | 'server';

export interface SettingsState {
  backend: Backend;
  apiUrl: string;
  defaultModel: string;
  setBackend(backend: Backend): void;
  setApiUrl(url: string): void;
  setDefaultModel(model: string): void;
}

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      backend: 'mock',
      apiUrl: DEFAULT_API_URL,
      defaultModel: 'mock-fast',
      setBackend: (backend) => set({ backend }),
      setApiUrl: (apiUrl) => set({ apiUrl: apiUrl.trim() }),
      setDefaultModel: (defaultModel) => set({ defaultModel }),
    }),
    { name: 'pocket-chat.settings', storage: createJSONStorage(() => Storage) },
  ),
);
