import { parseExpression } from 'cron-parser'
import { JoSk } from 'josk'

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/try#using_promise.try
const promiseTry = function (func: Function) {
  return new Promise((resolve, reject) => {
    try {
      resolve(func())
    } catch (err) {
      reject(err)
    }
  })
}

export class CronJob extends JoSk {
  async setCronJob (func: () => void | Promise<void>, cron: string, uid: string): Promise<string> {
    const nextTimestamp = +parseExpression(cron).next().toDate()
    const that = this
    return await this.setInterval(function (ready) {
      ready(parseExpression(cron).next().toDate())
      // since we are cron
      // we should not throw when there is error
      promiseTry(func).catch((error) => {
        if (typeof that.onError === 'function') {
          that.onError('cronjob recieved error', {
            description: 'cronjob recieved error',
            error,
            uid
          })
        }
      })
    }, nextTimestamp - Date.now(), uid)
  }

  async setLoopTask (func: () => void | Promise<void>, uid: string): Promise<string> {
    const that = this
    return await this.setImmediate(function () {
      promiseTry(func)
        .catch((error) => {
          if (typeof that.onError === 'function') {
            that.onError('loop task recieved error', {
              description: 'loop task recieved error',
              error: error as Error,
              uid
            })
          }
        })
        .finally(() => {
          that.setLoopTask(func, uid)
        })
    }, uid)
  }
}
