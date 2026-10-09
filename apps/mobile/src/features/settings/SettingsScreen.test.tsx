import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { makeServices, renderWithServices } from '@/test/render';
import { SettingsScreen } from './SettingsScreen';
import { useSettings } from './settingsStore';

beforeEach(() => useSettings.setState({ backend: 'mock', apiUrl: 'http://localhost:8000' }));

async function setup(testConnection = jest.fn(async () => 2)) {
  const services = makeServices();
  const onClose = jest.fn();
  await renderWithServices(
    <SettingsScreen onClose={onClose} testConnection={testConnection} />,
    services,
  );
  return { services, onClose, testConnection };
}

describe('SettingsScreen', () => {
  it('defaults to the on-device mock and hides the server URL', async () => {
    await setup();
    expect(screen.getByRole('radio', { name: /On-device mock/ })).toBeSelected();
    expect(screen.queryByLabelText('Server URL')).not.toBeOnTheScreen();
  });

  it('switches to server mode and tests the connection', async () => {
    const { testConnection } = await setup();
    await fireEvent.press(screen.getByRole('radio', { name: /Server/ }));
    expect(useSettings.getState().backend).toBe('server');
    await fireEvent.changeText(screen.getByLabelText('Server URL'), ' http://192.168.1.20:8000 ');
    await fireEvent.press(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connected · 2 models')).toBeOnTheScreen();
    expect(testConnection).toHaveBeenCalledWith('http://192.168.1.20:8000');
    expect(useSettings.getState().apiUrl).toBe('http://192.168.1.20:8000');
  });

  it('shows connection errors', async () => {
    await setup(
      jest.fn(async () => {
        throw new Error('Could not reach the server');
      }),
    );
    await fireEvent.press(screen.getByRole('radio', { name: /Server/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Could not reach the server')).toBeOnTheScreen();
  });

  it('deletes all chats after confirmation', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { services } = await setup();
    await services.repo.create({ title: 'x', model: 'mock-fast' });
    await fireEvent.press(screen.getByRole('button', { name: 'Delete all chats' }));
    const buttons = alert.mock.calls.at(-1)?.[2] as AlertButton[];
    buttons.find((b) => b.text === 'Delete all')?.onPress?.();
    await waitFor(async () => expect(await services.repo.list()).toEqual([]));
  });

  it('goes back', async () => {
    const { onClose } = await setup();
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onClose).toHaveBeenCalled();
  });
});
