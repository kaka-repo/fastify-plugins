import cronParser from 'cron-parser'
import { kAdapter } from '../symbols'

export interface Task {
  tid: string
  cron: string
  once: boolean
  executeAt: number
  isDeleted: boolean
}

export interface CreateTask<Context = unknown> {
  name: string
  cron: string
  once?: boolean
  context?: Context
  executor: (context: Context) => void | Promise<void>
}

export interface AdapterOptions {
  application: string
  minTickMS?: number
  maxTickMS?: number
  maxExecutionMS?: number
}

export class Adapter {
  application: string
  name: string
  nextTimer: null | NodeJS.Timeout
  isDestroyed: boolean
  tasks: Record<string, { context: unknown, executor: (context: unknown) => void | Promise<void> }>

  minTickMS: number
  maxTickMS: number
  maxExecutionMS: number

  static [kAdapter]: any = true

  constructor (options: AdapterOptions) {
    this.name = 'Adapter'
    this.nextTimer = null
    this.isDestroyed = false
    this.tasks = Object.create(null)

    this.application = options.application
    this.minTickMS = options.minTickMS ?? 128
    this.maxTickMS = options.maxTickMS ?? 896
    this.maxExecutionMS = options.maxExecutionMS ?? 900_000

    this.tick()
  }

  // prepare before instance start
  // for example, database connection
  async prepare (): Promise<void> {}

  // aquire lock to prevent collision
  async aquireLock (): Promise<boolean> {
    throw Error('missing implementation of aquireLock')
  }

  // error-free wrapper
  async _aquireLock (): Promise<boolean> {
    try {
      return await this.aquireLock()
    } catch {
      return false
    }
  }

  // release lock to allow runtime
  async releaseLock (): Promise<void> {
    throw Error('missing implementation of releaseLock')
  }

  // error-free wrapper
  async _releaseLock (): Promise<void> {
    try {
      await this.releaseLock()
    } catch {}
  }

  async addTask (task: CreateTask): Promise<void> {
    this.tasks[task.name] = {
      context: task.context,
      executor: task.executor
    }
    const nextExecuteAt = cronParser.parseExpression(task.cron).next()
    await this.createTask({
      tid: task.name,
      cron: task.cron,
      once: task.once ?? false,
      executeAt: Number(nextExecuteAt.toDate()),
      isDeleted: false
    })
  }

  async fetchTasks (executeAt: number): Promise<Task[]> {
    throw Error('missing implementation of fetchTasks')
  }

  async createTask (task: Task): Promise<Task> {
    throw Error('missing implementation of createTask')
  }

  async updateTasks (tasks: Task[], executeAt: number, isDeleted: boolean): Promise<Task[]> {
    throw Error('missing implementation of updateTasks')
  }

  async updateTask (task: Task, nextExecuteAt: number, isDeleted: boolean): Promise<Task> {
    throw Error('missing implementation of updateTask')
  }

  async runTask (task: Task): Promise<boolean> {
    if (this.isDestroyed || task.isDeleted) return false

    const done = async (executeAt: number): Promise<void> => {
      await this.updateTask(task, executeAt, task.once)
    }

    const { context, executor } = this.tasks[task.tid]
    if (typeof executor !== 'function') {
      await done(Date.now() + this.maxExecutionMS)
      return false
    }

    const nextExecuteAt = cronParser.parseExpression(task.cron).next()

    await executor(context)
    await done(Number(nextExecuteAt.toDate()))

    return true
  }

  // error-free wrapper
  async _runTask (task: Task): Promise<boolean> {
    try {
      return await this.runTask(task)
    } catch {
      return false
    }
  }

  async runTasks (): Promise<boolean> {
    if (this.isDestroyed) return false

    const executeAt = Date.now()
    const nextExecuteAt = executeAt + this.maxExecutionMS

    // we aquire lock to prevent execution tasks at the same time
    const isLocked = await this._aquireLock()
    if (!isLocked) {
      // when we failed to aquire lock
      // we schedule next tick
      this.tick()
      return false
    }

    // fetch tasks
    try {
      const tasks = await this.fetchTasks(executeAt)
      // we re-schedule the task
      await this.updateTasks(tasks, nextExecuteAt, false)

      for (const task of tasks) {
        // we should not wait for the task here
        // otherwise the whole scheduler stuck
        void this._runTask(task)
      }
    } finally {
      await this._releaseLock()
      this.tick()
    }

    return true
  }

  tick (): void {
    if (this.isDestroyed) return
    this.nextTimer = setTimeout(() => {
      this.runTasks().catch(() => {})
    }, Math.round((Math.random() * this.maxTickMS) + this.minTickMS))
  }

  destroy (): boolean {
    if (!this.isDestroyed) {
      this.isDestroyed = true
      this.nextTimer !== null && clearTimeout(this.nextTimer)
      this.nextTimer = null
      return true
    }
    return false
  }
}
