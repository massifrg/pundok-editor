import { execSync } from 'node:child_process';

function getElectronEnv() {
  const output = execSync(
    `npx electron -p "JSON.stringify(process.versions)"`,
    {
      encoding: 'utf-8',
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: 1,
      },
    },
  );

  const lines = output.trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    try {
      return JSON.parse(line);
    } catch {
      // Electron can print download progress before the requested JSON.
    }
  }

  throw new Error(
    `Electron did not return its version information. Output:\n${output}`,
  );
}

function createElectronEnvLoader() {
  let inMemoryCache = null;

  return () => {
    if (inMemoryCache) {
      return inMemoryCache;
    }

    return (inMemoryCache = getElectronEnv());
  };
}

const envLoader = createElectronEnvLoader();

export function getElectronVersions() {
  return envLoader();
}

export function getChromeVersion() {
  return getElectronVersions().chrome;
}

export function getChromeMajorVersion() {
  return getMajorVersion(getChromeVersion());
}

export function getNodeVersion() {
  return getElectronVersions().node;
}

export function getNodeMajorVersion() {
  return getMajorVersion(getNodeVersion());
}

function getMajorVersion(version) {
  return parseInt(version.split('.')[0]);
}
