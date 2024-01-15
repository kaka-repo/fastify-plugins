import { parseExpression } from 'cron-parser'
import EventEmitter from 'events'
import { type Adapter } from './adapter/adapter'

type _TaskExecutor = () => Promise<void>
export type TaskExecutor<Context = unknown> = (context: Context) => Promise<void>

export interface Task {
  uid: string
  once: boolean
  delay: number
  executeAt: number
  isDeleted: boolean
}

export interface CreateTask {
  uid: string
  once?: boolean
  delay: number
}

export interface CronJobOptions {
  application: string
  adapter: Adapter
  context?: unknown

  minTickMS?: number
  maxTickMS?: number
  maxExecutionMS?: number
}

export class CronJob<RootContext = unknown> extends EventEmitter {
  // state
  application: string
  #tasks: Record<string, _TaskExecutor>
  #deleted: Record<string, boolean>
  nextTick: null | NodeJS.Timeout
  isDestroyed: boolean
  isLocked: boolean
  adapter: Adapter
  readonly #context: RootContext

  // timing options
  minTickMS: number
  maxTickMS: number
  maxExecutionMS: number

  constructor (options: CronJobOptions) {
    super()
    this.application = options.application
    this.#tasks = {}
    this.#deleted = {}
    this.nextTick = null
    this.isDestroyed = false
    this.isLocked = false
    this.adapter = options.adapter
    this.#context = options.context as any

    this.minTickMS = options?.minTickMS ?? 128
    this.maxTickMS = options?.maxTickMS ?? 768
    this.maxExecutionMS = options?.maxExecutionMS ?? 900_000
    this.#tick()
  }

