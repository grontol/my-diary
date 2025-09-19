import { showAlert } from "@/components/Alert.jsx";
import { Button, IconButton } from "@/components/Button.jsx";
import { CalendarView, DayData } from "@/components/CalendarView.jsx";
import { Popup } from "@/components/Popup.jsx";
import { PopupMenu, PopupMenuItem } from "@/components/PopupMenu.jsx";
import { TextInput } from "@/components/TextInput.jsx";
import { ActorData, actorGetAll } from "@/data/actor.js";
import { diaryAdd, DiaryData, diaryDelete, diaryEdit, diaryGetAll } from "@/data/diary.js";
import { TrackData, trackDataGetAll } from "@/data/track_data.js";
import { TrackingData, trackingDataAdd, trackingDataDelete, trackingDataEdit, trackingDataGetAll } from "@/data/tracking.js";
import { DiaryInput } from "@/pages/DiaryInput.jsx";
import { dateFormatDateToString, dateFormatToString } from "@/utils/date.js";
import { foreach } from "@pang/core.js";
import { onMount } from "@pang/lifecycle.js";
import { state } from "@pang/reactive.js";

type TrackingListItemData = {
    tracking: TrackingData
    trackData: TrackData
}

type DiaryListItemData = {
    diary: DiaryData
    actor: ActorData
}

