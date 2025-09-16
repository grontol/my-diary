import { dbDelete, dbGetAll, dbImport, dbPut } from "@/data/db.js"

export type DiaryData = {
    actor: string
    date: string
    content: any
}

const storeName = "diary"

export async function diaryGetAll(): Promise<DiaryData[]> {
    return await dbGetAll(storeName)
}

export async function diaryAdd(data: DiaryData) {
    await dbPut(storeName, data)
}

export async function diaryEdit(name: string, data: DiaryData) {
    // if (data.name !== name) {
    //     await dbDelete("actor", name)
    // }
    
    await dbPut("actor", data)
}

export async function diaryImport(data: DiaryData[]) {
    await dbImport(storeName, data)
}