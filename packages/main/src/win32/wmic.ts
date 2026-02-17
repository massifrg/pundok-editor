import { existsSync } from 'fs';
import * as os from 'os'
import { join as joinPath } from 'path'

export type WmiCommand = "wmic" | "Get-WmiObject";

export function selectWmiCommand(): WmiCommand {
  const release = os.release(); // e.g. "10.0.22631"
  const version = release.split(".").map(n => parseInt(n, 10));

  // WMIC fully removed starting with Windows 11 25H2 (10.0.26100+)
  const wmicRemovedVersion = [10, 0, 26100];

  const isLessThan = (v: number[], limit: number[]) => {
    for (let i = 0; i < limit.length; i++) {
      if (v[i] < limit[i]) return true;
      if (v[i] > limit[i]) return false;
    }
    return true;
  };

  // Check if WMIC exists (covers Insider builds where it's disabled)
  const wmicPath = joinPath(
    process.env.SystemRoot ?? "C:\\Windows",
    "System32",
    "wbem",
    "wmic.exe"
  );
  const wmicExists = existsSync(wmicPath);

  // Decision logic:
  // - WMIC must exist
  // - OS version must be older than the removal version
  if (wmicExists && isLessThan(version, wmicRemovedVersion)) {
    return "wmic";
  }

  // Otherwise, use Get-WmiObject (always available)
  return "Get-WmiObject";
}
