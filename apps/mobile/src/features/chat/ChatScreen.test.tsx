import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { useStreamStore } from '@/features/chat/streamStore';
import { useSettings } from '@/features/settings/settingsStore';
import { MockChatService } from '@/services/chat/mock/MockChatService';
import { makeServices, renderWithServices } from '@/test/render';
import { settleStreams } from '@/test/streams';
import { ChatScreen } from './ChatScreen';

beforeEach(() => {
  useSettings.setState({ backend: 'mock', defaultModel: 'mock-fast' });
});
afterEach(settleStreams);

async function setup(conversationId: string | null = null, services = makeServices()) {
  const props = {
    onConversationCreated: jest.fn(),
    onOpenDrawer: jest.fn(),
    onNewChat: jest.fn(),
  };
  const utils = await renderWithServices(
    <ChatScreen conversationId={conversationId} {...props} />,
    services,
  );
  return { ...utils, props, services };
}

async function type(text: string) {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
}

describe('ChatScreen', () => {
  it('shows the empty state and suggestions for a new chat', async () => {
    await setup();
    expect(screen.getByText('What can I help with?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Show me some code/ })).toBeOnTheScreen();
  });

  it('disables Send until there is text', async () => {
    await setup();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await type('hi');
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });

  it('sends a message, fires a haptic and reports the new conversation id', async () => {
    const { props } = await setup();
    await type('hello');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(Haptics.impactAsync).toHaveBeenCalled();
    await waitFor(() =>
      expect(props.onConversationCreated).toHaveBeenCalledWith(expect.any(String)),
    );
    expect(screen.getByLabelText('Message')).toHaveDisplayValue('');
  });

  it('streams the reply into an existing conversation', async () => {
    const services = makeServices();
    const c = await services.repo.create({ title: 'Chat', model: 'mock-fast' });
    await setup(c.id, services);
    await type('hello');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByLabelText('You said: hello')).toBeOnTheScreen();
    const long = { timeout: 5000 };
    expect(await screen.findByText(/mock assistant/, {}, long)).toBeOnTheScreen();
    expect(
      await screen.findByRole('button', { name: 'Regenerate response' }, long),
    ).toBeOnTheScreen();
  });

  it('shows typing, then Stop, and stops generation', async () => {
    const services = makeServices({ chat: new MockChatService({ latencyMs: 10 }) });
    const c = await services.repo.create({ title: 'Chat', model: 'mock-smart' });
    await setup(c.id, services);
    useSettings.setState({ defaultModel: 'mock-smart' });
    await type('tell me something');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByLabelText('Assistant is typing')).toBeOnTheScreen();
    const stop = await screen.findByRole('button', { name: 'Stop generating' });
    await waitFor(() => expect(useStreamStore.getState().streams[c.id]?.phase).toBe('streaming'));
    await fireEvent.press(stop);
    expect(await screen.findByText('Stopped generating')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeOnTheScreen();
  });

  it('shows an error with Retry for the "error" scenario', async () => {
    const services = makeServices();
    const c = await services.repo.create({ title: 'Chat', model: 'mock-fast' });
    const spy = jest.spyOn(services.chat, 'streamCompletion');
    await setup(c.id, services);
    await type('error');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText(/simulated an internal error/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it('regenerates the last reply', async () => {
    const services = makeServices();
    const c = await services.repo.create({ title: 'Chat', model: 'mock-fast' });
    const spy = jest.spyOn(services.chat, 'streamCompletion');
    await setup(c.id, services);
    await type('tell me something');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Regenerate response' }, { timeout: 5000 }),
    );
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    await waitFor(async () =>
      expect(
        (await services.repo.messages(c.id)).filter((m) => m.role === 'assistant'),
      ).toHaveLength(1),
    );
  });

  it('sends a suggestion when tapped', async () => {
    const { props } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: /Say hello/ }));
    await waitFor(() => expect(props.onConversationCreated).toHaveBeenCalled());
  });

  it('switches model from the picker and remembers it', async () => {
    const services = makeServices();
    const c = await services.repo.create({ title: 'Chat', model: 'mock-fast' });
    await setup(c.id, services);
    await fireEvent.press(await screen.findByRole('button', { name: 'Model: Mock Fast' }));
    await fireEvent.press(await screen.findByRole('radio', { name: /Mock Smart/ }));
    await waitFor(async () => expect((await services.repo.get(c.id))?.model).toBe('mock-smart'));
    expect(useSettings.getState().defaultModel).toBe('mock-smart');
  });

  it('wires the header buttons', async () => {
    const { props } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Open conversations' }));
    await fireEvent.press(screen.getByRole('button', { name: 'New chat' }));
    expect(props.onOpenDrawer).toHaveBeenCalled();
    expect(props.onNewChat).toHaveBeenCalled();
  });

  it('copies an assistant message', async () => {
    const services = makeServices();
    const c = await services.repo.create({ title: 'Chat', model: 'mock-fast' });
    await services.repo.addMessage({
      conversationId: c.id,
      role: 'assistant',
      content: 'Copy me',
      status: 'done',
    });
    await setup(c.id, services);
    await fireEvent.press(await screen.findByRole('button', { name: 'Copy message' }));
    const Clipboard = jest.requireMock<{ setStringAsync: jest.Mock }>('expo-clipboard');
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('Copy me');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeOnTheScreen();
  });

  it('shows the jump-to-latest button after scrolling up', async () => {
    const services = makeServices();
    const c = await services.repo.create({ title: 'Chat', model: 'mock-fast' });
    await services.repo.addMessage({
      conversationId: c.id,
      role: 'user',
      content: 'x',
      status: 'done',
    });
    await setup(c.id, services);
    const list = await screen.findByTestId('message-list');
    await act(async () => {
      await fireEvent.scroll(list, {
        nativeEvent: {
          contentOffset: { y: 500 },
          contentSize: { height: 2000 },
          layoutMeasurement: { height: 800 },
        },
      });
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Scroll to latest message' }));
  });
});
