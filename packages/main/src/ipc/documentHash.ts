import { OutputConverter } from "../../../common/src";

interface ExportJob {
  path: string,
  converter: OutputConverter,
  configurationName?: string,
  projectAsJsonString?: string,
}

const MAX_DOCUMENT_HASHES = 200
interface DocHash {
  hash: string,
  json: string
}
let docHashes: DocHash[] = []

export async function newDocumentHash(json: string, algo = 'SHA-1'): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(algo, new TextEncoder().encode(json))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function rememberDocumentHash(obj: ExportJob): Promise<string> {
  const json = JSON.stringify(obj)
  const hash = await newDocumentHash(json)
  const docHash = { hash, json }
  docHashes.push(docHash)
  if (docHashes.length > MAX_DOCUMENT_HASHES)
    docHashes = docHashes.slice(1)
  // console.log(`new hash ${hash} for: ${json}`)
  return hash
}

function indexOfDocumentHash(search_hash: string): number {
  for (let index = docHashes.length - 1; index >= 0; index--) {
    if (search_hash === docHashes[index].hash)
      return index
  }
  return -1
}

export function getDocumentHash(hash: string): ExportJob | undefined {
  const index = indexOfDocumentHash(hash)
  return index >= 0 ? JSON.parse(docHashes[index].json) : undefined
}

export function isKnownDocumentHash(hash: string): boolean {
  return indexOfDocumentHash(hash) >= 0
}