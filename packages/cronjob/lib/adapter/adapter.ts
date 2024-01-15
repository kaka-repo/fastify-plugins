import { type CreateTask, type Task } from '../cronjob'
import { kAdapter } from '../symbols'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AdapterOptions {
}

export class Adapter {
  readonly #options: AdapterOptions

  constructor (options: AdapterOptions) {
    this.#options = options
  }

  static [kAdapter]: any = true

  async prepare (): Promise<void> {
  }

  async fetchTasks (executeAt: number): Promise<Task[]> {
    throw Error('missing implementation of fetchTasks')
  }

  async createTask (task: CreateTask): Promise<void> {
    throw Error('missing implementation of createTask')
  }

  async updateTasks (tasks: string[], executeAt: number): Promise<void> {
    throw Error('missing implementation of updateTasks')
  }

  async updateTask (uid: string, executeAt: number, isDeleted: boolean): Promise<Task | null> {
    throw Error('missing implementation of updateTask')
  }

  async deleteTask (uid: string): Promise<void> {
    throw Error('missing implementation of deleteTask')
  }

  async aquireLock (name: string, expireAt: number): Promise<boolean> {
    throw Error('missing implementation of aquireLock')
  }

  async releaseLock (name: string): Promise<void> {
    throw Error('missing implementation of releaseLock')
  }
}
