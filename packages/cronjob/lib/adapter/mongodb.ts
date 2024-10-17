import { type Collection, type CreateIndexesOptions, type Db, type IndexSpecification } from 'mongodb'
import { type CreateTask, type Task } from '../cronjob'
import { Adapter, type AdapterOptions } from './adapter'

export interface MongoDBAdapterOptions extends AdapterOptions {
  db: Db
  name?: string
}

async function ensureIndex (collection: Collection, indexSpec: IndexSpecification, options: CreateIndexesOptions): Promise<void> {
  try {
    await collection.createIndex(indexSpec, options)
  } catch {}
}
export class MongoDBAdapter extends Adapter {
  db: Db
  name: string
  collection: Collection
  collectionLock: Collection
  resetOnInit: boolean

  constructor (options: MongoDBAdapterOptions) {
    super(options)
    this.db = options.db
    this.name = options.name ?? 'tasks'
    this.collection = this.db.collection(`${this.name}.task`)
    this.collectionLock = this.db.collection(`${this.name}.lock`)
    this.resetOnInit = options.resetOnInit ?? false
  }

  async prepare (): Promise<void> {
    // we use all settled for error-free control
    await Promise.allSettled([
      ensureIndex(this.collection, { uid: 1 }, { unique: true, background: false }),
      ensureIndex(this.collection, { uid: 1, isDeleted: 1 }, { unique: false, background: false }),
      ensureIndex(this.collection, { executeAt: 1 }, { unique: false, background: false }),

      ensureIndex(this.collectionLock, { expireAt: 1 }, { unique: false, expireAfterSeconds: 1, background: false }),
      ensureIndex(this.collectionLock, { application: 1 }, { unique: true, background: false })
    ])
    if (this.resetOnInit) {
      this.collection.deleteMany({ once: false }).catch(() => {})
      this.collectionLock.deleteMany({ application: this.applicationName }).catch(() => {})
    }
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
    const executeAt = Date.now() + task.delay
    await this.collection.updateOne({
      uid: task.uid
    }, {
      $set: {
        delay: task.delay,
        executeAt,
        isDeleted: false,
      },
      $setOnInsert: {
        uid: task.uid,
        once: task.once ?? false,
      }
    }, { upsert: true })
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
    const { acknowledged, upsertedId } = await this.collectionLock.updateOne({
      application: name
    }, {
      $set: { application: name },
      $setOnInsert: { expireAt }
    }, {
      upsert: true
    })
    // when upsertedId is non-null, it means the document is inserted
    // when upsertedId is null, it means the document already exists
    return acknowledged && upsertedId !== null
  }

  async releaseLock (name: string): Promise<void> {
    await this.collectionLock.deleteOne({ application: name })
  }
}
