import { repo } from "@/data/repo.js"
import { StoreName } from "@/data/type.js"
import { dateRefineFromImport } from "@/utils/date.js"
import { v4 } from "uuid"

export type DiaryData = {
    id: string
    actor: string
    date: Date
    content: any
}

export type DiaryInputData = Omit<DiaryData, 'id'>

const storeName: StoreName = "diary"

export async function diaryGetAll(): Promise<DiaryData[]> {
    const data = await repo.getAll(storeName)
    
    for (const r of data) {
        dateRefineFromImport(r, ["date"])
    }
    
    return data
}

export async function diaryAdd(data: DiaryInputData) {
    await repo.insert(storeName, {
        ...data,
        id: v4(),
    })
}


export async function diaryEdit(id: string, data: DiaryInputData) {
    const d: DiaryData = {
        ...data,
        id,
    }
    
    await repo.update(storeName, id, d)
}

export async function diaryDelete(id: string) {
    await repo.remove(storeName, id)
}

export async function diaryImport(data: DiaryData[]) {
    for (const r of data) {
        dateRefineFromImport(r, ["date"])
    }
    
    await repo.import(storeName, data)
}