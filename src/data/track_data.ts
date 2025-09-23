import { repo } from "@/data/repo.js"
import { dateRefineFromImport } from "@/utils/date.js"
import { v4 as uuidv4 } from "uuid"

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
    const data: Optional<TrackData, 'shape'>[] = await repo.getAll(storeName)
    
    for (const r of data) {
        dateRefineFromImport(r, ["createdAt", "editedAt"])
    }
    
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
    
    await repo.insert(storeName, d)
}

export async function trackDataEdit(id: string, data: TrackInputData) {
    const oldData = await repo.get(storeName, id) as TrackData
    
    const d: TrackData = {
        ...data,
        id,
        createdAt: oldData.createdAt,
        editedAt: new Date(),
    }
    
    await repo.update(storeName, id, d)
}

export async function trackDataDelete(id: string) {
    await repo.remove(storeName, id)
}

export async function trackDataImport(data: TrackData[]) {
    for (const r of data) {
        dateRefineFromImport(r, ["createdAt", "editedAt"])
    }
    
    await repo.import(storeName, data)
}