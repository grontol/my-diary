import { repo } from "@/data/repo.js"
import { v4 as uuidv4 } from "uuid"

export type ActorData = {
    id: string
    name: string
    emoji: string
    color: string
}

export type ActorInputData = Omit<ActorData, 'id'>

const storeName = "actor"

export async function actorGetAll(): Promise<ActorData[]> {
    return await repo.getAll(storeName)
}

export async function actorAdd(data: ActorInputData) {
    const d: ActorData = {
        id: uuidv4(),
        ...data,
    }
    
    await repo.insert(storeName, d)
}

export async function actorEdit(id: string, data: ActorInputData) {
    const d: ActorData = {
        id,
        ...data,
    }
    
    await repo.update(storeName, id, d)
}

export async function actorDelete(id: string) {
    await repo.remove(storeName, id)
}

export async function actorImport(data: ActorData[]) {    
    await repo.import(storeName, data)
}