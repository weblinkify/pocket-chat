import { render, screen } from '@testing-library/react-native';

import { OfflineBanner } from './OfflineBanner';

const netinfo = jest.requireMock<{ useNetInfo: jest.Mock }>('@react-native-community/netinfo');

describe('OfflineBanner', () => {
  it('renders nothing while online', async () => {
    netinfo.useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: true });
    await render(<OfflineBanner usingMock />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('explains the mock still works offline', async () => {
    netinfo.useNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    await render(<OfflineBanner usingMock />);
    expect(screen.getByRole('alert')).toHaveTextContent(/on-device mock still works/);
  });

  it('ignores a flaky reachability probe while the network is connected', async () => {
    netinfo.useNetInfo.mockReturnValue({ isConnected: true, isInternetReachable: false });
    await render(<OfflineBanner usingMock />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('warns in server mode', async () => {
    netinfo.useNetInfo.mockReturnValue({ isConnected: false, isInternetReachable: false });
    await render(<OfflineBanner usingMock={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/fail until you reconnect/);
  });
});
