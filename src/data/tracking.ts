import { v4 as uuidv4 } from "uuid"
import { dbDelete, dbGet, dbGetAll, dbImport, dbPut } from "@/data/db.js"
import { dateRefineFromImport } from "@/utils/date.js"

export type TrackingData = {
    id: string
    dataId: string
    date: Date
    value: string
    note?: string
    createdAt: Date
    editedAt: Date
}

export type TrackInputData = Omit<TrackingData, 'id' | 'createdAt' | 'editedAt'>

const storeName = "tracking"

export async function trackingDataGetAll(): Promise<TrackingData[]> {
    const data = await dbGetAll(storeName)
    
    for (const r of data) {
        dateRefineFromImport(r, ["createdAt", "editedAt", "date"])
    }
    
    return data
}

export async function trackingDataAdd(data: TrackInputData) {
    const d: TrackingData = {
        id: uuidv4(),
        createdAt: new Date(),
        editedAt: new Date(),
        ...data,
    }
    
    await dbPut(storeName, d)
}

export async function trackingDataEdit(id: string, data: TrackInputData) {
    const oldData = await dbGet(storeName, id) as TrackingData
    
    const d: TrackingData = {
        ...data,
        id,
        createdAt: oldData.createdAt,
        editedAt: new Date(),
    }
    
    await dbPut(storeName, d)
}

export async function trackingDataDelete(id: string) {
    await dbDelete(storeName, id)
}

export async function trackingImport(data: TrackingData[]) {
    for (const r of data) {
        dateRefineFromImport(r, ["createdAt", "editedAt", "date"])
    }
    
    await dbImport(storeName, data)
}