let db: IDBDatabase | null = null

function dbInit(): Promise<IDBDatabase> {
    if (db) return Promise.resolve(db)
    
    return new Promise((res, rej) => {
        const open = window.indexedDB.open("TheDb", 5)
    
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
        }
        
        open.onsuccess = function() {
            db = open.result
            res(db)
        }
        
        open.onerror = function() {
            rej()
        }
    })
}

export async function dbPut(storeName: string, data: any): Promise<void> {
    const db = await dbInit()
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

export async function dbDelete(storeName: string, query: IDBValidKey | IDBKeyRange): Promise<void> {
    const db = await dbInit()
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    store.delete(query)
    
    return new Promise((res, rej) => {
        tx.oncomplete = function() {
            res()
        }
        
        tx.onerror = function() {
            rej()
        }
    })
}

export async function dbGet(storeName: string, query: IDBValidKey | IDBKeyRange): Promise<any> {
    const db = await dbInit()
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const result = store.get(query)
    
    return new Promise((res, rej) => {
        result.onsuccess = function() {
            res(result.result)
        }
        
        tx.onerror = function() {
            rej()
        }
    })
}

export async function dbGetAll(storeName: string, query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<any[]> {
    const db = await dbInit()
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)    
    const result = store.getAll(query, count)
    
    return new Promise((res, rej) => {
        result.onsuccess = function() {
            res(result.result)
        }
        
        tx.onerror = function() {
            rej()
        }
    })
}

export async function dbClear(storeName: string): Promise<void> {
    const db = await dbInit()
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)    
    const result = store.clear()
    
    return new Promise((res, rej) => {
        result.onsuccess = function() {
            res()
        }
        
        tx.onerror = function() {
            rej()
        }
    })
}

export async function dbImport(storeName: string, data: any[]): Promise<void> {
    const db = await dbInit()
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