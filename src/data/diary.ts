import { dbDelete, dbGetAll, dbImport, dbPut } from "@/data/db.js"
import { dateRefineFromImport } from "@/utils/date.js"
import { v4 } from "uuid"

export type DiaryData = {
    id: string
    actor: string
    date: Date
    content: any
}

export type DiaryInputData = Omit<DiaryData, 'id'>

const storeName = "diary"

export async function diaryGetAll(): Promise<DiaryData[]> {
    return await dbGetAll(storeName)
}

export async function diaryAdd(data: DiaryInputData) {
    await dbPut(storeName, {
        ...data,
        id: v4(),
    })
}


export async function diaryEdit(id: string, data: DiaryInputData) {
    const d: DiaryData = {
        ...data,
        id,
    }
    
    await dbPut(storeName, d)
}

export async function diaryDelete(id: string) {
    await dbDelete(storeName, id)
}

export async function diaryImport(data: DiaryData[]) {
    for (const r of data) {
        dateRefineFromImport(r, ["date"])
    }
    
    await dbImport(storeName, data)
}