export function Tracking() {    
    let trackDatas: TrackData[] = []
    let trackingDatas: TrackingData[] = []
    let trackDatasById = new Map<string, TrackData>()
    let diaryDatas: DiaryData[] = []
    let actorDatas: ActorData[] = []
    let actorDatasById = new Map<string, ActorData>()
    
    const popupVisible = state(false)
    const popupItems = state<PopupMenuItem[]>([])
    
    const inputDiaryVisible = state(false)
    const inputDiaryReadonly = state(false)
        
    const colorDatas = state<Record<string, DayData>>({})
    const trackingList = state<TrackingListItemData[]>([])
    const diaryList = state<DiaryListItemData[]>([])
    
    const inputTitle = state("")
    const inputText = state("")
    const inputNote = state("")
    const inputVisible = state(false)
    
    const inputDiaryActor = state("")
    const inputDiaryContent = state<any>(null)
    
    const activeDate = state("")
    
    let selectedYear = 0
    let selectedMonth = 0
    let selectedDate = 0
    let selectedTrackDataId = ""
    let editTrackingId = ""
    let isInputEdit = false
    let editDiaryId: string | null = null
    
    function dateLongTouch(year: number, month: number, date: number) {
        popupVisible.value = true
        
        activeDate.value = dateFormatToString(year, month, date)
        selectedYear = year
        selectedMonth = month
        selectedDate = date
        
        refreshTrackingList(year, month, date)
        refreshDiaryList(year, month, date)
    }
    
    function dateSelected(year: number, month: number, date: number) {
        activeDate.value = dateFormatToString(year, month, date)
        selectedYear = year
        selectedMonth = month
        selectedDate = date
        
        refreshTrackingList(year, month, date)
        refreshDiaryList(year, month, date)
    }
    
    function monthChanged() {
        activeDate.value = ""
        trackingList.value = []
    }
    
    function popupMenuSelect(id: string) {
        if (id === "add_diary") {
            editDiaryId = null
            
            inputDiaryActor.value = ""
            inputDiaryContent.value = null
            
            inputDiaryVisible.value = true
            inputDiaryReadonly.value = false
        }
        else {
            const trackData = trackDatas.find(x => x.id === id)
            if (!trackData) return
            
            selectedTrackDataId = id
            
            inputVisible.value = true
            isInputEdit = false
            inputText.value = ""
            inputNote.value = ""
            inputTitle.value = `Input ${trackData.name}`
        }
        
        popupVisible.value = false
    }
    
    async function inputSave() {
        if (isInputEdit) {
            await trackingDataEdit(editTrackingId, {
                dataId: selectedTrackDataId,
                date: new Date(selectedYear, selectedMonth, selectedDate),
                value: inputText.value,
                note: inputNote.value,
            })
            
            await refreshTracking()
            refreshTrackingList(selectedYear, selectedMonth, selectedDate)
        }
        else {
            await trackingDataAdd({
                dataId: selectedTrackDataId,
                date: new Date(selectedYear, selectedMonth, selectedDate),
                value: inputText.value,
                note: inputNote.value,
            })
        
            await refreshColors()
            refreshTrackingList(selectedYear, selectedMonth, selectedDate)
        }
        
        isInputEdit = false
        inputVisible.value = false
    }
    
    async function editTracking(r: TrackingListItemData) {
        isInputEdit = true
        
        editTrackingId = r.tracking.id
        selectedTrackDataId = r.trackData.id
        selectedYear = r.tracking.date.getFullYear()
        selectedMonth = r.tracking.date.getMonth()
        selectedDate = r.tracking.date.getDate()
        
        inputVisible.value = true
        inputTitle.value = `Edit ${r.trackData.name}`
        inputText.value = r.tracking.value
        inputNote.value = r.tracking.note ?? ''
    }
    
    function deleteTracking(r: TrackingListItemData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data tracking?",
            type: "question",
            async onOk() {
                await trackingDataDelete(r.tracking.id)
                await refreshColors()
                refreshTrackingList(selectedYear, selectedMonth, selectedDate)
            },
        })
    }
    
    async function saveDiary(actor: string, content: any) {
        if (editDiaryId) {
            await diaryEdit(editDiaryId, {
                actor,
                content,
                date: new Date(selectedYear, selectedMonth, selectedDate),
            })
        }
        else {
            await diaryAdd({
                actor,
                content,
                date: new Date(selectedYear, selectedMonth, selectedDate),
            })
        }
        
        await refreshColors()
        refreshDiaryList(selectedYear, selectedMonth, selectedDate)
        
        inputDiaryVisible.value = false
    }
    
    async function showDiary(d: DiaryListItemData) {
        inputDiaryActor.value = d.actor.id
        inputDiaryContent.value = d.diary.content
        
        inputDiaryVisible.value = true
        inputDiaryReadonly.value = true
    }
    
    async function editDiary(d: DiaryListItemData) {
        editDiaryId = d.diary.id
        
        inputDiaryActor.value = d.actor.id
        inputDiaryContent.value = d.diary.content
        
        inputDiaryVisible.value = true
        inputDiaryReadonly.value = false
    }
    
    async function deleteDiary(d: DiaryListItemData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data diary?",
            type: "question",
            async onOk() {
                await diaryDelete(d.diary.id)
                await refreshColors()
                refreshDiaryList(selectedYear, selectedMonth, selectedDate)
            },
        })
    }
    
    async function getTrackData() {
        trackDatas = await trackDataGetAll()
        
        trackDatasById.clear()
        for (const t of trackDatas) {
            trackDatasById.set(t.id, t)
        }
        
        popupItems.value = [
            { kind: "item", id: "add_diary", text: "Add Diary" },
            { kind: "divider" },
            ...trackDatas.map(x => ({
                kind: "item",
                id: x.id,
                text: x.name
            } satisfies PopupMenuItem))
        ]
    }
    
    async function refreshTracking() {
        trackingDatas = await trackingDataGetAll()
    }
    
    async function getActorData() {
        actorDatas = await actorGetAll()
        
        actorDatasById.clear()
        for (const a of actorDatas) {
            actorDatasById.set(a.id, a)
        }
    }
    
    async function refreshDiary() {
        diaryDatas = await diaryGetAll()
    }
    
    async function refreshColors() {
        await Promise.all([
            refreshTracking(),
            refreshDiary(),
        ])
        
        const colors: Record<string, DayData> = {}
        
        for (const t of trackingDatas) {
            const dStr = dateFormatDateToString(t.date)
            
            if (!(dStr in colors)) {
                colors[dStr] = { colors: [], lines: [] }
            }
            
            const trackData = trackDatas.find(x => x.id === t.dataId)
            colors[dStr].colors?.push({
                color: trackData?.color ?? '#000000',
                shape: trackData?.shape ?? 'icon-[mdi--circle]'
            })
        }
        
        for (const d of diaryDatas) {
            const dStr = dateFormatDateToString(d.date)
            
            if (!(dStr in colors)) {
                colors[dStr] = { colors: [], lines: [] }
            }
            
            const actorData = actorDatas.find(x => x.id === d.actor)
            colors[dStr].lines?.push(actorData?.color ?? '#000000')
        }
        
        for (const k in colors) {
            colors[k].colors?.sort((a, b) => a.color.localeCompare(b.color))
            colors[k].lines?.sort((a, b) => a.localeCompare(b))
        }
        
        colorDatas.value = colors
    }
    
    function refreshTrackingList(year: number, month: number, date: number) {
        trackingList.value = trackingDatas.filter(x => x.date.getFullYear() === year && x.date.getMonth() === month && x.date.getDate() === date && trackDatasById.get(x.dataId))
            .map(x => ({
                tracking: x,
                trackData: trackDatasById.get(x.dataId)!
            }))
            .sort((a, b) => a.trackData.color.localeCompare(b.trackData.color))
    }
    
    function refreshDiaryList(year: number, month: number, date: number) {
        diaryList.value = diaryDatas.filter(x => x.date.getFullYear() === year && x.date.getMonth() === month && x.date.getDate() === date && actorDatasById.get(x.actor))
            .map(x => ({
                diary: x,
                actor: actorDatasById.get(x.actor)!
            }))
            .sort((a, b) => a.actor.color.localeCompare(b.actor.color))
    }
    
    onMount(() => {
        getTrackData()
        getActorData()
        refreshColors()
    })
    
    return <div class="flex-1 flex flex-col">
        <CalendarView
            datas={colorDatas.value}
            onDateLongTouch={dateLongTouch}
            onDateSelected={dateSelected}
            selectedDate={activeDate.value}
            onMonthChanged={monthChanged}
        />
        
        {inputDiaryVisible.value && (
            <DiaryInput
                onCancel={() => inputDiaryVisible.value = false}
                onSave={saveDiary}
                readonly={inputDiaryReadonly.value}
                actor={inputDiaryActor.value}
                content={inputDiaryContent.value}
            />
        )}
        
        <div class="flex flex-col p-4 gap-2 flex-1">
            {foreach(trackingList, r => (
                <div class="flex flex-col px-3 py-2 bg-white/80 rounded-lg shadow-lg">
                    <div class="flex items-center gap-1">
                        <div
                            class={`w-[20px] h-[20px] mr-1 rounded-full ${r.trackData.shape}`}
                            style={{ background: r.trackData.color }}
                        />
                        <span class="text-sm">[{r.trackData.name}]</span>
                        <span class="font-bold">{r.tracking.value}</span>
                        
                        <div class="flex-1"/>
                        
                        <IconButton
                            onclick={() => deleteTracking(r)}
                            icon="icon-[material-symbols--delete]"
                        />
                        
                        <IconButton
                            onclick={() => editTracking(r)}
                            icon="icon-[material-symbols--edit]"
                        />
                    </div>
                    
                    {r.tracking.note && (
                        <div class="text-xs text-gray-600 ml-7 whitespace-pre-wrap">{r.tracking.note}</div>
                    )}
                </div>
            ))}
            
            {foreach(diaryList, d => (
                <div class="flex flex-col px-3 py-2 bg-white/80 rounded-lg shadow-lg">
                    <div class="flex items-center gap-1">
                        <div
                            class={`w-[20px] h-[20px] mr-1 icon-[mingcute--diary-fill]`}
                            style={{ background: d.actor.color }}
                        />
                        <span class="text-sm mr-1">{d.actor.name}</span>
                        <span class="text-sm">{d.actor.emoji}</span>
                        
                        <div class="flex-1"/>
                        
                        <IconButton
                            onclick={() => deleteDiary(d)}
                            icon="icon-[material-symbols--delete]"
                        />
                        
                        <IconButton
                            onclick={() => editDiary(d)}
                            icon="icon-[material-symbols--edit]"
                        />
                        
                        <IconButton
                            onclick={() => showDiary(d)}
                            icon="icon-[mdi--eye]"
                        />
                    </div>
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
                placeholder="Value"
            />
            
            <TextInput
                value={inputNote.value}
                oninput={x => inputNote.value = x}
                placeholder="Note"
                canGrow={true}
            />
            
            <div class="flex justify-end gap-1">
                <Button onclick={() => inputVisible.value = false}>Batal</Button>
                <Button onclick={inputSave}>Simpan</Button>
            </div>
        </Popup>
    </div>
}