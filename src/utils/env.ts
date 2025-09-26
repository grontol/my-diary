import { StoreName } from "@/data/type.js"
import { v4 } from "uuid"

export type VideoData = {
    name: string
    size: number
    length: number
    thumbnail: string
}

type AndroidEnv = {
    isAndroid(): boolean
    export(data: string, fileName: string): void
    
    repoGetAll(storeName: string): string
    repoGet(storeName: string, id: string): string
    repoInsert(storeName: string, data: string): void
    repoUpdate(storeName: string, id: string, data: string): void
    repoDelete(storeName: string, id: string): void
    repoImport(storeName: string, data: string): void
    
    startServer(): void
    stopServer(): void
    isServerRunning(): boolean
    
    recordVideo(cb: (success: boolean, video?: VideoData) => void): void
    compressVideo(name: string, cb: (success: boolean, completed: boolean, progress: number, newSize: number) => void): void
    playVideo(name: string, gain: number): void
}

const w = window as any
const rawAndroidEnv = w['AndroidEnv']

const __callbacks: Record<string, { cb: any, shouldDelete: (...args: any[]) => boolean, mapArgs?: (args: any[]) => any[] }> = {}

const androidEnv: AndroidEnv | undefined = rawAndroidEnv === undefined ? undefined : {
    isAndroid: rawAndroidEnv['isAndroid'].bind(rawAndroidEnv),
    export: rawAndroidEnv['export'].bind(rawAndroidEnv),
    
    repoGetAll: rawAndroidEnv['repoGetAll'].bind(rawAndroidEnv),
    repoGet: rawAndroidEnv['repoGet'].bind(rawAndroidEnv),
    repoInsert: rawAndroidEnv['repoInsert'].bind(rawAndroidEnv),
    repoUpdate: rawAndroidEnv['repoUpdate'].bind(rawAndroidEnv),
    repoDelete: rawAndroidEnv['repoDelete'].bind(rawAndroidEnv),
    repoImport: rawAndroidEnv['repoImport'].bind(rawAndroidEnv),
    
    startServer: rawAndroidEnv['startServer'].bind(rawAndroidEnv),
    stopServer: rawAndroidEnv['stopServer'].bind(rawAndroidEnv),
    isServerRunning: rawAndroidEnv['isServerRunning'].bind(rawAndroidEnv),
    
    recordVideo(cb) {
        const id = v4()
        __callbacks[id] = {
            cb,
            shouldDelete: () => true,
            mapArgs(args) {
                return [args[0], JSON.parse(args[1])]
            },
        }
        
        rawAndroidEnv.recordVideo(id)
    },
    compressVideo(name, cb) {
        const id = v4()
        __callbacks[id] = {
            cb,
            shouldDelete: (success: boolean, completed: boolean) => !success || completed
        }
        
        rawAndroidEnv.compressVideo(name, id)
    },
    playVideo: rawAndroidEnv['playVideo'].bind(rawAndroidEnv),
}

w.callFn = (id: string, ...args: any[]) => {
    const cb = __callbacks[id]
    
    if (cb) {
        const mappedArgs = cb.mapArgs ? cb.mapArgs(args) : args
        
        cb.cb(...mappedArgs)
        
        if (cb.shouldDelete(...args)) {
            delete __callbacks[id]
        }
    }
}

export function getAndroidEnv(): AndroidEnv | undefined {
    return androidEnv
}

export function envIsAndroidMode(): boolean {
    return androidEnv?.isAndroid() ?? false
}

export function envIsRemoteMode(): boolean {
    return w.clientMode ?? false//!envIsAndroidMode()
}

export function envServerBaseUrl() {
    return w.serverBaseUrl ?? 'http://192.168.100.223:8888'
}

export function envAsAndroidFileUrl(fileName: string): string {
    return `https://appassets.androidplatform.net/files/${fileName}`
}

export type DataChangedEventListener = (storeName: StoreName) => void

export type ListenerData = {
    fn: DataChangedEventListener
    storeNames?: StoreName[]
}


const listeners = new Set<ListenerData>()

export function envAddDataChangedListener(l: DataChangedEventListener, storeNames?: StoreName[]) {
    listeners.add({
        fn: l,
        storeNames,
    })
}

export function envRemoveWebEventListener(l: DataChangedEventListener) {
    const d = listeners.values().find(x => x.fn === l)
    if (d) {
        listeners.delete(d)
    }
}

function tellListeners(storeName: StoreName) {
    for (const l of listeners) {
        if (l.storeNames === undefined || l.storeNames.includes(storeName)) {
            l.fn(storeName)
        }
    }
}

function dataChangedEvent(from: string, storeName: StoreName) {
    if (from === "android") {
        if (envIsRemoteMode()) {
            tellListeners(storeName)
        }
    }
    else if (from === "client") {
        if (envIsAndroidMode()) {
            tellListeners(storeName)
        }
    }
}

w.dataChangedEvent = dataChangedEvent

export const envClientId = v4()

async function longPoll() {
    try {
        const res = await fetch(envServerBaseUrl() + `/events?id=${envClientId}`)
        const data: string[] = await res.json()
        
        for (const d of data) {
            tellListeners(d as StoreName)
        }
        
        longPoll()
    }
    catch (e) {
        console.error("Long poll error:", e)
        setTimeout(longPoll, 5000)
    }
}

if (envIsRemoteMode()) {
    longPoll()
}