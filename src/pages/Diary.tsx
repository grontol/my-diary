import { CalendarView, DayData } from "@/components/CalendarView.jsx";
import { DiaryInput } from "@/pages/DiaryInput.jsx";
import { foreach } from "@pang/core.js";
import { self } from "@pang/event-utils.js";
import { state } from "@pang/reactive.js";
import { twMerge } from "tailwind-merge";

export function Diary() {
    let selectedYear = 0
    let selectedMonth = 0
    let selectedDate = 0
    
    const datas = state<Record<string, DayData>>({})
    
    const popupVisible = state(false)
    const inputDiaryVisible = state(false)
    
    function monthChanged(year: number, month: number) {
        
    }
    
    function dateLongTouch(year: number, month: number, date: number) {
        popupVisible.value = true
        
        selectedYear = year
        selectedMonth = month
        selectedDate = date
    }
    
    function popupMenuSelect(id: string) {
        popupVisible.value = false
        
        if (id === "add_diary") {
            inputDiaryVisible.value = true
        }
    }
    
    function saveDiary(actor: string, content: any) {
        console.log(actor, content)
    }
    
    return <div class="h-full">
        <CalendarView
            datas={datas.value}
            onMonthChanged={monthChanged}
            onDateLongTouch={dateLongTouch}
        />
        
        {inputDiaryVisible.value && (
            <DiaryInput
                onCancel={() => inputDiaryVisible.value = false}
                onSave={saveDiary}
            />
        )}
        
        <PopupMenu
            visible={popupVisible.value}
            onClose={() => popupVisible.value = false}
            onSelect={popupMenuSelect}
        />
    </div>
}

type PopupMenuItem = {
    id: string
    text: string
}

const popupMenuItems: PopupMenuItem[] = [
    { id: "add_diary", text: "Tambah Diary" },
    { id: "add_tracking", text: "Tambah Tracking" },
]

function PopupMenu(props: { visible: boolean, onClose: () => void, onSelect: (id: string) => void }) {
    return <div
        class={twMerge(
            "fixed inset-0 bg-black/40 flex justify-center items-center",
            props.visible ? "" : "hidden"
        )}
        onclick={self(props.onClose)}
    >
        <div class="flex flex-col bg-white rounded py-2 min-w-[60%]">
            {foreach(popupMenuItems, i => (
                <div
                    class="px-4 py-2 active:bg-black/10 transition-colors"
                    onclick={() => props.onSelect(i.id)}
                >{i.text}</div>
            ))}
        </div>
    </div>
}