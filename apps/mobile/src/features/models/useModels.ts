import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/features/conversations/queryKeys';
import { useServices } from '@/providers/ServicesProvider';

export function useModels() {
  const { chat } = useServices();
  return useQuery({
    queryKey: queryKeys.models(chat.kind),
    queryFn: () => chat.listModels(),
    staleTime: 5 * 60_000,
  });
}
