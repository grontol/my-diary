import { repo } from "@/data/repo.js"
import { StoreName } from "@/data/type.js"
import { v4 } from "uuid"

export type ResepData = {
    id: string
    name: string
    bahans: string[]
    tags: string[]
    content: any
    done: boolean
    rating: number
}

export type ResepInputData = Omit<ResepData, 'id'>

const storeName: StoreName = "resep"

export async function resepGetAll(): Promise<ResepData[]> {
    const data = await repo.getAll(storeName)    
    return data
}

export async function resepAdd(data: ResepInputData) {
    await repo.insert(storeName, {
        ...data,
        id: v4(),
    })
}


export async function resepEdit(id: string, data: ResepInputData) {
    const d: ResepData = {
        ...data,
        id,
    }
    
    await repo.update(storeName, id, d)
}

export async function resepDelete(id: string) {
    await repo.remove(storeName, id)
}

export async function resepImport(data: ResepInputData[]) {
    await repo.import(storeName, data)
}