import { type FastifyRequest } from 'fastify'
import { AuthorizationCode, type AccessToken, type AuthorizationTokenConfig, type ClientCredentialTokenConfig, type ClientCredentials, type ModuleOptions, type PasswordTokenConfig, type ResourceOwnerPassword, type Token, type WreckHttpOptions } from 'simple-oauth2'

export abstract class Provider {
  client!: AuthorizationCode | ResourceOwnerPassword | ClientCredentials

  // when no overrided action, throw Error
  async validateIdToken (token: string): Promise<unknown> {
    throw Error('validateIdToken is not supported.')
  }

  // when no overrided action, throw Error
  async fetchProfile<T = unknown> (token: string): Promise<T> {
    throw Error('fetchProfile is not supported.')
  }

  authorizeURL (request: FastifyRequest, options: AuthorizeURLOption): string {
    throw Error('authorizeURL is not supported.')
  }

  async getToken (request: FastifyRequest, options: AuthorizationTokenConfig | PasswordTokenConfig | ClientCredentialTokenConfig, httpOptions?: WreckHttpOptions): Promise<AccessToken> {
    return await this.client.getToken(options as any, httpOptions)
  }

  createToken (token: Token): AccessToken {
    return this.client.createToken(token)
  }
}

export type AuthorizeURLOption<ClientIdName extends string = 'client_id'> = {
  scope?: string | string[]
  state?: string
  redirect_uri: string
} & {
  [key in ClientIdName]?: string
}

export class AuthorizationCodeProvider<ClientIdName extends string = 'client_id'> extends Provider {
  client: AuthorizationCode
  clientId: string
  clientSecret: string

  constructor (options: ModuleOptions<ClientIdName>) {
    super()
    this.clientId = options.client.id
    this.clientSecret = options.client.secret
    this.client = new AuthorizationCode(options)
  }

  authorizeURL (request: FastifyRequest, options: AuthorizeURLOption): string {
    // we ease the usage to auto provide the base URL
    // so, developer don't need to change it between
    // development and production
    const baseURL = `${request.protocol}://${request.hostname}`
    const redirectURI = new URL(options.redirect_uri, baseURL)

    return this.client.authorizeURL({
      ...options,
      redirect_uri: redirectURI.href,
    })
  }

  async getToken (request: FastifyRequest, options: AuthorizationTokenConfig, httpOptions?: WreckHttpOptions): Promise<AccessToken> {
    // we ease the usage to auto provide the base URL
    // so, developer don't need to change it between
    // development and production
    const baseURL = `${request.protocol}://${request.hostname}`
    const redirectURI = new URL(options.redirect_uri, baseURL)

    return await this.client.getToken({
      ...options,
      redirect_uri: redirectURI.href,
    }, httpOptions)
  }
}
