import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  it('is announced to VoiceOver', async () => {
    await render(<TypingIndicator />);
    expect(screen.getByLabelText('Assistant is typing')).toBeOnTheScreen();
  });

  it('respects Reduce Motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const { unmount } = await render(<TypingIndicator />);
    expect(screen.getByLabelText('Assistant is typing')).toBeOnTheScreen();
    await unmount();
  });
});
