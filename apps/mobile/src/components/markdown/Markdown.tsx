import { Lexer, type Token, type Tokens } from 'marked';
import { memo, useMemo, type ReactNode } from 'react';
import { Linking, Platform, Text, View } from 'react-native';

import { CodeBlock } from './CodeBlock';

const MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });
const BODY = 'text-[16px] leading-[25px] text-ink dark:text-[#ececec]';

function Inline({ tokens }: { tokens: Token[] | undefined }): ReactNode {
  if (!tokens) return null;
  return tokens.map((t, i) => {
    switch (t.type) {
      case 'strong':
        return (
          <Text key={i} className="font-semibold">
            <Inline tokens={(t as Tokens.Strong).tokens} />
          </Text>
        );
      case 'em':
        return (
          <Text key={i} className="italic">
            <Inline tokens={(t as Tokens.Em).tokens} />
          </Text>
        );
      case 'del':
        return (
          <Text key={i} className="line-through">
            <Inline tokens={(t as Tokens.Del).tokens} />
          </Text>
        );
      case 'codespan':
        return (
          <Text
            key={i}
            className="rounded bg-paper-soft text-[14px] text-ink dark:bg-night-soft dark:text-[#ececec]"
            style={{ fontFamily: MONO }}
          >
            {` ${decode((t as Tokens.Codespan).text)} `}
          </Text>
        );
      case 'link': {
        const link = t as Tokens.Link;
        return (
          <Text
            key={i}
            className="text-accent underline"
            accessibilityRole="link"
            onPress={() => void Linking.openURL(link.href)}
          >
            <Inline tokens={link.tokens} />
          </Text>
        );
      }
      case 'br':
        return '\n';
      case 'text': {
        const text = t as Tokens.Text;
        return text.tokens ? <Inline key={i} tokens={text.tokens} /> : decode(text.text);
      }
      default:
        return 'text' in t ? decode(String(t.text)) : null;
    }
  });
}

function Block({ token, depth = 0 }: { token: Token; depth?: number }): ReactNode {
  switch (token.type) {
    case 'heading': {
      const h = token as Tokens.Heading;
      const size =
        h.depth <= 1
          ? 'text-[22px] leading-[30px]'
          : h.depth === 2
            ? 'text-[20px] leading-[28px]'
            : 'text-[17px] leading-[25px]';
      return (
        <Text
          accessibilityRole="header"
          className={`mb-1 mt-3 font-semibold text-ink dark:text-[#ececec] ${size}`}
        >
          <Inline tokens={h.tokens} />
        </Text>
      );
    }
    case 'paragraph':
      return (
        <Text selectable className={`my-1.5 ${BODY}`}>
          <Inline tokens={(token as Tokens.Paragraph).tokens} />
        </Text>
      );
    case 'code': {
      const c = token as Tokens.Code;
      return <CodeBlock code={c.text} language={c.lang || undefined} />;
    }
    case 'blockquote':
      return (
        <View className="my-2 border-l-[3px] border-paper-line pl-3 dark:border-night-line">
          {(token as Tokens.Blockquote).tokens.map((t, i) => (
            <Block key={i} token={t} depth={depth} />
          ))}
        </View>
      );
    case 'list': {
      const list = token as Tokens.List;
      const start = typeof list.start === 'number' ? list.start : 1;
      return (
        <View className="my-1.5" style={{ paddingLeft: depth ? 16 : 2 }}>
          {list.items.map((item, i) => (
            <View key={i} className="my-0.5 flex-row">
              <Text className={`w-6 ${BODY}`}>{list.ordered ? `${start + i}.` : '•'}</Text>
              <View className="flex-1">
                {item.tokens.map((t, j) =>
                  t.type === 'text' ? (
                    <Text key={j} selectable className={BODY}>
                      <Inline tokens={(t as Tokens.Text).tokens ?? [t]} />
                    </Text>
                  ) : (
                    <Block key={j} token={t} depth={depth + 1} />
                  ),
                )}
              </View>
            </View>
          ))}
        </View>
      );
    }
    case 'table': {
      const table = token as Tokens.Table;
      const row = (cells: Tokens.TableCell[], header: boolean, key: string | number) => (
        <View key={key} className={`flex-row ${header ? 'bg-paper-soft dark:bg-night-soft' : ''}`}>
          {cells.map((cell, i) => (
            <Text
              key={i}
              className={`flex-1 border-paper-line px-2 py-1.5 text-[14px] leading-[20px] text-ink dark:border-night-line dark:text-[#ececec] ${header ? 'font-semibold' : ''} ${i > 0 ? 'border-l' : ''}`}
            >
              <Inline tokens={cell.tokens} />
            </Text>
          ))}
        </View>
      );
      return (
        <View className="my-2 overflow-hidden rounded-xl border border-paper-line dark:border-night-line">
          {row(table.header, true, 'h')}
          {table.rows.map((r, i) => (
            <View key={i} className="border-t border-paper-line dark:border-night-line">
              {row(r, false, i)}
            </View>
          ))}
        </View>
      );
    }
    case 'hr':
      return <View className="my-4 h-px bg-paper-line dark:bg-night-line" />;
    case 'space':
      return null;
    default:
      return 'text' in token ? <Text className={BODY}>{decode(String(token.text))}</Text> : null;
  }
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};
function decode(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

/** Native markdown renderer built on marked's lexer (no WebView). */
export const Markdown = memo(function Markdown({ children }: { children: string }) {
  const tokens = useMemo(() => Lexer.lex(children, { gfm: true }), [children]);
  return (
    <View>
      {tokens.map((t, i) => (
        <Block key={i} token={t} />
      ))}
    </View>
  );
});
