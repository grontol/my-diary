import { actorGetAll, actorImport } from "@/data/actor.js"
import { dbDelete, dbPut } from "@/data/db.js"
import { diaryGetAll, diaryImport } from "@/data/diary.js"
import { trackDataGetAll, trackDataImport } from "@/data/track_data.js"
import { trackingDataGetAll, trackingImport } from "@/data/tracking.js"
import { StoreName } from "@/data/type.js"

const w = window as any

function getEnv(): any | undefined {
    return w['AndroidEnv']
}

export function envIsAndroid() {
    return getEnv()?.isAndroid()
}

export function envExport(data: string) {
    getEnv()?.export(data)
}

export function envSetData(storeName: string, data: string): string | null {
    return getEnv()?.setData(storeName, data)
}

export function envPushData(kind: string, storeName: StoreName, data: string) {
    getEnv()?.pushData(kind, storeName, data)
}

export function envStartServer() {
    getEnv()?.startServer()
}

export function envStopServer() {
    getEnv()?.stopServer()
}

export function envIsServerRunning(): boolean {
    return getEnv()?.isServerRunning()
}

export function envIsClientMode() {
    return w.clientMode ?? !envIsAndroid()
}

export function envServerBaseUrl() {
    return w.serverBaseUrl ?? 'http://192.168.100.223:8888'
}

export type WebEventListener = (storeName: StoreName) => void
const webEventListeners = new Set<WebEventListener>()

export function envAddWebEventListener(l: WebEventListener) {
    webEventListeners.add(l)
}

export function envRemoveWebEventListener(l: WebEventListener) {
    webEventListeners.delete(l)
}

function tellListeners(storeName: StoreName) {
    for (const l of webEventListeners) {
        l(storeName)
    }
}

async function webEvent(kind: string, storeName: StoreName, data: string) {
    if (kind === "put") {
        await dbPut(storeName, JSON.parse(data), true)
    }
    else if (kind === "delete") {
        await dbDelete(storeName, data, true)
    }
    
    tellListeners(storeName)
}

export async function envSyncData(storeName?: StoreName) {
    if (!storeName || storeName === "actor") {
        const newData = envSetData("actor", JSON.stringify(await actorGetAll()))
        if (newData) {
            await actorImport(JSON.parse(newData))
        }
    }
    
    if (!storeName || storeName === "track-data") {
        const newData = envSetData("track-data", JSON.stringify(await trackDataGetAll()))
        if (newData) {
            await trackDataImport(JSON.parse(newData))
        }
    }
    
    if (!storeName || storeName === "diary") {
        const newData = envSetData("diary", JSON.stringify(await diaryGetAll()))
        if (newData) {
            await diaryImport(JSON.parse(newData))
        }
    }
    
    if (!storeName || storeName === "tracking") {
        const newData = envSetData("tracking", JSON.stringify(await trackingDataGetAll()))
        
        if (newData) {
            await trackingImport(JSON.parse(newData))
        }
    }
}

w.webEvent = webEvent

// Hari ini jam 14.30 baru bangun, aduhh. Tidurnya pas habis sholat subuh. Kenapa jadi susah banget bangun pagi ya. Kalo malem juga jadi gampang banget kebablasan.\n\nNasi masih agak banyak tapi karena magicom-nya dimatiin jadinya agak basi deh. Untung lauknya tadi malem udah dimasukin ke kulkas, jadi aman.\n