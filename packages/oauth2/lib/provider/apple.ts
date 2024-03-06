import { createDecoder, type JwtHeader } from 'fast-jwt'
import { compactVerify, importJWK } from 'jose'
import { type AccessToken, type ModuleOptions } from 'simple-oauth2'
import { fetchKey } from '../jwks'
import { AuthorizationCodeProvider } from './provider'

export interface AppleProviderOptions extends Omit<ModuleOptions, 'auth'> {
  auth?: ModuleOptions['auth']
}

export class AppleProvider extends AuthorizationCodeProvider {
  constructor (options: AppleProviderOptions) {
    // we provide pre-defined value
    const option = options as ModuleOptions
    option.auth ??= {} as any
    option.auth.tokenHost = 'https://appleid.apple.com'
    option.auth.tokenPath = '/auth/token'
    option.auth.authorizeHost = 'https://appleid.apple.com'
    option.auth.authorizePath = '/auth/authorize'
    // we always use form body by default
    option.options ??= {}
    option.options.bodyFormat = 'form'
    option.options.authorizationMethod = 'body'
    super(option)
  }

  // google doesn't need to verify the access token
  async validateToken (token: AccessToken): Promise<unknown> {
    return token.token
  }

  async validateIdToken (token: string): Promise<unknown> {
    const decode = createDecoder({ complete: true })
    const { header, payload }: { header: JwtHeader, payload: { iss: string } } = decode(token)
    const rawKey = await fetchKey('https://appleid.apple.com/auth/keys', String(header.kid))
    const key = await importJWK(rawKey, rawKey.alg)

    try {
      await compactVerify(token, key, { algorithms: [header.alg] })
    } catch {
      throw Error('invalid-signature')
    }

    // it must be https://appleid.apple.com
    if (payload.iss !== 'https://appleid.apple.com') {
      throw Error('invalid-iss')
    }

    return payload
  }
}
