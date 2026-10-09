import { fireEvent, render, screen } from '@testing-library/react-native';

import { Composer, MAX_LINES } from './Composer';

const props = () => ({ isStreaming: false, onSend: jest.fn(), onStop: jest.fn() });

describe('Composer', () => {
  it('sends trimmed-non-empty text and clears', async () => {
    const p = props();
    await render(<Composer {...p} />);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Hi there');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(p.onSend).toHaveBeenCalledWith('Hi there');
    expect(screen.getByLabelText('Message')).toHaveDisplayValue('');
  });

  it('does not send whitespace or while disabled', async () => {
    const p = props();
    await render(<Composer {...p} disabled />);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'text');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));
    expect(p.onSend).not.toHaveBeenCalled();
  });

  it('shows Stop while streaming', async () => {
    const p = props();
    await render(<Composer {...p} isStreaming />);
    await fireEvent.press(screen.getByRole('button', { name: 'Stop generating' }));
    expect(p.onStop).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeOnTheScreen();
  });

  it(`grows with content but caps at ${MAX_LINES} lines, then scrolls`, async () => {
    await render(<Composer {...props()} />);
    const input = screen.getByLabelText('Message');
    const size = (height: number) => ({ nativeEvent: { contentSize: { height, width: 300 } } });
    await fireEvent(input, 'contentSizeChange', size(66));
    expect(input).toHaveStyle({ height: 76 });
    expect(input.props.scrollEnabled).toBe(false);
    await fireEvent(input, 'contentSizeChange', size(1000));
    expect(input).toHaveStyle({ height: 22 * MAX_LINES + 10 });
    expect(input.props.scrollEnabled).toBe(true);
  });
});
