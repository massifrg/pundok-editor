import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetBackend } from '../src/backend/netbackend';

vi.mock('../src/backend/editorEventHandlers', () => ({
  handleEditorEvent: vi.fn(),
}));

describe('NetBackend login', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves while the authenticated event stream remains open', async () => {
    const storedValues = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storedValues.get(key) ?? null,
        setItem: (key: string, value: string) => storedValues.set(key, value),
        removeItem: (key: string) => storedValues.delete(key),
      },
      addEventListener: vi.fn(),
    });

    const fetchMock = vi.fn(
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url = String(input);
        if (url === '/backend/login') {
          return new Response(
            JSON.stringify({ token: 'session-token', user: 'user' }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
        if (url === '/backend/events') {
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              if (init?.signal?.aborted) controller.close();
              else
                init?.signal?.addEventListener(
                  'abort',
                  () => controller.close(),
                  { once: true },
                );
            },
          });
          return new Response(body, { status: 200 });
        }
        if (url === '/backend/logout') {
          return new Response('true', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`Unexpected request: ${url}`);
      },
    );
    vi.stubGlobal('fetch', fetchMock);

    const backend = new NetBackend();
    const loginResult = await Promise.race([
      backend.login('user', 'password'),
      new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), 100),
      ),
    ]);

    await backend.logout();

    expect(loginResult).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/backend/events',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
