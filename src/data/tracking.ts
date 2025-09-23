import { v4 as uuidv4 } from "uuid"
import { dateRefineFromImport } from "@/utils/date.js"
import { repo } from "@/data/repo.js"

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
    const data = await repo.getAll(storeName)
    
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
    
    await repo.insert(storeName, d)
}

export async function trackingDataEdit(id: string, data: TrackInputData) {
    const oldData = await repo.get(storeName, id) as TrackingData
    
    const d: TrackingData = {
        ...data,
        id,
        createdAt: oldData.createdAt,
        editedAt: new Date(),
    }
    
    await repo.update(storeName, id, d)
}

export async function trackingDataDelete(id: string) {
    await repo.remove(storeName, id)
}

export async function trackingImport(data: TrackingData[]) {
    for (const r of data) {
        dateRefineFromImport(r, ["createdAt", "editedAt", "date"])
    }
    
    await repo.import(storeName, data)
}