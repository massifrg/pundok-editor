import {
  mkdir,
  mkdtemp,
  rm,
  stat,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PundokEditorServer } from '../../packages/server/src/pundokEditorServer';
import { EditorEventHub } from '../../packages/server/src/editorEventHub';
import {
  IMAGE_CACHE_MAX_AGE_MS,
  loadCachedPdfImage,
  loadImage,
} from '../../packages/server/src/image';

describe('loadImage', () => {
  let directory: string;
  let userDirectory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pundok-image-'));
    userDirectory = join(directory, 'user');
    await mkdir(userDirectory);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('returns supported raster images with their MIME type', async () => {
    const path = join(directory, 'image.png');
    const contents = Buffer.from('png contents');
    await writeFile(path, contents);

    await expect(loadImage(path, undefined)).resolves.toEqual({
      body: contents,
      contentType: 'image/png',
    });
  });

  it('rejects unsupported image formats', async () => {
    await expect(
      loadImage(join(directory, 'image.bmp'), undefined),
    ).rejects.toThrow('Unsupported image format');
  });

  it('uses a cached PDF page until its source PDF changes', async () => {
    const pdf = join(userDirectory, 'image.pdf');
    const cacheDirectory = join(userDirectory, '.pundok-editor', 'image-cache');
    await writeFile(pdf, 'first PDF version');
    const renderPdf = vi.fn(async () => Buffer.from('rendered page'));

    await expect(
      loadCachedPdfImage(pdf, '0', cacheDirectory, renderPdf),
    ).resolves.toEqual(Buffer.from('rendered page'));
    await expect(
      loadCachedPdfImage(pdf, '0', cacheDirectory, renderPdf),
    ).resolves.toEqual(Buffer.from('rendered page'));
    expect(renderPdf).toHaveBeenCalledTimes(1);

    await utimes(pdf, new Date(), new Date(Date.now() + 60_000));
    await loadCachedPdfImage(pdf, '0', cacheDirectory, renderPdf);
    expect(renderPdf).toHaveBeenCalledTimes(2);
  });

  it('removes expired cached PDF pages', async () => {
    const pdf = join(userDirectory, 'image.pdf');
    const cacheDirectory = join(userDirectory, '.pundok-editor', 'image-cache');
    await mkdir(cacheDirectory, { recursive: true });
    await writeFile(pdf, 'PDF');
    const expiredCache = join(cacheDirectory, 'expired.jpg');
    await writeFile(expiredCache, 'stale image');
    const expired = new Date(Date.now() - IMAGE_CACHE_MAX_AGE_MS - 1_000);
    await utimes(expiredCache, expired, expired);

    await loadCachedPdfImage(pdf, '0', cacheDirectory, async () =>
      Buffer.from('fresh image'),
    );

    await expect(stat(expiredCache)).rejects.toThrow();
  });

  it('follows image symlinks within the user directory', async () => {
    const outside = join(directory, 'outside.png');
    const link = join(userDirectory, 'linked.png');
    await writeFile(outside, 'outside image');
    await symlink(outside, link);
    const server = new PundokEditorServer(
      () => ({
        userDataDir: userDirectory,
        configurationsDir: join(directory, 'configs'),
        localConfigurationsDir: join(userDirectory, 'localconfigs'),
      }),
      new EditorEventHub(),
      () => [],
    );

    await expect(server.image('alice', link)).resolves.toEqual({
      body: Buffer.from('outside image'),
      contentType: 'image/png',
    });
  });
});
