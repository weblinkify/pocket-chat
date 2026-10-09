export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'done' | 'stopped' | 'error';

export interface Conversation {
  id: string;
  title: string;
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationSummary extends Conversation {
  /** First line of the latest message, for the drawer. */
  preview: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  error?: string;
  createdAt: number;
}

export type NewMessage = Omit<Message, 'id' | 'createdAt'>;

/** Storage boundary for conversations. SQLite in the app, in-memory in tests. */
export interface ConversationRepository {
  list(search?: string): Promise<ConversationSummary[]>;
  get(id: string): Promise<Conversation | null>;
  create(input: { title: string; model: string }): Promise<Conversation>;
  update(id: string, patch: Partial<Pick<Conversation, 'title' | 'model'>>): Promise<void>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
  messages(conversationId: string): Promise<Message[]>;
  addMessage(input: NewMessage): Promise<Message>;
  removeMessage(id: string): Promise<void>;
}

export const TITLE_MAX = 48;

/** Derive a conversation title from the first user message. */
export function titleFrom(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (!oneLine) return 'New chat';
  return oneLine.length > TITLE_MAX ? `${oneLine.slice(0, TITLE_MAX - 1).trimEnd()}…` : oneLine;
}

export function previewOf(content: string): string {
  return (
    content
      .replace(/```[\s\S]*?```/g, '[code]')
      .replace(/[#>*_`|-]/g, '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ?? ''
  );
}
