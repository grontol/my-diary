import { v4 as uuidv4 } from "uuid"
import { dbDelete, dbGetAll, dbImport, dbPut } from "@/data/db.js"

export type ActorData = {
    id: string
    name: string
    emoji: string
    color: string
}

export type ActorInputData = Omit<ActorData, 'id'>

const storeName = "actor"

export async function actorGetAll(): Promise<ActorData[]> {
    return await dbGetAll(storeName)
}

export async function actorAdd(data: ActorInputData) {
    const d: ActorData = {
        id: uuidv4(),
        ...data,
    }
    
    await dbPut(storeName, d)
}

export async function actorEdit(id: string, data: ActorInputData) {
    const d: ActorData = {
        id,
        ...data,
    }
    
    await dbPut(storeName, d)
}

export async function actorDelete(id: string) {
    await dbDelete(storeName, id)
}

export async function actorImport(data: ActorData[]) {
    await dbImport(storeName, data)
}