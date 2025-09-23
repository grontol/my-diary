import { StoreName } from "@/data/type.js"
import { v4 } from "uuid"

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
}

const w = window as any

export function getAndroidEnv(): AndroidEnv | undefined {
    return w['AndroidEnv']
}

export function envIsAndroidMode(): boolean {
    return getAndroidEnv()?.isAndroid() ?? false
}

export function envIsRemoteMode(): boolean {
    return w.clientMode ?? !envIsAndroidMode()
}

export function envServerBaseUrl() {
    return w.serverBaseUrl ?? 'http://192.168.100.223:8888'
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