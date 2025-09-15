import { showAlert } from "@/components/Alert.jsx";
import { Button } from "@/components/Button.jsx";
import { CalendarView, DayData } from "@/components/CalendarView.jsx";
import { Popup } from "@/components/Popup.jsx";
import { PopupMenu, PopupMenuItem } from "@/components/PopupMenu.jsx";
import { TextInput } from "@/components/TextInput.jsx";
import { TrackData, trackDataGetAll } from "@/data/track_data.js";
import { TrackingData, trackingDataAdd, trackingDataDelete, trackingDataEdit, trackingDataGetAll } from "@/data/tracking.js";
import { dateFormatDateToString, dateFormatToString } from "@/utils/date.js";
import { foreach } from "@pang/core.js";
import { onMount } from "@pang/lifecycle.js";
import { state } from "@pang/reactive.js";

type ListItemData = {
    tracking: TrackingData
    trackData: TrackData
}

export function Tracking() {    
    let trackDatas: TrackData[] = []
    let trackingDatas: TrackingData[] = []
    let trackDatasById = new Map<string, TrackData>()
    
    const popupVisible = state(false)
    const popupItems = state<PopupMenuItem[]>([])
        
    const colorDatas = state<Record<string, DayData>>({})
    const list = state<ListItemData[]>([])
    
    const inputTitle = state("")
    const inputText = state("")
    const inputVisible = state(false)
    
    const activeDate = state("")
    
    let selectedYear = 0
    let selectedMonth = 0
    let selectedDate = 0
    let selectedTrackDataId = ""
    let editTrackingId = ""
    let isInputEdit = false
    
    function dateLongTouch(year: number, month: number, date: number) {
        popupVisible.value = true
        
        selectedYear = year
        selectedMonth = month
        selectedDate = date
    }
    
    function dateSelected(year: number, month: number, date: number) {
        activeDate.value = dateFormatToString(year, month, date)
        
        selectedYear = year
        selectedMonth = month
        selectedDate = date
        
        refreshList(year, month, date)
    }
    
    function popupMenuSelect(id: string) {
        const trackData = trackDatas.find(x => x.id === id)
        if (!trackData) return
        
        popupVisible.value = false
        selectedTrackDataId = id
        
        inputVisible.value = true
        isInputEdit = false
        inputText.value = ""
        inputTitle.value = `Input ${trackData.name}`
    }
    
    async function inputSave() {
        if (isInputEdit) {
            await trackingDataEdit(editTrackingId, {
                dataId: selectedTrackDataId,
                date: new Date(selectedYear, selectedMonth, selectedDate),
                value: inputText.value
            })
            
            await refreshTracking()
            refreshList(selectedYear, selectedMonth, selectedDate)
        }
        else {
            await trackingDataAdd({
                dataId: selectedTrackDataId,
                date: new Date(selectedYear, selectedMonth, selectedDate),
                value: inputText.value
            })
        
            await refreshColors()
            refreshList(selectedYear, selectedMonth, selectedDate)
        }
        
        isInputEdit = false
        inputVisible.value = false
    }
    
    async function editTracking(r: ListItemData) {
        isInputEdit = true
        
        editTrackingId = r.tracking.id
        selectedTrackDataId = r.trackData.id
        selectedYear = r.tracking.date.getFullYear()
        selectedMonth = r.tracking.date.getMonth()
        selectedDate = r.tracking.date.getDate()
        
        inputVisible.value = true
        inputTitle.value = `Edit ${r.trackData.name}`
        inputText.value = r.tracking.value
    }
    
    function deleteTracking(r: ListItemData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data tracking?",
            type: "question",
            async onOk() {
                await trackingDataDelete(r.tracking.id)
                await refreshColors()
                refreshList(selectedYear, selectedMonth, selectedDate)
            },
        })
    }
    
    async function getTrackData() {
        trackDatas = await trackDataGetAll()
        
        trackDatasById.clear()
        for (const t of trackDatas) {
            trackDatasById.set(t.id, t)
        }
        
        popupItems.value = trackDatas.map(x => ({
            id: x.id,
            text: x.name
        }))
    }
    
    async function refreshTracking() {
        trackingDatas = await trackingDataGetAll()
    }
    
    async function refreshColors() {
        await refreshTracking()
        
        const colors: Record<string, DayData> = {}
        
        for (const t of trackingDatas) {
            const dStr = dateFormatDateToString(t.date)
            
            if (!(dStr in colors)) {
                colors[dStr] = { colors: [] }
            }
            
            const trackData = trackDatas.find(x => x.id === t.dataId)
            colors[dStr].colors?.push(trackData?.color ?? '#000000')
        }
        
        colorDatas.value = colors
    }
    
    function refreshList(year: number, month: number, date: number) {
        list.value = trackingDatas.filter(x => x.date.getFullYear() === year && x.date.getMonth() === month && x.date.getDate() === date && trackDatasById.get(x.dataId))
            .map(x => ({
                tracking: x,
                trackData: trackDatasById.get(x.dataId)!
            }))
    }
    
    onMount(() => {
        getTrackData()
        refreshColors()
    })
    
    return <div class="h-full">
        <CalendarView
            datas={colorDatas.value}
            onDateLongTouch={dateLongTouch}
            onDateSelected={dateSelected}
            selectedDate={activeDate.value}
        />
        
        <div class="flex flex-col p-4 gap-2">
            {foreach(list, r => (
                <div class="flex items-center px-4 py-2 bg-white/80 rounded-lg shadow-lg gap-2">
                    <div
                        class="w-[10px] h-[10px] rounded-full"
                        style={{ background: r.trackData.color }}
                    />
                    <span class="text-sm">[{r.trackData.name}]</span>
                    <span class="font-bold">{r.tracking.value}</span>
                    
                    <div class="flex-1"/>
                    <button
                        class="flex items-center p-1 active:bg-fuchsia-500/20"
                        onclick={() => deleteTracking(r)}
                    >
                        <span class="icon-[material-symbols--delete]"></span>
                    </button>
                    <button
                        class="flex items-center p-1 active:bg-fuchsia-500/20"
                        onclick={() => editTracking(r)}
                    >
                        <span class="icon-[material-symbols--edit]"></span>
                    </button>
                </div>
            ))}
        </div>
        
        <PopupMenu
            items={popupItems.value}
            visible={popupVisible.value}
            onClose={() => popupVisible.value = false}
            onSelect={popupMenuSelect}
        />
        
        <Popup
            visible={inputVisible.value}
            title={inputTitle.value}
            contentClass="w-[80%] p-4 gap-3"
        >
            <TextInput
                value={inputText.value}
                oninput={x => inputText.value = x}
            />
            
            <div class="flex justify-end gap-1">
                <Button onclick={() => inputVisible.value = false}>Batal</Button>
                <Button onclick={inputSave}>Simpan</Button>
            </div>
        </Popup>
    </div>
}