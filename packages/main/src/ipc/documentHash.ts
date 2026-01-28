import { RenderingJob } from "../common";

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

export async function rememberDocumentHash(obj: RenderingJob): Promise<string> {
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

export function getRenderingJobWithHashAsJsonString(hash: string): string | undefined {
  const index = indexOfDocumentHash(hash)
  return index >= 0 ? docHashes[index].json : undefined
}

export function getRenderingJobWithHash(hash: string): RenderingJob | undefined {
  const jsonstring = getRenderingJobWithHashAsJsonString(hash)
  return jsonstring ? JSON.parse(jsonstring) : undefined
}

export function isKnownDocumentHash(hash: string): boolean {
  return indexOfDocumentHash(hash) >= 0
}