import { createChatService, testConnection } from './createChatService';
import { HttpChatService } from './http/HttpChatService';
import { MockChatService } from './mock/MockChatService';

jest.mock('expo/fetch', () => ({ fetch: jest.fn() }));

describe('createChatService', () => {
  it('builds the on-device mock', () => {
    expect(createChatService('mock', 'http://x')).toBeInstanceOf(MockChatService);
  });

  it('builds the HTTP client for server mode', () => {
    expect(createChatService('server', 'http://x')).toBeInstanceOf(HttpChatService);
  });

  it('testConnection resolves with the model count', async () => {
    const { fetch } = jest.requireMock<{ fetch: jest.Mock }>('expo/fetch');
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      body: null,
      text: async () =>
        JSON.stringify({
          object: 'list',
          data: [{ id: 'mock-fast', object: 'model', owned_by: 'x' }],
        }),
    });
    await expect(testConnection('http://x')).resolves.toBe(1);
  });
});
