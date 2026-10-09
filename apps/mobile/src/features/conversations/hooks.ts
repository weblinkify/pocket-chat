import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServices } from '@/providers/ServicesProvider';
import { queryKeys } from './queryKeys';

export function useConversations(search = '') {
  const { repo } = useServices();
  const q = search.trim();
  return useQuery({
    queryKey: queryKeys.conversations(q),
    queryFn: () => repo.list(q || undefined),
  });
}

export function useConversation(id: string | null) {
  const { repo } = useServices();
  return useQuery({
    queryKey: queryKeys.conversation(id ?? ''),
    queryFn: () => repo.get(id!),
    enabled: !!id,
  });
}

export function useMessages(id: string | null) {
  const { repo } = useServices();
  return useQuery({
    queryKey: queryKeys.messages(id ?? ''),
    queryFn: () => repo.messages(id!),
    enabled: !!id,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (id?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.allConversations }),
      ...(id ? [qc.invalidateQueries({ queryKey: queryKeys.conversation(id) })] : []),
    ]);
}

export function useRenameConversation() {
  const { repo } = useServices();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const t = title.trim();
      if (t) await repo.update(id, { title: t });
    },
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

export function useSetConversationModel() {
  const { repo } = useServices();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, model }: { id: string; model: string }) => repo.update(id, { model }),
    onSuccess: (_d, { id }) => invalidate(id),
  });
}

export function useDeleteConversation() {
  const { repo } = useServices();
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => repo.remove(id),
    onSuccess: (_d, id) => {
      qc.removeQueries({ queryKey: queryKeys.messages(id) });
      return invalidate(id);
    },
  });
}

export function useClearConversations() {
  const { repo } = useServices();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => repo.removeAll(),
    onSuccess: () => qc.invalidateQueries(),
  });
}
