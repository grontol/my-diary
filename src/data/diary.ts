import { dbDelete, dbGetAll, dbPut } from "@/data/db.js"

export type DiaryData = {
    actor: string
    date: string
    content: any
}

export async function diaryGetAll(): Promise<DiaryData[]> {
    return await dbGetAll("diary")
}

export async function diaryAdd(data: DiaryData) {
    await dbPut("diary", data)
}

export async function actorEdit(name: string, data: DiaryData) {
    // if (data.name !== name) {
    //     await dbDelete("actor", name)
    // }
    
    await dbPut("actor", data)
}