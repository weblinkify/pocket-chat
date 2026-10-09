import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import { Markdown } from './Markdown';

const SAMPLE = `# Title

Some **bold**, *italic*, ~~gone~~ and \`inline code\` with a [link](https://example.com).

1. first
2. second
   - nested

> quoted

| A | B |
| --- | --- |
| 1 | 2 |

---

\`\`\`ts
const x: number = 1;
\`\`\`
`;

describe('Markdown', () => {
  it('renders the full feature set (snapshot)', async () => {
    const { toJSON } = await render(<Markdown>{SAMPLE}</Markdown>);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders headings with the header role', async () => {
    await render(<Markdown>{'## Hello'}</Markdown>);
    expect(screen.getByRole('header')).toHaveTextContent('Hello');
  });

  it('decodes HTML entities', async () => {
    await render(<Markdown>{'a & b < c'}</Markdown>);
    expect(screen.getByText('a & b < c')).toBeOnTheScreen();
  });

  it('opens links', async () => {
    const spy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<Markdown>{'[docs](https://example.com)'}</Markdown>);
    await fireEvent.press(screen.getByRole('link'));
    expect(spy).toHaveBeenCalledWith('https://example.com');
  });

  it('copies code blocks', async () => {
    jest.useFakeTimers();
    await render(<Markdown>{'```python\nprint("hi")\n```'}</Markdown>);
    expect(screen.getByText('python')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Copy code' }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('print("hi")');
    expect(screen.getByRole('button', { name: 'Code copied' })).toBeOnTheScreen();
    jest.useRealTimers();
  });

  it('labels code blocks without a language as text', async () => {
    await render(<Markdown>{'```\nplain\n```'}</Markdown>);
    expect(screen.getByText('text')).toBeOnTheScreen();
  });
});

describe('Markdown edge cases', () => {
  it('renders ordered lists from a custom start and h3+', async () => {
    await render(<Markdown>{'### Small\n\n3. three\n4. four'}</Markdown>);
    expect(screen.getByText('3.')).toBeOnTheScreen();
    expect(screen.getByRole('header')).toHaveTextContent('Small');
  });

  it('renders line breaks and raw html as text', async () => {
    await render(<Markdown>{'line one  \nline two\n\n<b>x</b>'}</Markdown>);
    expect(screen.getByText(/line one/)).toBeOnTheScreen();
    expect(screen.getByText(/<b>x<\/b>/)).toBeOnTheScreen();
  });
});
