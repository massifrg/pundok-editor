import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { platform } from 'node:process';

const processes = new Map<string, ChildProcessWithoutNullStreams>();

export function renderingProcessKey(converterName: string, path: string): string {
  return JSON.stringify([converterName, path]);
}

export function registerRenderingProcess(
  key: string,
  process: ChildProcessWithoutNullStreams,
): void {
  processes.set(key, process);
}

export function unregisterRenderingProcess(
  key: string,
  process: ChildProcessWithoutNullStreams,
): void {
  if (processes.get(key) === process) processes.delete(key);
}

export function getRenderingProcess(
  key: string,
): ChildProcessWithoutNullStreams | undefined {
  return processes.get(key);
}

export function stopRenderingProcess(key: string): boolean {
  const child = processes.get(key);
  if (!child) return false;
  processes.delete(key);
  let stopped = false;
  if (platform === 'linux' && child.pid) {
    for (const pid of descendantProcessIds(child.pid).reverse()) {
      try {
        globalThis.process.kill(pid, 'SIGTERM');
        stopped = true;
      } catch {
        // The descendant may have exited while the process tree was read.
      }
    }
  }
  if (platform !== 'win32' && child.pid) {
    try {
      globalThis.process.kill(-child.pid, 'SIGTERM');
      stopped = true;
    } catch {
      // The process group may already have exited; fall back to the child.
    }
  }
  return child.kill() || stopped;
}

function descendantProcessIds(pid: number): number[] {
  let children: number[];
  try {
    children = readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(Number)
      .filter(Number.isInteger);
  } catch {
    return [];
  }
  return children.flatMap((childPid) => [
    childPid,
    ...descendantProcessIds(childPid),
  ]);
}
