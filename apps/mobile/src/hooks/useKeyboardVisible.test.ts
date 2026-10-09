import { act, renderHook } from '@testing-library/react-native';
import { Keyboard } from 'react-native';

import { useKeyboardVisible } from './useKeyboardVisible';

describe('useKeyboardVisible', () => {
  it('tracks keyboard show/hide', async () => {
    const listeners: Record<string, () => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, cb: () => void) => {
      listeners[event] = cb;
      return { remove: jest.fn() };
    }) as never);
    const { result, unmount } = await renderHook(() => useKeyboardVisible());
    expect(result.current).toBe(false);
    await act(async () => listeners.keyboardWillShow?.());
    expect(result.current).toBe(true);
    await act(async () => listeners.keyboardWillHide?.());
    expect(result.current).toBe(false);
    await unmount();
  });
});
