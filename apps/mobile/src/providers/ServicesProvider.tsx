import { createContext, use, type ReactNode } from 'react';

import type { ConversationRepository } from '@/features/conversations/data/types';
import type { ChatService } from '@/services/chat/types';

export interface Services {
  chat: ChatService;
  repo: ConversationRepository;
}

const ServicesContext = createContext<Services | null>(null);

/** Dependency-injection root: screens and hooks never construct services themselves. */
export function ServicesProvider({ value, children }: { value: Services; children: ReactNode }) {
  return <ServicesContext value={value}>{children}</ServicesContext>;
}

export function useServices(): Services {
  const ctx = use(ServicesContext);
  if (!ctx) throw new Error('useServices must be used inside <ServicesProvider>');
  return ctx;
}
