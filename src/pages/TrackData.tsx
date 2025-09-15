import { showAlert } from "@/components/Alert.jsx"
import { Button } from "@/components/Button.jsx"
import { TextInput } from "@/components/TextInput.jsx"
import { TrackData, trackDataAdd, trackDataDelete, trackDataEdit, trackDataGetAll, TrackInputData } from "@/data/track_data.js"
import { foreach } from "@pang/core.js"
import ColorPicker from "vanilla-picker"
import { self } from "@pang/event-utils.js"
import { onMount } from "@pang/lifecycle.js"
import { state } from "@pang/reactive.js"
import { twJoin } from "tailwind-merge"

export function TrackDataView() {
    const trackDatas = state<TrackData[]>([])
    const mode = state<'list' | 'add' | 'edit'>('list')
    const editData = state<TrackData | undefined>(undefined)
    
    async function refresh() {
        mode.value = 'list'
        trackDatas.value = await trackDataGetAll()
    }
    
    function add() {
        mode.value = 'add'
    }
    
    function startEdit(data: TrackData) {
        editData.value = data
        mode.value = 'edit'
    }
    
    function remove(data: TrackData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data?",
            type: "error",
            onOk: async () => {
                await trackDataDelete(data.id)
                refresh()
            }
        })
    }
    
    onMount(() => {
        refresh()
    })
    
    return <div>
        {mode.value === 'list' ? (
            <div class="flex flex-col gap-2 p-6">
                {foreach(trackDatas, actor => (
                    <div class="flex items-center px-4 py-2 bg-white/80 rounded-lg shadow-lg gap-2">
                        <div
                            class="w-[25px] h-[25px] rounded"
                            style={{ background: actor.color }}
                        />
                        <span>{actor.name}</span>
                        
                        <div class="flex-1"/>
                        <button
                            class="flex items-center p-1 active:bg-fuchsia-500/20"
                            onclick={() => remove(actor)}
                        >
                            <span class="icon-[material-symbols--delete]"></span>
                        </button>
                        <button
                            class="flex items-center p-1 active:bg-fuchsia-500/20"
                            onclick={() => startEdit(actor)}
                        >
                            <span class="icon-[material-symbols--edit]"></span>
                        </button>
                    </div>
                ))}
                
                <Button onclick={add}>Tambah</Button>
            </div>
        ) : mode.value === 'add' ? (
            <InputTrackData
                onRefresh={refresh}
                onCancel={() => mode.value = 'list'}
            />
        ) : (
            <InputTrackData
                data={editData.value}
                onRefresh={refresh}
                onCancel={() => mode.value = 'list'}
            />
        )}
    </div>
}

function InputTrackData(props: { data?: TrackData, onRefresh: () => void, onCancel: () => void }) {
    let pickerEl: HTMLDivElement
    
    const name = state(props.data?.name ?? '')
    const type = state(props.data?.type ?? 'none')
    const selectedColor = state(props.data?.color ?? "#FF0000")
    
    async function save() {
        const data: TrackInputData = {
            name: name.value,
            type: type.value,
            color: selectedColor.value,
        }
        
        if (props.data === undefined) {            
            await trackDataAdd(data)
        }
        else {
            await trackDataEdit(props.data.id, data)
        }
        
        props.onRefresh()
    }
    
    function cancel() {
        props.onCancel()
    }
    
    onMount(() => {
        const picker = new ColorPicker({
            parent: pickerEl,
            color: selectedColor.value,
        })
        
        picker.onDone = function(color) {
            selectedColor.value = color.hex
        }
    })
    
    return <div
        class="flex flex-col p-6 gap-1"
    >
        <span>Nama</span>
        <TextInput
            value={name.value}
            oninput={v => name.value = v}
        />
        
        <span class="mt-2">Warna</span>
        
        <div
            ref={e => pickerEl = e}
            class="w-[50px] h-[50px] rounded-lg"
            style={{
                background: selectedColor.value
            }}
        />
        
        <div class="flex gap-1">
            <Button onclick={cancel}>Batal</Button>
            <Button onclick={save}>Simpan</Button>
        </div>
    </div>
}