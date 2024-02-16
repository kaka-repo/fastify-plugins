import { type ModuleOptions } from 'simple-oauth2'
import { AuthorizationCodeProvider } from './provider'

export interface FacebookProviderOptions extends Omit<ModuleOptions, 'auth'> {
  auth?: ModuleOptions['auth']
}

export class FacebookProvider extends AuthorizationCodeProvider {
  constructor (options: FacebookProviderOptions) {
    // we provide pre-defined value
    const option = options as ModuleOptions
    option.auth ??= {} as any
    option.auth.tokenHost = 'https://graph.facebook.com'
    option.auth.tokenPath = '/v19.0/oauth/access_token'
    option.auth.authorizeHost = 'https://facebook.com'
    option.auth.authorizePath = '/v19.0/dialog/oauth'
    super(option)
  }

  async #createAppAccessToken (): Promise<string> {
    const response = await fetch(`https://graph.facebook.com/oauth/access_token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`)
    const body: any = await response.json()
    return body.access_token
  }

  async validateIdToken (token: string): Promise<unknown> {
    const appAccessToken = await this.#createAppAccessToken()
    const response = await fetch(`https:/graph.facebook.com/debug_token?input_token=${token}&access_token=${appAccessToken}`)
    const body: any = await response.json()
    if (!(body.is_valid as boolean)) throw Error('invalid-token')
    return body.data
  }

  async fetchProfile<T = unknown>(token: string): Promise<T> {
    const response = await fetch(`https://graph.facebook.com/v13.0/me?access_token=${token}&fields=id,name,email`)
    return await response.json() as T
  }
}
