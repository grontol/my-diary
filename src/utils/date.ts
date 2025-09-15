export function dateFormatToString(year: number, month: number, date: number) {
    return `${year}-${(month + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`
}

export function dateFormatDateToString(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}