import { StoreName } from "@/data/type.js"
import { envIsAndroid, envIsClientMode, envPushData, envServerBaseUrl } from "@/utils/env.js"

let db: IDBDatabase | null = null

function dbInit(): Promise<IDBDatabase> {
    if (db) return Promise.resolve(db)
    
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
        
        open.onsuccess = function() {
            db = open.result
            res(db)
        }
        
        open.onerror = function() {
            rej()
        }
    })
}

export async function dbPut(storeName: StoreName, data: any, fromWeb = false): Promise<void> {
    if (envIsClientMode()) {
        return fetchPost({
            kind: "put",
            storeName,
            data,
        })
    }
    
    if (envIsAndroid() && !fromWeb) {
        envPushData("put", storeName, JSON.stringify(data))
    }
    
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

export async function dbDelete(storeName: StoreName, query: IDBValidKey | IDBKeyRange, fromWeb = false): Promise<void> {
    if (envIsClientMode()) {
        return fetchPost({
            kind: "delete",
            storeName,
            data: query,
        })
    }
    
    if (envIsAndroid() && !fromWeb) {
        envPushData("delete", storeName, query.toString())
    }
    
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

export async function dbGet(storeName: StoreName, query: IDBValidKey | IDBKeyRange): Promise<any> {
    if (envIsClientMode()) {
        return fetchPost({
            kind: "get",
            storeName,
            data: query,
        })
    }
    
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

export async function dbGetAll(storeName: StoreName): Promise<any[]> {
    if (envIsClientMode()) {
        return fetchPost({
            kind: "getAll",
            storeName,
        })
    }
    
    const db = await dbInit()
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

export async function dbImport(storeName: StoreName, data: any[]): Promise<void> {
    if (envIsClientMode()) {
        alert("Gak bisa import di client mode")
        
        return
    }
    
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

type Payload = {
    kind: "getAll" | "get" | "put" | "delete",
    storeName: string,
    data?: any
}

async function fetchPost(payload: Payload) {
    const res = await fetch(envServerBaseUrl(), {
        method: "POST",
        headers: {
            'Content-type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    
    return res.json()
}