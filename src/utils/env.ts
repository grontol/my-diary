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
    uploadVideo(cb: (success: boolean, progress: number, video?: VideoData) => void): void
    compressVideo(name: string, cb: (success: boolean, completed: boolean, progress: number, newSize: number) => void): void
    playVideo(name: string, gain: number): void
    deleteUnusedMedia(): void
    deleteMedia(medias: string[]): void
}

const w = window as any
const rawAndroidEnv = w['AndroidEnv']

const __callbacks: Record<string, { cb: any, shouldDelete: (...args: any[]) => boolean, mapArgs?: (args: any[]) => any[] }> = {}

const androidEnv: AndroidEnv | undefined = (() => {
    if (rawAndroidEnv === undefined) return undefined
    
    const env: AndroidEnv = {} as any
    
    for (const k in rawAndroidEnv) {
        (env as any)[k] = rawAndroidEnv[k].bind(rawAndroidEnv)
    }
    
    env.recordVideo = (cb) => {
        const id = v4()
        __callbacks[id] = {
            cb,
            shouldDelete: () => true,
            mapArgs(args) {
                return [args[0], JSON.parse(args[1])]
            },
        }
        
        rawAndroidEnv.recordVideo(id)
    }
    
    env.uploadVideo = (cb) => {
        const id = v4()
        __callbacks[id] = {
            cb,
            shouldDelete: (success: boolean, progress: number) => !success || progress >= 1,
            mapArgs(args) {
                return [args[0], args[1], JSON.parse(args[2])]
            },
        }
        
        rawAndroidEnv.uploadVideo(id)
    }
    
    env.compressVideo = (name, cb) => {
        const id = v4()
        __callbacks[id] = {
            cb,
            shouldDelete: (success: boolean, completed: boolean) => !success || completed
        }
        
        rawAndroidEnv.compressVideo(name, id)
    }
    
    return env
})()

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

console.log(androidEnv)

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