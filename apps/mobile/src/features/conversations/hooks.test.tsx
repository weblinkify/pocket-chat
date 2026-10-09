import { act, waitFor } from '@testing-library/react-native';

import { makeServices, renderHookWithServices } from '@/test/render';
import {
  useClearConversations,
  useConversation,
  useConversations,
  useDeleteConversation,
  useMessages,
  useRenameConversation,
  useSetConversationModel,
} from './hooks';

async function seed() {
  const services = makeServices();
  const a = await services.repo.create({ title: 'Trip planning', model: 'mock-fast' });
  const b = await services.repo.create({ title: 'Recipes', model: 'mock-fast' });
  await services.repo.addMessage({
    conversationId: a.id,
    role: 'user',
    content: 'Lisbon?',
    status: 'done',
  });
  return { services, a, b };
}

describe('conversation hooks', () => {
  it('lists and searches conversations', async () => {
    const { services, a } = await seed();
    const { result, rerender } = await renderHookWithServices(
      () => useConversations('lisbon'),
      services,
    );
    await waitFor(() => expect(result.current.data?.map((c) => c.id)).toEqual([a.id]));
    await rerender({});
  });

  it('loads one conversation and its messages', async () => {
    const { services, a } = await seed();
    const { result } = await renderHookWithServices(
      () => ({ c: useConversation(a.id), m: useMessages(a.id) }),
      services,
    );
    await waitFor(() => expect(result.current.c.data?.title).toBe('Trip planning'));
    await waitFor(() => expect(result.current.m.data).toHaveLength(1));
  });

  it('stays idle without an id', async () => {
    const { services } = await seed();
    const { result } = await renderHookWithServices(
      () => ({ c: useConversation(null), m: useMessages(null) }),
      services,
    );
    expect(result.current.c.fetchStatus).toBe('idle');
    expect(result.current.m.data).toBeUndefined();
  });

  it('renames, re-models, deletes and clears, refreshing the list', async () => {
    const { services, a, b } = await seed();
    const { result } = await renderHookWithServices(
      () => ({
        list: useConversations(),
        rename: useRenameConversation(),
        setModel: useSetConversationModel(),
        remove: useDeleteConversation(),
        clear: useClearConversations(),
      }),
      services,
    );
    await waitFor(() => expect(result.current.list.data).toHaveLength(2));

    await act(async () => {
      await result.current.rename.mutateAsync({ id: b.id, title: '  Dinner ideas  ' });
    });
    await waitFor(() =>
      expect(result.current.list.data?.find((c) => c.id === b.id)?.title).toBe('Dinner ideas'),
    );

    await act(async () => {
      await result.current.setModel.mutateAsync({ id: b.id, model: 'mock-smart' });
    });
    expect((await services.repo.get(b.id))?.model).toBe('mock-smart');

    await act(async () => {
      await result.current.remove.mutateAsync(a.id);
    });
    await waitFor(() => expect(result.current.list.data?.map((c) => c.id)).toEqual([b.id]));

    await act(async () => {
      await result.current.clear.mutateAsync();
    });
    await waitFor(() => expect(result.current.list.data).toEqual([]));
  });

  it('ignores a blank rename', async () => {
    const { services, a } = await seed();
    const { result } = await renderHookWithServices(() => useRenameConversation(), services);
    await act(async () => {
      await result.current.mutateAsync({ id: a.id, title: '   ' });
    });
    expect((await services.repo.get(a.id))?.title).toBe('Trip planning');
  });
});
