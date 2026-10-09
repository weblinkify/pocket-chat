import { fireEvent, screen } from '@testing-library/react-native';

import type { ChatService } from '@/services/chat/types';
import { makeServices, renderWithServices } from '@/test/render';
import { ModelPicker, modelLabel } from './ModelPicker';

describe('ModelPicker', () => {
  it('lists models with descriptions and picks one', async () => {
    const onChange = jest.fn();
    await renderWithServices(<ModelPicker value="mock-fast" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Model: Mock Fast' }));
    expect(await screen.findByRole('radio', { name: /Mock Fast, Quick/ })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: /Mock Smart/ }));
    expect(onChange).toHaveBeenCalledWith('mock-smart');
  });

  it('closes when the backdrop is tapped', async () => {
    await renderWithServices(<ModelPicker value="mock-fast" onChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Model: Mock Fast' }));
    // The backdrop is outside the accessibility-modal sheet, so VoiceOver can't reach it.
    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Close model picker',
        includeHiddenElements: true,
      }),
    );
    expect(screen.queryByRole('radio', { name: /Mock Smart/ })).not.toBeOnTheScreen();
  });

  it('closes with the VoiceOver escape gesture', async () => {
    await renderWithServices(<ModelPicker value="mock-fast" onChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Model: Mock Fast' }));
    await fireEvent(await screen.findByTestId('model-sheet'), 'accessibilityEscape');
    expect(screen.queryByRole('radio', { name: /Mock Smart/ })).not.toBeOnTheScreen();
  });

  it('offers a retry when models fail to load', async () => {
    const listModels = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue([]);
    const chat = {
      kind: 'http',
      listModels,
      streamCompletion: jest.fn(),
    } as unknown as ChatService;
    await renderWithServices(
      <ModelPicker value="gpt-x" onChange={jest.fn()} />,
      makeServices({ chat }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Model: gpt-x' }));
    await fireEvent.press(await screen.findByText("Couldn't load models. Tap to retry."));
    expect(listModels).toHaveBeenCalledTimes(2);
  });

  it('falls back to the raw id for unknown models', () => {
    expect(modelLabel('gpt-4o')).toBe('gpt-4o');
  });
});
