type MaybeString = string | undefined

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

export async function rememberDocumentHash(json: string): Promise<string> {
  const hash = await newDocumentHash(json)
  const docHash = { hash, json }
  docHashes.push(docHash)
  if (docHashes.length > MAX_DOCUMENT_HASHES)
    docHashes = docHashes.slice(1)
  return hash
}

export function getDocumentHash(search_hash: string): object | undefined {
  for (let i = docHashes.length - 1; i >= 0; i--) {
    const { hash, json } = docHashes[i]
    if (search_hash === hash)
      return JSON.parse(json)
  }
}