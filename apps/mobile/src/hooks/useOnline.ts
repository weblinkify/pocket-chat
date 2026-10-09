import { useNetInfo } from '@react-native-community/netinfo';

/** `false` only when we know we're offline; unknown (null) counts as online. */
export function useOnline(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return !(isConnected === false || isInternetReachable === false);
}
