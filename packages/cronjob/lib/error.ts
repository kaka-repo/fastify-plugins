import { format } from 'util'

function createError (code: string, message: string, statusCode: number = 500): (...args: any[]) => Error {
  code = code.toUpperCase()

  return function CustomError () {
    const err: any = Error(format(message, ...arguments))
    err.code = code
    err.statusCode = statusCode
    return err
  }
}

export const FST_CJ_INVALID_OPTION = createError('FST_CJ_INVALID_OPTION', '%s is expected to be "%s", but recieved "%s"')
