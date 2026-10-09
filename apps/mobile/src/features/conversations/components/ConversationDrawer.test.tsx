import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ActionSheetIOS, Alert, type AlertButton } from 'react-native';

import { makeServices, renderWithServices } from '@/test/render';
import { ConversationDrawer } from './ConversationDrawer';

async function setup(activeId: string | null = null) {
  const services = makeServices();
  const trip = await services.repo.create({ title: 'Trip to Lisbon', model: 'mock-fast' });
  const food = await services.repo.create({ title: 'Dinner ideas', model: 'mock-fast' });
  await services.repo.addMessage({
    conversationId: food.id,
    role: 'assistant',
    content: 'Try **pasta**',
    status: 'done',
  });
  const props = {
    activeId,
    onSelect: jest.fn(),
    onNewChat: jest.fn(),
    onOpenSettings: jest.fn(),
    onActiveDeleted: jest.fn(),
  };
  await renderWithServices(<ConversationDrawer {...props} />, services);
  await screen.findByText('Trip to Lisbon');
  return { services, trip, food, props };
}

/** Press the button with `text` in the most recent Alert.alert call. */
function pressAlertButton(spy: jest.SpyInstance, text: string) {
  const buttons = spy.mock.calls.at(-1)?.[2] as AlertButton[];
  buttons.find((b) => b.text === text)?.onPress?.();
}

describe('ConversationDrawer', () => {
  it('lists conversations under date headers with previews', async () => {
    await setup();
    expect(screen.getByRole('header', { name: 'Today' })).toBeOnTheScreen();
    expect(screen.getByText('Try pasta')).toBeOnTheScreen();
  });

  it('marks the active conversation as selected', async () => {
    const { trip } = await setup();
    await screen.findByText('Trip to Lisbon');
    expect(trip).toBeDefined();
  });

  it('filters by search and shows an empty result', async () => {
    await setup();
    await fireEvent.changeText(screen.getByLabelText('Search conversations'), 'lisbon');
    await waitFor(() => expect(screen.queryByText('Dinner ideas')).not.toBeOnTheScreen());
    await fireEvent.changeText(screen.getByLabelText('Search conversations'), 'zzz');
    expect(await screen.findByText('No chats match "zzz"')).toBeOnTheScreen();
  });

  it('selects, starts new chats and opens settings', async () => {
    const { trip, props } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Trip to Lisbon' }));
    await fireEvent.press(screen.getByRole('button', { name: 'New chat' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
    expect(props.onSelect).toHaveBeenCalledWith(trip.id);
    expect(props.onNewChat).toHaveBeenCalled();
    expect(props.onOpenSettings).toHaveBeenCalled();
  });

  it('renames via the long-press action sheet', async () => {
    const sheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_opts, cb) => cb(0));
    const { services, trip } = await setup();
    await fireEvent(screen.getByRole('button', { name: 'Trip to Lisbon' }), 'longPress');
    expect(sheet).toHaveBeenCalled();
    const input = await screen.findByLabelText('Chat title');
    await fireEvent.changeText(input, 'Portugal 2027');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Portugal 2027')).toBeOnTheScreen();
    expect((await services.repo.get(trip.id))?.title).toBe('Portugal 2027');
  });

  it('can cancel a rename, and blocks saving an empty title', async () => {
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_o, cb) => cb(0));
    await setup();
    await fireEvent(screen.getByRole('button', { name: 'Trip to Lisbon' }), 'longPress');
    await fireEvent.changeText(await screen.findByLabelText('Chat title'), '   ');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Chat title')).not.toBeOnTheScreen();
  });

  it('deletes after confirmation and notifies when the active chat is gone', async () => {
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_o, cb) => cb(1));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const services = makeServices();
    const trip = await services.repo.create({ title: 'Trip to Lisbon', model: 'mock-fast' });
    const props = {
      activeId: trip.id,
      onSelect: jest.fn(),
      onNewChat: jest.fn(),
      onOpenSettings: jest.fn(),
      onActiveDeleted: jest.fn(),
    };
    await renderWithServices(<ConversationDrawer {...props} />, services);
    await fireEvent(await screen.findByRole('button', { name: 'Trip to Lisbon' }), 'longPress');
    expect(alert).toHaveBeenCalledWith('Delete chat?', expect.any(String), expect.any(Array));
    pressAlertButton(alert, 'Delete');
    await waitFor(() => expect(props.onActiveDeleted).toHaveBeenCalled());
    expect(await screen.findByText('Your conversations will appear here.')).toBeOnTheScreen();
  });

  it('supports VoiceOver custom actions', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await setup();
    const row = screen.getByRole('button', { name: 'Trip to Lisbon' });
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(alert).toHaveBeenCalled();
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'rename' } });
    expect(await screen.findByLabelText('Chat title')).toBeOnTheScreen();
  });
});

describe('RenameDialog keyboard submit', () => {
  it('saves on the return key', async () => {
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_o, cb) => cb(0));
    const { services, trip } = await setup();
    await fireEvent(screen.getByRole('button', { name: 'Trip to Lisbon' }), 'longPress');
    const input = await screen.findByLabelText('Chat title');
    await fireEvent.changeText(input, 'Via keyboard');
    await fireEvent(input, 'submitEditing');
    await waitFor(async () =>
      expect((await services.repo.get(trip.id))?.title).toBe('Via keyboard'),
    );
  });
});
