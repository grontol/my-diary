import { v4 as uuidv4 } from "uuid"
import { dbDelete, dbGetAll, dbPut } from "@/data/db.js"

export type ActorData = {
    id: string
    name: string
    emoji: string
    color: string
}

export type ActorInputData = Omit<ActorData, 'id'>

export async function actorGetAll(): Promise<ActorData[]> {
    return await dbGetAll("actor")
}

export async function actorAdd(data: ActorInputData) {
    const d: ActorData = {
        id: uuidv4(),
        ...data,
    }
    
    await dbPut("actor", d)
}

export async function actorEdit(id: string, data: ActorInputData) {
    const d: ActorData = {
        id,
        ...data,
    }
    
    await dbPut("actor", d)
}

export async function actorDelete(id: string) {
    await dbDelete("actor", id)
}