import { type JWK } from 'jose'

export async function fetchKeys (path: string): Promise<JWK[]> {
  const response = await fetch(path)
  const body: any = await response.json()
  return body.keys
}

export async function fetchKey (path: string, kid: string): Promise<JWK> {
  const keys = await fetchKeys(path)
  const key = keys.find((key) => key.kid === kid)
  if (typeof key === 'undefined') throw Error('no public key found')
  return key
}
