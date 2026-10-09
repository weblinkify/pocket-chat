import { act, waitFor } from '@testing-library/react-native';

import { useStreamStore } from '@/features/chat/streamStore';
import { MockChatService } from '@/services/chat/mock/MockChatService';
import { makeServices, renderHookWithServices } from '@/test/render';
import { settleStreams } from '@/test/streams';
import { useChat } from './useChat';

afterEach(settleStreams);

describe('useChat', () => {
  it('creates a conversation on first send and persists both turns', async () => {
    const services = makeServices();
    const { result } = await renderHookWithServices(() => useChat(null), services);

    let id = '';
    const onCreated = jest.fn();
    await act(async () => {
      id = await result.current.send('hello', 'mock-fast', onCreated);
    });
    expect(onCreated).toHaveBeenCalledWith(id);

    const convo = await services.repo.get(id);
    expect(convo).toMatchObject({ title: 'hello', model: 'mock-fast' });
    const msgs = await services.repo.messages(id);
    expect(msgs.map((m) => [m.role, m.status])).toEqual([
      ['user', 'done'],
      ['assistant', 'done'],
    ]);
    expect(msgs[1]?.content).toContain('Pocket Chat');
  });

  it('exposes the streaming text while a reply is in flight', async () => {
    const services = makeServices({ chat: new MockChatService({ latencyMs: 5 }) });
    const { result, rerender } = await renderHookWithServices(() => useChat(null), services);

    let pending!: Promise<string>;
    await act(async () => {
      pending = result.current.send('hello', 'mock-fast');
    });
    const id = Object.keys(useStreamStore.getState().streams)[0]!;
    expect(id).toBeDefined();
    await waitFor(() => expect(useStreamStore.getState().streams[id]?.phase).toBe('streaming'));
    await rerender({});
    await act(async () => {
      await pending;
    });
    expect(useStreamStore.getState().streams[id]).toBeUndefined();
  });

  it('marks an interrupted reply as stopped and keeps the partial text', async () => {
    const services = makeServices({ chat: new MockChatService({ latencyMs: 5 }) });
    const convo = await services.repo.create({ title: 't', model: 'mock-smart' });
    const { result } = await renderHookWithServices(() => useChat(convo.id), services);

    let pending!: Promise<string>;
    await act(async () => {
      pending = result.current.send('tell me a story', 'mock-smart');
    });
    await waitFor(() =>
      expect(useStreamStore.getState().streams[convo.id]?.text.length).toBeGreaterThan(5),
    );
    await act(async () => {
      result.current.stop();
      await pending;
    });

    const last = (await services.repo.messages(convo.id)).at(-1);
    expect(last).toMatchObject({ role: 'assistant', status: 'stopped' });
    expect(last?.content.length).toBeGreaterThan(5);
  });

  it('records an error reply with the error message', async () => {
    const services = makeServices();
    const { result } = await renderHookWithServices(() => useChat(null), services);
    let id = '';
    await act(async () => {
      id = await result.current.send('error', 'mock-fast');
    });
    const last = (await services.repo.messages(id)).at(-1);
    expect(last).toMatchObject({ role: 'assistant', status: 'error', content: '' });
    expect(last?.error).toMatch(/simulated/);
  });

  it('records a timeout as an error', async () => {
    const services = makeServices();
    const { result } = await renderHookWithServices(() => useChat(null), services);
    let id = '';
    await act(async () => {
      id = await result.current.send('slow', 'mock-fast');
    });
    expect((await services.repo.messages(id)).at(-1)).toMatchObject({
      status: 'error',
      error: expect.stringMatching(/too long/),
    });
  });

  it('does not send failed replies back to the model as history', async () => {
    const services = makeServices();
    const spy = jest.spyOn(services.chat, 'streamCompletion');
    const { result } = await renderHookWithServices(() => useChat(null), services);
    let id = '';
    await act(async () => {
      id = await result.current.send('error', 'mock-fast');
    });
    await act(async () => {
      await result.current.retry(id, 'mock-fast');
    });
    const history = spy.mock.calls.at(-1)?.[0].messages;
    expect(history).toEqual([{ role: 'user', content: 'error' }]);
  });

  it('retry replaces the failed reply', async () => {
    const services = makeServices();
    const { result } = await renderHookWithServices(() => useChat(null), services);
    let id = '';
    await act(async () => {
      id = await result.current.send('error', 'mock-fast');
    });
    // Make the next attempt succeed by swapping the user message content.
    const [userMsg] = await services.repo.messages(id);
    await services.repo.removeMessage(userMsg!.id);
    await services.repo.addMessage({
      conversationId: id,
      role: 'user',
      content: 'hi',
      status: 'done',
    });
    const errMsg = (await services.repo.messages(id)).find((m) => m.status === 'error')!;
    await services.repo.removeMessage(errMsg.id);
    await services.repo.addMessage({ ...errMsg });

    await act(async () => {
      await result.current.retry(id, 'mock-fast');
    });
    const msgs = await services.repo.messages(id);
    expect(msgs.filter((m) => m.role === 'assistant')).toHaveLength(1);
    expect(msgs.at(-1)).toMatchObject({ status: 'done' });
  });

  it('regenerate replaces the last reply with a new seed', async () => {
    const services = makeServices();
    const spy = jest.spyOn(services.chat, 'streamCompletion');
    const { result } = await renderHookWithServices(() => useChat(null), services);
    let id = '';
    await act(async () => {
      id = await result.current.send('tell me something', 'mock-fast');
    });
    await act(async () => {
      await result.current.regenerate(id, 'mock-fast');
    });
    const msgs = await services.repo.messages(id);
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant']);
    const seeds = spy.mock.calls.map((c) => c[0].seed);
    expect(new Set(seeds).size).toBe(2);
  });

  it('ignores a second send while a reply is streaming', async () => {
    const services = makeServices({ chat: new MockChatService({ latencyMs: 5 }) });
    const convo = await services.repo.create({ title: 't', model: 'mock-fast' });
    const { result } = await renderHookWithServices(() => useChat(convo.id), services);
    let first!: Promise<string>;
    await act(async () => {
      first = result.current.send('hello', 'mock-fast');
    });
    await waitFor(() => expect(useStreamStore.getState().streams[convo.id]).toBeDefined());
    await act(async () => {
      await result.current.send('again', 'mock-fast');
      await first;
    });
    const users = (await services.repo.messages(convo.id)).filter((m) => m.role === 'user');
    expect(users).toHaveLength(1);
  });

  it('ignores blank messages', async () => {
    const services = makeServices();
    const { result } = await renderHookWithServices(() => useChat(null), services);
    await act(async () => {
      expect(await result.current.send('   ', 'mock-fast')).toBe('');
    });
    expect(await services.repo.list()).toEqual([]);
  });
});
