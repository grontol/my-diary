export function dateFormatToString(year: number, month: number, date: number) {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`
}

export function dateFormatDateToString(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

export function dateRefineFromImport<T extends Record<string, any>>(data: T, keys: Array<keyof T>) {
    for (const k of keys) {
        if (k in data && typeof data[k] === "string") {
            // @ts-ignore
            data[k] = new Date(data[k])
        }
    }
}