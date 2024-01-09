import undici, { Agent, type FormData } from 'undici'

const dispatcher = new Agent({
  keepAliveTimeout: 10,
  keepAliveMaxTimeout: 10
})

export async function request (
  url: string,
  formData: FormData,
  headers?: Record<string, string>
): Promise<{ status: number, body: string, json: () => any }> {
  const response = await undici.request(url, {
    method: 'POST',
    headers,
    body: formData,
    dispatcher
  })

  const responseBody = await response.body.text()

  return {
    status: response.statusCode,
    body: responseBody,
    json () {
      return JSON.parse(responseBody)
    }
  }
}
