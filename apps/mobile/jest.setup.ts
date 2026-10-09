// Shared Jest setup for the mobile app.

// expo-sqlite's kv-store needs the native module; swap in an in-memory AsyncStorage.
jest.mock('expo-sqlite/kv-store', () => {
  const store = new Map<string, string>();
  const api = {
    getItem: jest.fn(async (k: string) => store.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    removeItem: jest.fn(async (k: string) => void store.delete(k)),
    clear: jest.fn(async () => store.clear()),
  };
  return { __esModule: true, default: api, Storage: api, AsyncStorage: api };
});

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => undefined),
  notificationAsync: jest.fn(async () => undefined),
  selectionAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// CI runners are slower than dev machines; give streamed UI updates room to land.
require('@testing-library/react-native').configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(20_000);
