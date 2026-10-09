import { fetch as expoFetch } from 'expo/fetch';

import type { Backend } from '@/features/settings/settingsStore';
import { HttpChatService, type FetchLike } from './http/HttpChatService';
import { MockChatService } from './mock/MockChatService';
import type { ChatService } from './types';

/** Composition root for the chat backend, chosen in Settings. */
export function createChatService(backend: Backend, apiUrl: string): ChatService {
  if (backend === 'mock') return new MockChatService();
  return new HttpChatService({ baseUrl: apiUrl, fetch: expoFetch as unknown as FetchLike });
}

export async function testConnection(apiUrl: string): Promise<number> {
  const models = await createChatService('server', apiUrl).listModels();
  return models.length;
}
