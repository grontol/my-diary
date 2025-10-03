import { showAlert } from "@/components/Alert.jsx";
import { Button, IconButton } from "@/components/Button.jsx";
import { CalendarView, DayData } from "@/components/CalendarView.jsx";
import { Popup } from "@/components/Popup.jsx";
import { PopupMenu, PopupMenuItem } from "@/components/PopupMenu.jsx";
import { SwipeableView } from "@/components/SwipeableView.jsx";
import { TextInput } from "@/components/TextInput.jsx";
import { ActorData, actorGetAll } from "@/data/actor.js";
import { diaryAdd, DiaryData, diaryDelete, diaryEdit, diaryGetAll, DiaryInputData, DiaryMediaData } from "@/data/diary.js";
import { TrackData, trackDataGetAll } from "@/data/track_data.js";
import { TrackingData, trackingDataAdd, trackingDataDelete, trackingDataEdit, trackingDataGetAll } from "@/data/tracking.js";
import { DiaryInput } from "@/pages/DiaryInput.jsx";
import { MediaDiaryInput } from "@/pages/MediaDiaryInput.jsx";
import { dateFormatDateToString, dateFormatToString, dateFormatToTime } from "@/utils/date.js";
import { AudioData, envAddDataChangedListener, envAsAndroidFileUrl, envRemoveWebEventListener, getAndroidEnv, PhotoData, VideoData } from "@/utils/env.js";
import { formatVideoLengthText } from "@/utils/format.js";
import { foreach } from "@pang/core.js";
import { prevent, stop } from "@pang/event-utils.js";
import { onDestroy, onMount } from "@pang/lifecycle.js";
import { effect, state } from "@pang/reactive.js";
import { twMerge } from "tailwind-merge";

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
    
    const now = new Date()
    const year = state(now.getFullYear())
    const month = state(now.getMonth())
    
    const popupVisible = state(false)
    const popupItems = state<PopupMenuItem[]>([])
    
    const settingsPopupVisible = state(false)
    
    const inputTextDiaryVisible = state(false)
    const inputTextDiaryReadonly = state(false)
    const inputDiaryActor = state("")
    const inputDiaryContent = state<any>(null)
    
    const inputMediaDiaryVisible = state(false)
    const inputMediaDiaryReadonly = state(false)
    const inputMediaDiaryData = state<DiaryMediaData | null>(null)
        
    const colorDatas = state<Record<string, DayData>>({})
    const trackingList = state<TrackingListItemData[]>([])
    const diaryList = state<DiaryListItemData[]>([])
    
    const inputTitle = state("")
    const inputText = state("")
    const inputNote = state("")
    const inputVisible = state(false)
    
    const activeDate = state("")
    
    const galleryMode = state(localStorage.getItem("__dt_galleryMode") === "true")
    effect(() => {
        localStorage.setItem("__dt_galleryMode", galleryMode.value ? "true" : "false")
    })
    
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
    
    function onIncMonth() {
        if (month.value === 11) {
            month.value = 0
            year.value += 1
        }
        else {
            month.value += 1
        }
        
        monthChanged()
    }
    
    function onDecMonth() {
        if (month.value === 0) {
            month.value = 11
            year.value -= 1
        }
        else {
            month.value -= 1
        }
        
        monthChanged()
    }
    
    function popupMenuSelect(id: string) {
        if (id === "add_diary") {
            editDiaryId = null
            
            inputDiaryActor.value = ""
            inputDiaryContent.value = null
            
            inputTextDiaryVisible.value = true
            inputTextDiaryReadonly.value = false
        }
        else if (id === "add_media_diary") {
            editDiaryId = null
            
            inputMediaDiaryData.value = null
            
            inputMediaDiaryVisible.value = true
            inputMediaDiaryReadonly.value = false
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
                type: "text",
                content,
                date: new Date(selectedYear, selectedMonth, selectedDate),
            })
        }
        else {
            await diaryAdd({
                actor,
                type: "text",
                content,
                
                date: new Date(selectedYear, selectedMonth, selectedDate),
            })
        }
        
        await refreshColors()
        refreshDiaryList(selectedYear, selectedMonth, selectedDate)
        
        inputTextDiaryVisible.value = false
    }
    
    async function saveMediaDiary(actor: string, data: VideoData | PhotoData | AudioData, gain: number, note: string) {
        const now = new Date()
        let inputData: DiaryInputData
        
        if (data.type === "video") {
            inputData = {
                actor,
                date: new Date(selectedYear, selectedMonth, selectedDate, now.getHours(), now.getMinutes(), now.getSeconds()),
                type: "video",
                content: {
                    duration: data.length,
                    gain: gain,
                    size: data.size,
                    thumbnail: data.thumbnail,
                    video: data.name,
                    note,
                },
            }
        }
        else if (data.type === "audio") {
            inputData = {
                actor,
                date: new Date(selectedYear, selectedMonth, selectedDate, now.getHours(), now.getMinutes(), now.getSeconds()),
                type: "audio",
                content: {
                    audio: data.name,
                    duration: data.duration,
                    size: data.size,
                    gain,
                    note,
                },
            }
        }
        else {
            inputData = {
                actor,
                date: new Date(selectedYear, selectedMonth, selectedDate, now.getHours(), now.getMinutes(), now.getSeconds()),
                type: "photo",
                content: {
                    image: data.name,
                    size: data.size,
                    note,
                },
            }
        }
        
        if (editDiaryId) {
            if (inputMediaDiaryData.value) {
                inputData.date = inputMediaDiaryData.value.date
            }
            
            await diaryEdit(editDiaryId, inputData)
        }
        else {
            await diaryAdd(inputData)
        }
        
        await refreshColors()
        refreshDiaryList(selectedYear, selectedMonth, selectedDate)
        
        inputMediaDiaryVisible.value = false
    }
    
    async function showDiary(d: DiaryListItemData) {
        inputDiaryActor.value = d.actor.id
        inputDiaryContent.value = d.diary.content
        
        if (d.diary.type === "text") {
            inputTextDiaryVisible.value = true
            inputTextDiaryReadonly.value = true
        }
        else if (d.diary.type === "video") {
            getAndroidEnv()?.playVideo(d.diary.content.video, d.diary.content.gain)
        }
        else if (d.diary.type === "photo") {
            getAndroidEnv()?.viewPhoto(d.diary.content.image)
        }
        else if (d.diary.type === "audio") {
            getAndroidEnv()?.playAudio(d.diary.content.audio, d.diary.content.gain)
        }
    }
    
    async function editDiary(d: DiaryListItemData) {
        editDiaryId = d.diary.id
        
        if (d.diary.type === "text") {
            inputDiaryActor.value = d.actor.id
            inputDiaryContent.value = d.diary.content
            
            inputTextDiaryVisible.value = true
            inputTextDiaryReadonly.value = false
        }
        else if (d.diary.type === "video" || d.diary.type === "photo" || d.diary.type === "audio") {
            inputMediaDiaryData.value = d.diary
            
            inputMediaDiaryVisible.value = true
            inputMediaDiaryReadonly.value = false
        }
    }
    
    async function deleteDiary(d: DiaryListItemData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data diary?",
            type: "question",
            async onOk() {
                await diaryDelete(d.diary.id)
                
                if (d.diary.type === "video") {
                    getAndroidEnv()?.deleteMedia([
                        d.diary.content.video,
                        d.diary.content.thumbnail,
                    ])
                }
                else if (d.diary.type === "photo") {
                    getAndroidEnv()?.deleteMedia([
                        d.diary.content.image,
                    ])
                }
                
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
            { kind: "item", id: "add_diary", text: "Diary", icon: "icon-[mingcute--diary-fill]", iconColor: "var(--color-blue-500)" },
            { kind: "item", id: "add_media_diary", text: "Media Diary", icon: "icon-[material-symbols-light--media-link]", iconColor: "var(--color-pink-500)" },
            { kind: "divider" },
            ...trackDatas.sort((a, b) => a.name.localeCompare(b.name)).map(x => ({
                kind: "item",
                id: x.id,
                text: x.name,
                icon: x.shape,
                iconColor: x.color,
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
            .sort((a, b) => a.diary.createdAt.getDate() - b.diary.createdAt.getDate())
    }
    
    async function dataChangedListener() {
        await getTrackData()
        await getActorData()
        await refreshColors()
        
        refreshTrackingList(selectedYear, selectedMonth, selectedDate)
        refreshDiaryList(selectedYear, selectedMonth, selectedDate)        
    }
    
    function prevDay() {
        const d = new Date(selectedYear, selectedMonth, selectedDate)
        d.setDate(d.getDate() - 1)
        
        if (d.getMonth() === (selectedMonth - 1) % 12) {
            onDecMonth()
        }
        
        dateSelected(d.getFullYear(), d.getMonth(), d.getDate())
    }
    
    function nextDay() {
        const d = new Date(selectedYear, selectedMonth, selectedDate)
        d.setDate(d.getDate() + 1)
        
        if (d.getMonth() === (selectedMonth + 1) % 12) {
            onIncMonth()
        }
        
        dateSelected(d.getFullYear(), d.getMonth(), d.getDate())
    }
    
    onMount(async () => {
        await getTrackData()
        await getActorData()
        await refreshColors()
        
        envAddDataChangedListener(dataChangedListener, ["actor", "track-data", "diary", "tracking"])
    })
    
    onDestroy(() => {
        envRemoveWebEventListener(dataChangedListener)
    })
    
    return <div class="flex-1 flex flex-col select-none">
        {/* <div class="fixed top-1 right-2">
            <IconButton
                icon="icon-[mdi--filter] text-xl"
            />
        </div> */}
        
        <div class="fixed top-1 right-1">
            <IconButton
                icon="icon-[mingcute--more-2-fill] text-xl"
                onclick={() => settingsPopupVisible.value = true}
            />
        </div>
        
        <CalendarView
            datas={colorDatas.value}
            year={year.value}
            month={month.value}
            onIncMonth={onIncMonth}
            onDecMonth={onDecMonth}
            onDateLongTouch={dateLongTouch}
            onDateSelected={dateSelected}
            selectedDate={activeDate.value}
        />
        
        {inputTextDiaryVisible.value && (
            <DiaryInput
                onCancel={() => inputTextDiaryVisible.value = false}
                onSave={saveDiary}
                readonly={inputTextDiaryReadonly.value}
                actor={inputDiaryActor.value}
                content={inputDiaryContent.value}
            />
        )}
        
        {inputMediaDiaryVisible.value && (
            <MediaDiaryInput
                onCancel={() => inputMediaDiaryVisible.value = false}
                onSave={saveMediaDiary}
                data={inputMediaDiaryData.value ?? undefined}
            />
        )}
        
        <SwipeableView
            onPrev={prevDay}
            onNext={nextDay}
        >
            {galleryMode.value ? (
                <GalleryView
                    list={diaryList.value}
                    onShow={showDiary}
                    onEdit={editDiary}
                />
            ) : null}
            
            <div class="flex flex-col p-4 gap-2 flex-1">
                {foreach(trackingList, r => (
                    <TrackingList
                        data={r}
                        onEdit={() => editTracking(r)}
                        onDelete={() => deleteTracking(r)}
                    />
                ))}
                
                {foreach(diaryList, d => (
                    <DiaryList
                        data={d}
                        onShow={() => showDiary(d)}
                        onEdit={() => editDiary(d)}
                        onDelete={() => deleteDiary(d)}
                    />
                ))}
            </div>
        </SwipeableView>
        
        <PopupMenu
            items={popupItems.value}
            visible={popupVisible.value}
            onClose={() => popupVisible.value = false}
            onSelect={popupMenuSelect}
        />
        
        <PopupMenu
            title="Setting"
            items={[
                {
                    id: "galleryMode",
                    kind: "item",
                    text: "Gallery Mode",
                    selectable: true,
                    selected: galleryMode.value,
                },
            ]}
            visible={settingsPopupVisible.value}
            onClose={() => settingsPopupVisible.value = false}
            onSelect={(id) => { if (id === "galleryMode") { galleryMode.value = !galleryMode.value } }}
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

function GalleryView(props: {
    list: DiaryListItemData[]
    onShow: (i: DiaryListItemData) => void
    onEdit: (i: DiaryListItemData) => void
}) {
    return <div class="grid grid-cols-3 px-4 gap-1">
        {foreach(props.list, d => d.diary.type === "video" || d.diary.type === "photo" ? (
            <div
                class="relative"
                oncontextmenu={prevent()}
            >
                <img
                    class="rounded-lg"
                    src={envAsAndroidFileUrl(d.diary.type === "video" ? d.diary.content.thumbnail : d.diary.content.image)}
                    style={{
                        aspectRatio: "1280/1920",
                        objectFit: "cover",
                    }}
                    oncontextmenu={prevent()}
                />
                
                <div
                    class="absolute inset-0 active:bg-black/10"
                    onclick={() => props.onShow(d)}
                />
                
                <div
                    class={twMerge(
                        "w-[20px] h-[20px] absolute left-1 top-1",
                        d.diary.type === "video"
                            ? "icon-[tabler--video-filled]"
                        : d.diary.type === "photo"
                            ? "icon-[ic--round-photo]"
                            : "icon-[mingcute--diary-fill]"
                    )}
                    style={{ background: d.actor.color }}
                />
                
                <div class="absolute left-0 bottom-0 bg-black/50 text-white px-1 py-0.5 text-xs rounded-lg flex items-center gap-0.5">
                    <span class="icon-[tabler--clock-filled] text-xs"/>
                    <span>{dateFormatToTime(d.diary.createdAt)}</span>                        
                </div>
                
                {d.diary.type === "video" && (
                    <div class="absolute right-0 bottom-0 bg-black/50 text-white px-1 py-0.5 text-xs rounded-lg flex items-center gap-0.5">
                        <span class="icon-[line-md--play-filled] text-xs"/>
                        <span >{formatVideoLengthText(d.diary.content.duration)}</span>
                    </div>
                )}
                
                <IconButton
                    class="absolute top-0.5 right-0.5"
                    icon="icon-[material-symbols--edit]"
                    onclick={() => props.onEdit(d)}
                />
            </div>
        ) : null)}
    </div>
}

function TrackingList(props: {
    data: TrackingListItemData
    onEdit: () => void
    onDelete: () => void
}) {
    return <div class="flex flex-col px-3 py-2 bg-white/80 rounded-lg shadow-lg">
        <div class="flex items-center gap-1">
            <div
                class={`w-[20px] h-[20px] mr-1 rounded-full ${props.data.trackData.shape}`}
                style={{ background: props.data.trackData.color }}
            />
            <span class="text-sm">[{props.data.trackData.name}]</span>
            
            {props.data.tracking.value.length <= 10 && (
                <span class="font-bold text-sm">{props.data.tracking.value}</span>
            )}
            
            <div class="flex-1"/>
            
            <IconButton
                onclick={props.onDelete}
                icon="icon-[material-symbols--delete]"
            />
            
            <IconButton
                onclick={props.onEdit}
                icon="icon-[material-symbols--edit]"
            />
        </div>
            
        {props.data.tracking.value.length > 10 && (
            <span class="font-bold ml-7 text-sm">{props.data.tracking.value}</span>
        )}
        
        {props.data.tracking.note && (
            <div class="text-xs text-gray-600 ml-7 whitespace-pre-wrap">{props.data.tracking.note}</div>
        )}
    </div>
}

function DiaryList(props: {
    data: DiaryListItemData,
    onShow: () => void,
    onDelete: () => void,
    onEdit: () => void,
}) {
    const expanded = state(false)
    
    function toggleExpand() {
        expanded.value = !expanded.value
    }
    
    return <div
        class="flex flex-col px-3 py-2 bg-white/80 active:bg-white/60 rounded-lg shadow-lg"
        onclick={props.onShow}
    >
        <div class="flex items-center gap-1">
            <div
                class={twMerge(
                    "w-[20px] h-[20px] mr-1",
                    props.data.diary.type === "video"
                        ? "icon-[tabler--video-filled]"
                    : props.data.diary.type === "photo"
                        ? "icon-[ic--round-photo]"
                    : props.data.diary.type === "audio"
                        ? "icon-[mdi--waveform]"
                        : "icon-[mingcute--diary-fill]"
                )}
                style={{ background: props.data.actor.color }}
            />
            <span class="text-sm mr-1">{props.data.actor.name}</span>
            <span class="text-sm">{props.data.actor.emoji}</span>
            
            {(props.data.diary.type === "video" || props.data.diary.type === "photo" || props.data.diary.type === "audio") && <>
                <span class="text-xs font-bold ml-1 text-gray-500">{dateFormatToTime(props.data.diary.createdAt)}</span>
            </>}
            
            <div class="flex-1"/>
            
            {(props.data.diary.type === "video" || props.data.diary.type === "photo") && (
                <IconButton
                    onclick={stop(toggleExpand)}
                    icon="icon-[mingcute--right-line]"
                    class={twMerge(
                        "text-xl transition-transform",
                        expanded.value ? "rotate-90" : ""
                    )}
                />
            )}
            
            {props.data.diary.type === "audio" && (
                <span class="text-xs font-bold ml-1 text-gray-500 mr-2">{formatVideoLengthText(props.data.diary.content.duration)}</span>
            )}
            
            <IconButton
                onclick={stop(props.onDelete)}
                icon="icon-[material-symbols--delete]"
            />
            
            <IconButton
                onclick={stop(props.onEdit)}
                icon="icon-[material-symbols--edit]"
            />
        </div>
        
        {(props.data.diary.type === "video" || props.data.diary.type === "photo") && <>
            {props.data.diary.content.note && (
                <div class="text-xs text-gray-600 ml-7 whitespace-pre-wrap">{props.data.diary.content.note}</div>
            )}
        
            {expanded.value && (
                <div
                    class="self-center mt-1 overflow-hidden"
                >
                    <img
                        src={envAsAndroidFileUrl(props.data.diary.type === "video" ? props.data.diary.content.thumbnail : props.data.diary.content.image)}
                        class="rounded-lg"
                        style={{
                            maxWidth: `${window.innerWidth * 0.3}px`,
                            maxHeight: `${window.innerWidth * 0.4}px`,
                        }}
                    />
                </div>
            )}
        </>}
    </div>
}