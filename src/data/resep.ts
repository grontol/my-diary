import { dbDelete, dbGetAll, dbImport, dbPut } from "@/data/db.js"
import { StoreName } from "@/data/type.js"
import { v4 } from "uuid"

export type ResepData = {
    id: string
    name: string
    bahans: string[]
    tags: string[]
    content: any
}

export type ResepInputData = Omit<ResepData, 'id'>

const storeName: StoreName = "resep"

export async function resepGetAll(): Promise<ResepData[]> {
    const data = await dbGetAll(storeName)    
    return data
}

export async function resepAdd(data: ResepInputData) {
    await dbPut(storeName, {
        ...data,
        id: v4(),
    })
}


export async function resepEdit(id: string, data: ResepInputData) {
    const d: ResepData = {
        ...data,
        id,
    }
    
    await dbPut(storeName, d)
}

export async function resepDelete(id: string) {
    await dbDelete(storeName, id)
}

export async function resepImport(data: ResepInputData[]) {
    await dbImport(storeName, data)
}