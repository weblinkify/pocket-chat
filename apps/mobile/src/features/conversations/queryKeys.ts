export const queryKeys = {
  conversations: (search = '') => ['conversations', search] as const,
  allConversations: ['conversations'] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (id: string) => ['messages', id] as const,
  models: (backend: string) => ['models', backend] as const,
};
