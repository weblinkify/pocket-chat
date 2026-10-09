import { useNetInfo } from '@react-native-community/netinfo';

/**
 * `false` only when the device has no network connection. The reachability probe
 * (`isInternetReachable`) flaps on hotspots and captive Wi-Fi, which would make the
 * offline banner pop in and out, so it's ignored.
 */
export function useOnline(): boolean {
  const { isConnected } = useNetInfo();
  return isConnected !== false;
}
