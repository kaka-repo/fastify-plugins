import { type Collection, type Db } from 'mongodb'
import { Adapter, type AdapterOptions, type Task } from './adapter'

export interface MongoDBAdapterOptions extends AdapterOptions {
  db: Db
}

export class MongoDBAdapter extends Adapter {
  db: Db
  collection: Collection
  collectionLock: Collection

  constructor (options: MongoDBAdapterOptions) {
    super(options)
    this.db = options.db
    this.collection = this.db.collection('__cron__.task')
    this.collectionLock = this.db.collection('__cron__.lock')
  }

  async prepare (): Promise<void> {
    await this.collection.createIndex({ tid: 1 }, { unique: true }).catch(() => {})
    await this.collection.createIndex({ tid: 1, isDeleted: 1 }, { unique: false }).catch(() => {})
    await this.collection.createIndex({ executeAt: 1 }, { unique: false }).catch(() => {})

    await this.collectionLock.createIndex({ expireAt: 1 }, { unique: false, expireAfterSeconds: 1 }).catch(() => {})
    await this.collectionLock.createIndex({ application: 1 }, { unique: true }).catch(() => {})
  }

  async aquireLock (): Promise<boolean> {
    const expireAt = Date.now() + this.maxExecutionMS
    const result = await this.collectionLock.findOne({ application: this.application })
    if (result !== null) return false
    await this.collectionLock.insertOne({ application: this.application, expireAt })
    return true
  }

  async releaseLock (): Promise<void> {
    await this.collectionLock.deleteOne({ application: this.application })
  }

  async fetchTasks (executeAt: number): Promise<Task[]> {
    const cursor = this.collection.find<Task>({
      executeAt: {
        $lte: executeAt
      }
    })
    return await cursor.toArray()
  }

  async createTask (task: Task): Promise<Task> {
    // we use upsert here since multiple instance may register the same task
    await this.collection.updateOne({ tid: task.tid }, { $set: task }, { upsert: true })
    return task
  }

  async updateTask (task: Task, nextExecuteAt: number, isDeleted: boolean): Promise<Task> {
    const result = await this.collection.findOneAndUpdate({ tid: task.tid }, { $set: { executeAt: nextExecuteAt, isDeleted } })
    return result as never as Task
  }

  async updateTasks (tasks: Task[], executeAt: number, isDeleted: boolean): Promise<Task[]> {
    await this.collection.updateMany({
      tid: {
        $in: tasks.map((t) => t.tid)
      }
    }, {
      $set: {
        executeAt,
        isDeleted
      }
    })
    return tasks
  }
}
