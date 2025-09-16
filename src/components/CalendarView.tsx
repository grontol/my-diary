import { dateFormatToString } from "@/utils/date.js"
import { foreach } from "@pang/core.js"
import { prevent } from "@pang/event-utils.js"
import { derived, state } from "@pang/reactive.js"
import { twMerge } from "tailwind-merge"

type Day = {
    date: number
    day: number
    curMonth: boolean
    prevMonth: boolean
    nextMonth: boolean
    curDay: boolean
}

type Month = Day[][]

const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]
const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desemeber"
]

function buildMonth(year: number, month: number) {
    const now = new Date()
    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()
    
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    
    const res: Month = []
    
    for (let a = 0; a < 6; a++) {
        const week: Day[] = []
        
        for (let b = 0; b < 7; b++) {
            const curDate = a * 7 + b + 1 - startDay
            const isPrevMonth = curDate <= 0
            const isNextMonth = curDate > daysInMonth
            const date = isPrevMonth ? daysInPrevMonth + curDate : isNextMonth ? curDate - daysInMonth : curDate
            const isCurMonth = !isPrevMonth && !isNextMonth
            const isCurDay = isCurMonth && year === now.getFullYear() && month === now.getMonth() && date === now.getDate()
            
            week.push({
                curMonth: isCurMonth,
                prevMonth: isPrevMonth,
                nextMonth: isNextMonth,
                date,
                day: b,
                curDay: isCurDay,
            })
        }
        
        res.push(week)
    }
    
    return res
}

export type Color = {
    color: string
    shape: string
}

export type DayData = {
    emoji?: string[]
    colors?: Color[]
    mood?: string
}

export function CalendarView(props: {
    datas: Record<string, DayData>,
    onMonthChanged?: (year: number, month: number) => void,
    onDateLongTouch?: (year: number, month: number, date: number) => void,
    onDateSelected?: (year: number, month: number, date: number) => void,
    selectedDate?: string,
    changeMonthOnClickOther?: boolean,
}) {
    const changeMonthOnClickOther = derived(() => props.changeMonthOnClickOther ?? true)
    
    const now = new Date()
    const year = state(now.getFullYear())
    const month = state(now.getMonth())
    
    const grid = derived(() => buildMonth(year.value, month.value))
    const monthName = derived(() => months[month.value])
    
    function decMonth() {
        if (month.value === 0) {
            month.value = 11
            year.value -= 1
        }
        else {
            month.value -= 1
        }
        
        props.onMonthChanged?.(year.value, month.value)
    }
    
    function incMonth() {
        if (month.value === 11) {
            month.value = 0
            year.value += 1
        }
        else {
            month.value += 1
        }
        
        props.onMonthChanged?.(year.value, month.value)
    }
    
    function getY(d: Day) {
        return d.prevMonth ? (month.value === 0 ? year.value - 1 : year.value)
            : d.nextMonth ? (month.value === 11 ? year.value + 1 : year.value)
            : year.value
    }
    
    function getM(d: Day) {
        return d.prevMonth ? (month.value === 0 ? 11 : month.value - 1)
            : d.nextMonth ? (month.value === 11 ? 0 : month.value + 1)
            : month.value
    }
    
    function longTouch(d: Day) {
        props.onDateLongTouch?.(getY(d), getM(d), d.date)
        
        if (!d.curMonth && changeMonthOnClickOther.value) {
            if (d.prevMonth) decMonth()
            else incMonth()
        }
    }
    
    function select(d: Day) {
        props.onDateSelected?.(getY(d), getM(d), d.date)
        
        if (!d.curMonth && changeMonthOnClickOther.value) {
            if (d.prevMonth) decMonth()
            else incMonth()
        }
    }
    
    return <div class="flex items-center px-2 py-4 select-none">
        <span
            class="icon-[weui--arrow-outlined] px-2 py-10 rotate-180"
            onclick={decMonth}
        />
        
        <div class="flex-1 flex flex-col">
            <div class="self-center text-xl font-bold flex gap-2">
                <span>{monthName.value}</span>
                {year.value !== now.getFullYear() && (
                    <span>{year.value}</span>
                )}
            </div>
            
            <div class="flex">
                {foreach(days, d => (
                    <div
                        class="flex-1 text-center text-lg p-1 text-fuchsia-700"
                    >{d}</div>
                ))}
            </div>
            
            {foreach(grid, week => (
                <div class="flex">
                    {foreach(week, d => (
                        <div
                            class={twMerge(
                                "flex-1 text-center text-lg p-1 active:bg-fuchsia-300 border border-transparent rounded-lg",
                                d.curMonth ? "" : "text-gray-400",
                                d.curDay ? "border-fuchsia-600" : "",
                                d.curMonth && props.selectedDate && props.selectedDate === dateFormatToString(year.value, month.value, d.date) ? "bg-fuchsia-300" : "",
                            )}
                            oncontextmenu={prevent(() => longTouch(d))}
                            onclick={() => select(d)}
                        >
                            <span>{d.date}</span>
                            
                            {d.curMonth && props.datas[dateFormatToString(year.value, month.value, d.date)] && (
                                <div class="flex justify-center items-center">
                                    {foreach(props.datas[dateFormatToString(year.value, month.value, d.date)]?.emoji ?? [], e => (
                                        <span class="" style={{ fontSize: '0.7rem' }}>{e}</span>
                                    ))}
                                    
                                    {foreach(props.datas[dateFormatToString(year.value, month.value, d.date)]?.colors ?? [], c => (
                                        <span class={`w-[12px] h-[12px] ${c.shape}`} style={{ background: c.color }}/>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
        
        <span
            class="icon-[weui--arrow-outlined] px-2 py-10"
            onclick={incMonth}
        />
    </div>
}