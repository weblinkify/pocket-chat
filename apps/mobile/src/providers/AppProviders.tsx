import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { createSqliteRepository } from '@/features/conversations/data/sqliteRepository';
import { useSettings } from '@/features/settings/settingsStore';
import { createChatService } from '@/services/chat/createChatService';
import { ServicesProvider } from './ServicesProvider';

// Let TanStack Query know about connectivity and app foregrounding.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)),
);

function useAppFocus() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
    return () => sub.remove();
  }, []);
}

/** Production composition root: SQLite repository + backend chosen in Settings. */
export function AppProviders({ children }: { children: ReactNode }) {
  useAppFocus();
  const db = useSQLiteContext();
  const backend = useSettings((s) => s.backend);
  const apiUrl = useSettings((s) => s.apiUrl);
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  const repo = useMemo(() => createSqliteRepository(db), [db]);
  const chat = useMemo(() => createChatService(backend, apiUrl), [backend, apiUrl]);
  const services = useMemo(() => ({ chat, repo }), [chat, repo]);

  return (
    <QueryClientProvider client={client}>
      <ServicesProvider value={services}>{children}</ServicesProvider>
    </QueryClientProvider>
  );
}
