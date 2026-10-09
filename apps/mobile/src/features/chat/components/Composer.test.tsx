import { fireEvent, render, screen } from '@testing-library/react-native';

import { Composer, MAX_COMPOSER_HEIGHT, MAX_LINES } from './Composer';

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

  it(`lets iOS auto-grow the field natively, capped at ${MAX_LINES} lines`, async () => {
    await render(<Composer {...props()} />);
    const input = screen.getByLabelText('Message');
    // No JS-controlled height: measuring content and re-setting height causes a layout feedback loop.
    expect(input.props.onContentSizeChange).toBeUndefined();
    expect(input).toHaveStyle({ maxHeight: MAX_COMPOSER_HEIGHT });
    expect(input.props.style).not.toEqual(expect.objectContaining({ height: expect.anything() }));
  });
});