  async setInterval<Context = RootContext>(
    executor: TaskExecutor<Context>,
    ms: number,
    uid: string,
    context?: Context
  ): Promise<string> {
    if (this.isDestroyed) return ''
    // we need to prefix uid
    !uid.startsWith('interval-') && (uid = `interval-${uid}`)
    this.#tasks[uid] = async () => {
      try {
        await executor((context ?? this.#context) as Context)
      } catch (err) {
        this.emit('error', err)
      }
    }
    await this.adapter.createTask({
      uid,
      once: false,
      delay: ms
    })
    return uid
  }

  async setTimeout<Context = RootContext>(
    executor: TaskExecutor<Context>,
    ms: number,
    uid: string,
    context?: Context
  ): Promise<string> {
    if (this.isDestroyed) return ''
    // we need to prefix uid
    !uid.startsWith('timeout-') && (uid = `timeout-${uid}`)
    this.#tasks[uid] = async () => {
      try {
        await executor((context ?? this.#context) as Context)
      } catch (err) {
        this.emit('error', err)
      }
    }
    await this.adapter.createTask({
      uid,
      once: true,
      delay: ms
    })
    return uid
  }

  async setImmediate<Context = RootContext>(
    executor: TaskExecutor<Context>,
    uid: string,
    context?: Context
  ): Promise<string> {
    if (this.isDestroyed) return ''
    // we need to prefix uid
    !uid.startsWith('immediate-') && (uid = `immediate-${uid}`)
    this.#tasks[uid] = async () => {
      try {
        await executor((context ?? this.#context) as Context)
      } catch (err) {
        this.emit('error', err)
      }
    }
    await this.adapter.createTask({
      uid,
      once: true,
      delay: 0
    })
    return uid
  }

  async setCronJob<Context = RootContext>(
    executor: TaskExecutor<Context>,
    cron: string,
    uid: string,
    context?: Context
  ): Promise<string> {
    return await this.#setCronJob(executor, cron, uid, true, context)
  }

  async #setCronJob<Context = RootContext>(
    executor: TaskExecutor<Context>,
    cron: string,
    uid: string,
    fresh: boolean,
    context?: Context
  ): Promise<string> {
    const nextExecuteAt = Number(parseExpression(cron).next().toDate())
    const ms = nextExecuteAt - Date.now()
    const _uid = `timeout-cron-${uid}`
    if (fresh) this.#deleted[_uid] = false
    if (this.#deleted[_uid]) return ''

    return await this.setTimeout(async (context) => {
      if (this.#deleted[_uid]) return
      setImmediate(() => {
        // we execute immediately for the next task
        Promise.race([
          executor(context),
          this.#setCronJob(executor, cron, uid, false, context)
        ]).catch((err) => {
          this.emit('error', err)
        })
      })
    }, ms, _uid, context)
  }

  async setLoopTask<Context = RootContext>(
    executor: TaskExecutor<Context>,
    uid: string,
    context?: Context
  ): Promise<string> {
    return await this.#setLoopTask(executor, uid, true, context)
  }

  async #setLoopTask<Context = RootContext>(
    executor: TaskExecutor<Context>,
    uid: string,
    fresh: boolean,
    context?: Context
  ): Promise<string> {
    const _uid = `immediate-loop-${uid}`
    if (fresh) this.#deleted[_uid] = false
    if (this.#deleted[_uid]) return ''
    return await this.setImmediate(async (context) => {
      if (this.#deleted[_uid]) return
      try {
        await executor(context)
      } finally {
        await this.#setLoopTask(executor, uid, false, context)
      }
    }, _uid, context)
  }

  clearInterval (uid: string): void {
    this.#deleted[uid] = true
    this.#deleteTask(uid)
  }

  clearTimeout (uid: string): void {
    this.clearInterval(uid)
  }

  async #_deleteTask (uid: string): Promise<void> {
    const task = await this.adapter.updateTask(uid, Date.now() + this.maxExecutionMS, true)
    if (task !== null) {
      await this.adapter.deleteTask(uid)
    }
  }

  #deleteTask (uid: string): void {
    this
      .#_deleteTask(uid)
      .catch((err) => {
        this.emit('error', err)
      })
  }

  async destroy (): Promise<boolean> {
    if (!this.isDestroyed) {
      this.isDestroyed = true
      this.nextTick !== null && clearTimeout(this.nextTick)
      this.nextTick = null
      // we need to release lock when destroy
      await this.#releaseLock()
      return true
    }
    return false
  }

  async #aquireLock (nextExecuteAt: number): Promise<boolean> {
    try {
      this.isLocked = await this.adapter.aquireLock(this.application, nextExecuteAt)
      return this.isLocked
    } catch (err) {
      this.emit('error', err)
      return false
    }
  }

  async #releaseLock (): Promise<void> {
    try {
      if (!this.isLocked) return
      await this.adapter.releaseLock(this.application)
    } catch (err) {
      this.emit('error', err)
    }
  }

  async #_execute (task: Task): Promise<void> {
    if (this.isDestroyed || task.isDeleted) return

    const done = async (executeAt: number): Promise<void> => {
      await this.adapter.updateTask(task.uid, executeAt, task.once)
    }

    const executor = this.#tasks[task.uid]
    if (typeof executor !== 'function') {
      // when we missing runtime
      // we delay the task to maxExecutionMS
      await done(Date.now() + this.maxExecutionMS)
      this.emit('error', Error(`Task "${task.uid}" is missing runtime function.`))
      return
    }

    // when it only run once, we remove task before execute
    // it prevent another instance to pickup the task
    if (task.once) await this.#_deleteTask(task.uid)
    // execute
    await executor()
    const timestamp = Date.now()
    const nextExecuteAt = timestamp + task.delay
    // we emit executed event
    this.emit('executed', {
      uid: task.uid,
      delay: task.delay,
      timestamp
    })
    // when it allows to run multiple times
    // we update the executedAt information
    if (!task.once) await done(nextExecuteAt)
  }

  #execute (task: Task): void {
    this
      .#_execute(task)
      .catch((err) => {
        this.emit('error', err)
      })
  }

  async #_executeAll (): Promise<void> {
    if (this.isDestroyed) return

    const now = Date.now()
    const nextExecuteAt = now + this.maxExecutionMS
    const isLocked = await this.#aquireLock(nextExecuteAt)
    if (!isLocked) {
      this.#tick()
      return
    }

    try {
      const tasks = await this.adapter.fetchTasks(now)
      // we hold all tasks by delay executeAt to the maxExecutionMS
      await this.adapter.updateTasks(tasks.map((o) => o.uid), nextExecuteAt)
      for (const task of tasks) {
        this.#execute(task)
      }
    } catch (err) {
      this.emit('error', err)
    } finally {
      await this.#releaseLock()
      this.#tick()
    }
  }

  #executeAll (): void {
    this
      .#_executeAll()
      .catch((err) => {
        this.emit('error', err)
      })
  }

  #tick (): void {
    this.nextTick = setTimeout(() => {
      this.#executeAll()
    }, Math.round((Math.random() * this.maxTickMS) + this.minTickMS))
  }
}
