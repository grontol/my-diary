import { v4 as uuidv4 } from "uuid"
import { dbDelete, dbGet, dbGetAll, dbImport, dbPut } from "@/data/db.js"

export type TrackData = {
    id: string
    name: string
    color: string
    type: "none" | "string" | "number"
    shape: string
    createdAt: Date
    editedAt: Date
}

export type TrackInputData = Omit<TrackData, 'id' | 'createdAt' | 'editedAt'>

const storeName = "track-data"

export async function trackDataGetAll(): Promise<TrackData[]> {
    const data: Optional<TrackData, 'shape'>[] = await dbGetAll(storeName)
    
    return data.map(x => ({
        ...x,
        shape: x.shape ?? "icon-[mdi--circle]"
    }))
}

export async function trackDataAdd(data: TrackInputData) {
    const d: TrackData = {
        id: uuidv4(),
        createdAt: new Date(),
        editedAt: new Date(),
        ...data,
    }
    
    await dbPut(storeName, d)
}

export async function trackDataEdit(id: string, data: TrackInputData) {
    const oldData = await dbGet(storeName, id) as TrackData
    
    const d: TrackData = {
        ...data,
        id,
        createdAt: oldData.createdAt,
        editedAt: new Date(),
    }
    
    await dbPut(storeName, d)
}

export async function trackDataDelete(id: string) {
    await dbDelete(storeName, id)
}

export async function trackDataImport(data: TrackData[]) {
    await dbImport(storeName, data)
}