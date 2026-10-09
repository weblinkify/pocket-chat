import {
  ChatCompletionChunkSchema,
  ChatCompletionRequestSchema,
  ErrorResponseSchema,
  ModelListSchema,
} from './schemas';

describe('ChatCompletionRequestSchema', () => {
  it('defaults stream to false', () => {
    const req = ChatCompletionRequestSchema.parse({
      model: 'mock-fast',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(req.stream).toBe(false);
  });

  it('rejects an empty message list', () => {
    expect(
      ChatCompletionRequestSchema.safeParse({ model: 'mock-fast', messages: [] }).success,
    ).toBe(false);
  });

  it('rejects unknown roles', () => {
    expect(
      ChatCompletionRequestSchema.safeParse({
        model: 'mock-fast',
        messages: [{ role: 'tool', content: 'x' }],
      }).success,
    ).toBe(false);
  });
});

describe('ChatCompletionChunkSchema', () => {
  it('accepts an OpenAI-style delta chunk', () => {
    const chunk = {
      id: 'chatcmpl-1',
      object: 'chat.completion.chunk',
      created: 1,
      model: 'mock-fast',
      choices: [{ index: 0, delta: { content: 'Hel' }, finish_reason: null }],
    };
    expect(ChatCompletionChunkSchema.parse(chunk).choices[0]?.delta.content).toBe('Hel');
  });

  it('rejects a chunk with no choices', () => {
    expect(
      ChatCompletionChunkSchema.safeParse({
        id: 'x',
        object: 'chat.completion.chunk',
        created: 1,
        model: 'm',
        choices: [],
      }).success,
    ).toBe(false);
  });
});

describe('ModelListSchema / ErrorResponseSchema', () => {
  it('parses a model list', () => {
    const list = ModelListSchema.parse({
      object: 'list',
      data: [{ id: 'mock-fast', object: 'model', owned_by: 'pocket-chat' }],
    });
    expect(list.data).toHaveLength(1);
  });

  it('parses an error body', () => {
    expect(
      ErrorResponseSchema.parse({ error: { message: 'boom', type: 'server_error' } }).error.message,
    ).toBe('boom');
  });
});
