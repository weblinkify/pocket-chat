import { waitFor } from '@testing-library/react-native';

import { useStreamStore } from '@/features/chat/streamStore';

/** Abort any in-flight replies and wait for them to settle, so no timers outlive a test. */
export async function settleStreams() {
  Object.values(useStreamStore.getState().streams).forEach((s) => s.controller.abort());
  await waitFor(() => expect(Object.keys(useStreamStore.getState().streams)).toHaveLength(0));
}
