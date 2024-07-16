import { type Collection, type CreateIndexesOptions, type Db, type IndexSpecification } from 'mongodb'
import { type CreateTask, type Task } from '../cronjob'
import { Adapter, type AdapterOptions } from './adapter'

export interface MongoDBAdapterOptions extends AdapterOptions {
  db: Db
}

async function ensureIndex (collection: Collection, indexSpec: IndexSpecification, options: CreateIndexesOptions): Promise<void> {
  try {
    await collection.createIndex(indexSpec, options)
  } catch {}
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
    await ensureIndex(this.collection, { uid: 1 }, { unique: true, background: false })
    await ensureIndex(this.collection, { uid: 1, isDeleted: 1 }, { unique: false, background: false })
    await ensureIndex(this.collection, { executeAt: 1 }, { unique: false, background: false })

    await ensureIndex(this.collectionLock, { expireAt: 1 }, { unique: false, expireAfterSeconds: 1, background: false })
    await ensureIndex(this.collectionLock, { application: 1 }, { unique: true, background: false })
  }

  async fetchTasks (executeAt: number): Promise<Task[]> {
    const cursor = this.collection.find<Task>({
      executeAt: {
        $lte: executeAt,
      },
    })
    return await cursor.toArray()
  }

  async createTask (task: CreateTask): Promise<void> {
    const _task = await this.collection.findOne<Task>({ uid: task.uid })
    const executeAt = Date.now() + task.delay
    if (_task === null) {
      await this.collection.insertOne({
        uid: task.uid,
        once: task.once ?? false,
        delay: task.delay,
        executeAt,
        isDeleted: false,
      })
    } else {
      const $set: any = { isDeleted: false }
      if (_task.delay !== task.delay) {
        $set.delay = task.delay
      }
      if (_task.executeAt !== executeAt) {
        $set.executeAt = executeAt
      }
      if ($set !== null) {
        await this.collection.updateOne({
          uid: task.uid,
        }, {
          $set,
        })
      }
    }
  }

  async updateTasks (uids: string[], executeAt: number): Promise<void> {
    await this.collection.updateMany({
      uid: {
        $in: uids,
      },
    }, {
      $set: {
        executeAt,
      },
    })
  }

  async updateTask (uid: string, executeAt: number, isDeleted: boolean): Promise<Task | null> {
    const result = await this.collection.findOneAndUpdate({
      uid,
    }, {
      $set: {
        executeAt,
        isDeleted,
      },
    })
    return result as Task | null
  }

  async deleteTask (uid: string): Promise<void> {
    await this.collection.deleteOne({ uid })
  }

  async aquireLock (name: string, expireAt: number): Promise<boolean> {
    const result = await this.collectionLock.findOne({ application: name })
    if (result !== null) return false
    await this.collectionLock.insertOne({ application: name, expireAt })
    return true
  }

  async releaseLock (name: string): Promise<void> {
    await this.collectionLock.deleteOne({ application: name })
  }
}
