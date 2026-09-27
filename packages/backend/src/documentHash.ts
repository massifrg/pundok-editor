import type { RenderingJob } from '../../common/src';

const MAX_DOCUMENT_HASHES = 200;

interface DocumentHash {
  hash: string;
  json: string;
}

export async function newDocumentHash(
  json: string,
  algo = 'SHA-1',
): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(algo, new TextEncoder().encode(json)),
    ),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}

export class RenderingJobStore {
  private documentHashes: DocumentHash[] = [];

  async remember(job: RenderingJob): Promise<string> {
    const json = JSON.stringify(job);
    const hash = await newDocumentHash(json);
    this.documentHashes.push({ hash, json });
    if (this.documentHashes.length > MAX_DOCUMENT_HASHES)
      this.documentHashes = this.documentHashes.slice(1);
    return hash;
  }

  getAsJson(hash: string): string | undefined {
    const job = this.find(hash);
    return job?.json;
  }

  get(hash: string): RenderingJob | undefined {
    const json = this.getAsJson(hash);
    return json ? JSON.parse(json) : undefined;
  }

  isKnown(hash: string): boolean {
    return !!this.find(hash);
  }

  private find(hash: string): DocumentHash | undefined {
    for (let index = this.documentHashes.length - 1; index >= 0; index--) {
      const job = this.documentHashes[index];
      if (job.hash === hash) return job;
    }
  }
}

const desktopRenderingJobs = new RenderingJobStore();

export function desktopRenderingJobStore(): RenderingJobStore {
  return desktopRenderingJobs;
}

export function rememberDocumentHash(job: RenderingJob): Promise<string> {
  return desktopRenderingJobs.remember(job);
}

export function getRenderingJobWithHashAsJsonString(
  hash: string,
): string | undefined {
  return desktopRenderingJobs.getAsJson(hash);
}

export function getRenderingJobWithHash(
  hash: string,
): RenderingJob | undefined {
  return desktopRenderingJobs.get(hash);
}

export function isKnownDocumentHash(hash: string): boolean {
  return desktopRenderingJobs.isKnown(hash);
}
