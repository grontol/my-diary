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
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
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
    lines?: string[]
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
    
    const prevYear = derived(() => month.value === 0 ? year.value - 1 : year.value)
    const nextYear = derived(() => month.value === 11 ? year.value + 1 : year.value)
    const prevMonth = derived(() => month.value === 0 ? 11 : month.value - 1)
    const nextMonth = derived(() => month.value === 11 ? 0 : month.value + 1)
    
    const prevGrid = derived(() => buildMonth(prevYear.value, prevMonth.value))
    const grid = derived(() => buildMonth(year.value, month.value))
    const nextGrid = derived(() => buildMonth(nextYear.value, nextMonth.value))
    
    const prevMonthName = derived(() => months[prevMonth.value])
    const monthName = derived(() => months[month.value])
    const nextMonthName = derived(() => months[nextMonth.value])
    
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
    
    const xThreshold = window.innerWidth * 0.65 * 0.15
    const velocityThreshold = 0.5
    const duration = 100
    const minPercentage = 0.7
    
    const translation = state(0)
    const animating = state(false)
    
    const prevPercentage = derived(() => minPercentage + (1 - minPercentage) * translation.value / window.innerWidth)
    const percentage = derived(() => {
        if (translation.value > 0) {
            return 1 - (1 - minPercentage) * translation.value / window.innerWidth
        }
        else {
            return 1 + (1 - minPercentage) * translation.value / window.innerWidth
        }
    })
    const nextPercentage = derived(() => minPercentage + (1 - minPercentage) * -translation.value / window.innerWidth)
    
    let dragging = false
    let startX = 0
    let deltaX = 0
    let startTime = 0
    let timeoutId: any = null
    
    function touchStart(e: TouchEvent) {
        if (timeoutId) clearTimeout(timeoutId)
        
        startX = e.touches[0].clientX
        deltaX = 0
        startTime = Date.now()
        dragging = true
    }
    
    function touchMove(e: TouchEvent) {
        if (!dragging) return
        
        deltaX = e.touches[0].clientX - startX
        translation.value = Math.max(Math.min(deltaX, window.innerWidth * 1.1), -window.innerWidth * 1.1)
    }
    
    function touchEnd(e: TouchEvent) {
        if (!dragging) return
        
        const deltaTime = Date.now() - startTime
        const velocity = deltaX / deltaTime
        
        let isDec = false
        let isInc = false
        
        if (deltaX > xThreshold || velocity > velocityThreshold) {
            translation.value = window.innerWidth
            isDec = true
        }
        else if (deltaX < -xThreshold || velocity < -velocityThreshold) {
            translation.value = -window.innerWidth
            isInc = true
        }
        else {
            translation.value = 0
        }
        
        dragging = false
        animating.value = true
        
        timeoutId = setTimeout(() => {
            if (isDec) decMonth()
            if (isInc) incMonth()
            
            animating.value = false
            translation.value = 0
            
            timeoutId = null
        }, duration)
    }
    
    return <div class="flex items-center py-2 select-none overflow-x-hidden">
        <div
            class="flex"
            style={{
                transform: `translateX(${translation.value - window.innerWidth}px)`,
                transition: animating.value ? "transform" : "none",
                transitionDuration: `${duration}ms`
            }}
            ontouchstart={touchStart}
            ontouchmove={touchMove}
            ontouchend={touchEnd}
        >
            <DetailView
                datas={props.datas}
                grid={prevGrid.value}
                month={month.value - 1}
                year={year.value}
                monthName={prevMonthName.value}
                percentage={prevPercentage.value}
            />
            
            <DetailView
                datas={props.datas}
                grid={grid.value}
                month={month.value}
                year={year.value}
                monthName={monthName.value}
                onLongTouch={longTouch}
                onSelect={select}
                selectedDate={props.selectedDate}
                percentage={percentage.value}
            />
            
            <DetailView
                datas={props.datas}
                grid={nextGrid.value}
                month={month.value + 1}
                year={year.value}
                monthName={nextMonthName.value}
                percentage={nextPercentage.value}
            />
        
        </div>
    </div>
}

function DetailView(props: {
    monthName: string,
    year: number,
    month: number,
    grid: Month,
    
    percentage: number,
    datas: Record<string, DayData>,
    selectedDate?: string,
    
    onLongTouch?: (d: Day) => void
    onSelect?: (d: Day) => void
}) {
    const now = new Date()
    
    return <div
        class="flex flex-col px-2"
        style={{
            width: `${window.innerWidth}px`,
            transform: `scale(${props.percentage})`
        }}
    >
        <div class="self-center text-xl font-bold flex gap-2">
            <span>{props.monthName}</span>
            {props.year !== now.getFullYear() && (
                <span>{props.year}</span>
            )}
        </div>
        
        <div class="flex">
            {foreach(days, d => (
                <div
                    class="flex-1 text-center text-lg p-1 text-fuchsia-700"
                >{d}</div>
            ))}
        </div>
        
        {foreach(props.grid, week => (
            <div class="flex">
                {foreach(week, d => (
                    <div
                        class={twMerge(
                            "flex-1 text-center text-lg p-1 active:bg-fuchsia-300 border border-transparent rounded-lg",
                            d.curMonth ? "" : "text-gray-400",
                            d.curDay ? "border-fuchsia-600" : "",
                            d.curMonth && props.selectedDate && props.selectedDate === dateFormatToString(props.year, props.month, d.date) ? "bg-fuchsia-300" : "",
                        )}
                        oncontextmenu={prevent(() => props.onLongTouch?.(d))}
                        onclick={() => props.onSelect?.(d)}
                    >                        
                        <span>{d.date}</span>
                        
                        {d.curMonth && props.datas[dateFormatToString(props.year, props.month, d.date)] && (
                            <div class="flex flex-col">
                                <div class="flex justify-center items-center flex-wrap">
                                    {foreach(props.datas[dateFormatToString(props.year, props.month, d.date)]?.emoji ?? [], e => (
                                        <span class="" style={{ fontSize: '0.7rem' }}>{e}</span>
                                    ))}
                                    
                                    {foreach(props.datas[dateFormatToString(props.year, props.month, d.date)]?.colors ?? [], c => (
                                        <span class={`w-[12px] h-[12px] ${c.shape}`} style={{ background: c.color }}/>
                                    ))}
                                </div>
                                
                                <div class="flex flex-wrap justify-center gap-0.5">
                                    {foreach(props.datas[dateFormatToString(props.year, props.month, d.date)]?.lines ?? [], c => (
                                        <span class="h-[4px] w-[25%] rounded-full mt-0.5" style={{ background: c }}/>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        ))}
    </div>
}