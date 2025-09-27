import { repo } from "@/data/repo.js"
import { StoreName } from "@/data/type.js"
import { dateRefineFromImport } from "@/utils/date.js"
import { v4 } from "uuid"

export type DiaryCommonData = {
    id: string
    actor: string
    date: Date
}

export type DiaryTextData = DiaryCommonData & {
    type: "text"
    content: any
}

export type DiaryVideoData = DiaryCommonData & {
    type: "video"
    content: {
        video: string
        thumbnail: string
        duration: number
        size: number
        gain: number
        note?: string
    }
}

export type DiaryPhotoData = DiaryCommonData & {
    type: "photo"
    content: {
        image: string
        size: number
        note?: string
    }
}

export type DiaryMediaData = DiaryVideoData | DiaryPhotoData
export type DiaryData = DiaryTextData | DiaryVideoData | DiaryPhotoData

export type DiaryInputData = Omit<DiaryTextData, 'id'> | Omit<DiaryVideoData, 'id'> | Omit<DiaryPhotoData, 'id'>

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