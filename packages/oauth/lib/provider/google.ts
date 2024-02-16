import { createDecoder, type JwtHeader } from 'fast-jwt'
import { compactVerify, importJWK } from 'jose'
import { type ModuleOptions } from 'simple-oauth2'
import { fetchKey } from '../jwks'
import { AuthorizationCodeProvider } from './provider'

export interface GoogleProviderOptions extends Omit<ModuleOptions, 'auth'> {
  auth?: ModuleOptions['auth']
}

export class GoogleProvider extends AuthorizationCodeProvider {
  constructor (options: GoogleProviderOptions) {
    // we provide pre-defined value
    const option = options as ModuleOptions
    option.auth ??= {} as any
    option.auth.tokenHost = 'https://oauth2.googleapis.com'
    option.auth.tokenPath = '/token'
    option.auth.authorizeHost = 'https://accounts.google.com'
    option.auth.authorizePath = '/o/oauth2/auth'
    super(option)
  }

  async validateIdToken (token: string): Promise<unknown> {
    const decode = createDecoder({ complete: true })
    const { header, payload }: { header: JwtHeader, payload: { iss: string } } = decode(token)
    const rawKey = await fetchKey('https://www.googleapis.com/oauth2/v3/certs', String(header.kid))
    const key = await importJWK(rawKey, rawKey.alg)

    try {
      await compactVerify(token, key, { algorithms: [header.alg] })
    } catch {
      throw Error('invalid-signature')
    }

    // it must be https://accounts.google.com | accounts.google.com
    if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
      throw Error('invalid-google-iss')
    }

    return payload
  }

  async fetchProfile<T = unknown>(token: string): Promise<T> {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`)
    return await response.json() as T
  }
}
