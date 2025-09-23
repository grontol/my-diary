import { envClientId, envIsAndroidMode, envIsRemoteMode, envServerBaseUrl, getAndroidEnv } from "@/utils/env.js"

interface IRepo {
    mode: "android" | "remote" | "local"
    
    getAll(storeName: string): Promise<any[]>
    get(storeName: string, id: string): Promise<any>
    insert(storeName: string, data: any): Promise<void>
    update(storeName: string, id: string, data: any): Promise<void>
    remove(storeName: string, id: string): Promise<void>
    import(storeName: string, data: any[]): Promise<void>
}

class AndroidRepo implements IRepo {
    mode: "android" | "remote" | "local" = "android"
    
    async getAll(storeName: string): Promise<any[]> {
        return JSON.parse(getAndroidEnv()!.repoGetAll(storeName))
    }
    
    async get(storeName: string, id: string): Promise<any> {
        return JSON.parse(getAndroidEnv()!.repoGet(storeName, id))
    }
    
    async insert(storeName: string, data: any): Promise<void> {
        getAndroidEnv()!.repoInsert(storeName, JSON.stringify(data))
    }
    
    async update(storeName: string, id: string, data: any): Promise<void> {
        getAndroidEnv()!.repoUpdate(storeName, id, JSON.stringify(data))
    }
    
    async remove(storeName: string, id: string): Promise<void> {
        getAndroidEnv()!.repoDelete(storeName, id)
    }
    
    async import(storeName: string, data: any[]): Promise<void> {
        getAndroidEnv()!.repoImport(storeName, JSON.stringify(data))
    }
}

class LocalRepo implements IRepo {
    mode: "android" | "remote" | "local" = "local"
    db: IDBDatabase | null = null
    
    init(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db)
        
        return new Promise((res, rej) => {
            const open = window.indexedDB.open("TheDb", 6)
        
            open.onupgradeneeded = function(e) {
                const db = open.result
                
                if (!db.objectStoreNames.contains("actor")) {
                    db.createObjectStore("actor", { keyPath: "id" })
                }
                
                if (!db.objectStoreNames.contains("track-data")) {
                    db.createObjectStore("track-data", { keyPath: "id" })
                }
                
                if (!db.objectStoreNames.contains("diary")) {
                    db.createObjectStore("diary", { keyPath: "id" })
                }
                
                if (!db.objectStoreNames.contains("tracking")) {
                    db.createObjectStore("tracking", { keyPath: "id" })
                }
                
                if (!db.objectStoreNames.contains("resep")) {
                    db.createObjectStore("resep", { keyPath: "id" })
                }
            }
            
            open.onsuccess = () => {
                this.db = open.result
                res(this.db)
            }
            
            open.onerror = function() {
                rej()
            }
        })
    }
    
    async getAll(storeName: string): Promise<any[]> {
        const db = await this.init()
        const tx = db.transaction(storeName, "readonly")
        const store = tx.objectStore(storeName)    
        const result = store.getAll()
        
        return new Promise((res, rej) => {
            result.onsuccess = function() {
                res(result.result)
            }
            
            tx.onerror = function() {
                rej()
            }
        })
    }
    
    async get(storeName: string, id: string): Promise<any> {
        const db = await this.init()
        const tx = db.transaction(storeName, "readonly")
        const store = tx.objectStore(storeName)
        const result = store.get(id)
        
        return new Promise((res, rej) => {
            result.onsuccess = function() {
                res(result.result)
            }
            
            tx.onerror = function() {
                rej()
            }
        })
    }
    
    async insert(storeName: string, data: any): Promise<void> {
        const db = await this.init()
        const tx = db.transaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)
        store.put(data)
        
        return new Promise((res, rej) => {
            tx.oncomplete = function() {
                res()
            }
            
            tx.onerror = function() {
                rej()
            }
        })
    }
    
    async update(storeName: string, id: string, data: any): Promise<void> {
        const db = await this.init()
        const tx = db.transaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)
        
        const newData = {
            ...data,
            id,
        }
        
        store.put(newData)
        
        return new Promise((res, rej) => {
            tx.oncomplete = function() {
                res()
            }
            
            tx.onerror = function() {
                rej()
            }
        })
    }
    
    async remove(storeName: string, id: string): Promise<void> {
        const db = await this.init()
        const tx = db.transaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)
        store.delete(id)
        
        return new Promise((res, rej) => {
            tx.oncomplete = function() {
                res()
            }
            
            tx.onerror = function() {
                rej()
            }
        })
    }
    
    async import(storeName: string, data: any[]): Promise<void> {
        const db = await this.init()
        const tx = db.transaction(storeName, "readwrite")
        const store = tx.objectStore(storeName)
        
        store.clear()
        
        for (const r of data) {
            store.put(r)
        }
        
        return new Promise((res, rej) => {
            tx.oncomplete = function() {
                res()
            }
            
            tx.onerror = function() {
                rej()
            }
        })
    }
}

class RemoteRepo implements IRepo {
    mode: "android" | "remote" | "local" = "remote"
    
    getAll(storeName: string): Promise<any[]> {
        return fetchPost({
            kind: "getAll",
            storeName,
        })
    }
    
    get(storeName: string, id: string): Promise<any> {
        return fetchPost({
            kind: "get",
            storeName,
            id,
        })
    }
    
    insert(storeName: string, data: any): Promise<void> {
        return fetchPost({
            kind: "insert",
            storeName,
            data,
        })
    }
    
    update(storeName: string, id: string, data: any): Promise<void> {
        return fetchPost({
            kind: "update",
            storeName,
            id,
            data,
        })
    }
    
    remove(storeName: string, id: string): Promise<void> {
        return fetchPost({
            kind: "delete",
            storeName,
            id,
        })
    }
    
    import(storeName: string, data: any[]): Promise<void> {
        return fetchPost({
            kind: "import",
            storeName,
            data,
        })
    }
}

type Payload = {
    kind: "getAll" | "get" | "insert" | "update" | "delete" | "import",
    storeName: string,
    data?: any
    id?: string
}

async function fetchPost(payload: Payload) {
    const res = await fetch(envServerBaseUrl() + `?id=${envClientId}`, {
        method: "POST",
        headers: {
            'Content-type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    
    return res.json()
}

export const repo: IRepo = envIsAndroidMode() ? new AndroidRepo() : envIsRemoteMode() ? new RemoteRepo() : new LocalRepo()