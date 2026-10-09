import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

import { createMemoryRepository } from '@/features/conversations/data/memoryRepository';
import { ServicesProvider, type Services } from '@/providers/ServicesProvider';
import { MockChatService } from '@/services/chat/mock/MockChatService';

export function makeServices(overrides: Partial<Services> = {}): Services {
  return {
    chat: new MockChatService({ latencyMs: 0, timeoutMs: 30 }),
    repo: createMemoryRepository(),
    ...overrides,
  };
}

export function makeWrapper(services: Services = makeServices()) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ServicesProvider value={services}>{children}</ServicesProvider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, client, services };
}

export async function renderWithServices(ui: ReactElement, services?: Services) {
  const { Wrapper, ...rest } = makeWrapper(services);
  return { ...(await render(ui, { wrapper: Wrapper })), ...rest };
}

export async function renderHookWithServices<T>(hook: () => T, services?: Services) {
  const { Wrapper, ...rest } = makeWrapper(services);
  return { ...(await renderHook(hook, { wrapper: Wrapper })), ...rest };
}
