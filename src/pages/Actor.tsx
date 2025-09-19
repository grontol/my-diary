import { TextInput } from "@/components/TextInput.jsx";
import { onMount } from "@pang/lifecycle.js";
import { state } from "@pang/reactive.js";
import ColorPicker from "vanilla-picker"
import { Picker } from "emoji-mart"
import emojiData from "@emoji-mart/data"
import { twJoin } from "tailwind-merge";
import { self } from "@pang/event-utils.js";
import { actorAdd, ActorData, actorDelete, actorEdit, actorGetAll, ActorInputData } from "@/data/actor.js";
import { foreach } from "@pang/core.js";
import { Button, IconButton } from "@/components/Button.jsx";
import { showAlert } from "@/components/Alert.jsx";

export function Actor() {
    const actors = state<ActorData[]>([])
    const mode = state<'list' | 'add' | 'edit'>('list')
    const editData = state<ActorData | undefined>(undefined)
    
    async function refresh() {
        mode.value = 'list'
        actors.value = await actorGetAll()
    }
    
    function add() {
        mode.value = 'add'
    }
    
    function startEdit(data: ActorData) {
        editData.value = data
        mode.value = 'edit'
    }
    
    function remove(data: ActorData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data?",
            type: "error",
            onOk: async () => {
                await actorDelete(data.id)
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
                {foreach(actors, actor => (
                    <div class="flex items-center px-4 py-2 bg-white/80 rounded-lg shadow-lg gap-2">
                        <div
                            class="w-[25px] h-[25px] rounded"
                            style={{ background: actor.color }}
                        />
                        <span>{actor.name}</span>
                        <span class="emoji text-2xl">{actor.emoji}</span>
                        
                        <div class="flex-1"/>
                        
                        <IconButton
                            onclick={() => remove(actor)}
                            icon="icon-[material-symbols--delete]"
                        />
                        
                        <IconButton
                            onclick={() => startEdit(actor)}
                            icon="icon-[material-symbols--edit]"
                        />
                    </div>
                ))}
                
                <Button onclick={add}>Tambah</Button>
            </div>
        ) : mode.value === 'add' ? (
            <InputActor
                onRefresh={refresh}
                onCancel={() => mode.value = 'list'}
            />
        ) : (
            <InputActor
                data={editData.value}
                onRefresh={refresh}
                onCancel={() => mode.value = 'list'}
            />
        )}
    </div>
}

function InputActor(props: { data?: ActorData, onRefresh: () => void, onCancel: () => void }) {
    let pickerEl: HTMLDivElement
    let emojiEl: HTMLDivElement
    
    const name = state(props.data?.name ?? '')
    const selectedEmoji = state(props.data?.emoji ?? "🥰")
    const selectedColor = state(props.data?.color ?? "#FF0000")
    
    const emojiPickerVisible = state(false)
    
    async function save() {
        const data: ActorInputData = {
            name: name.value,
            emoji: selectedEmoji.value,
            color: selectedColor.value,
        }
        
        if (props.data === undefined) {            
            await actorAdd(data)
        }
        else {
            await actorEdit(props.data.id, data)
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
        
        const emojiPicker = new Picker({
            data: emojiData,
            onEmojiSelect: (x: any) => {
                selectedEmoji.value = x.native
                emojiPickerVisible.value = false
            }
        })
        // @ts-ignore
        emojiEl.appendChild(emojiPicker)
    })
    
    return <div
        class="flex flex-col p-6 gap-1"
    >
        <span>Nama</span>
        <TextInput
            value={name.value}
            oninput={v => name.value = v}
        />
        
        <span class="mt-2">Emoji</span>
        <div
            class="text-4xl emoji"
            onclick={() => emojiPickerVisible.value = true}
        >{selectedEmoji.value}</div>
        
        <div
            ref={e => emojiEl = e}
            class={twJoin(
                "fixed inset-0 bg-black/20 flex items-center justify-center z-[100]",
                emojiPickerVisible.value ? "" : "hidden"
            )}
            onclick={self(() => emojiPickerVisible.value = false)}
        />
        
        <span class="mt-2">Warna</span>
        
        <div
            ref={e => pickerEl = e}
            class="w-[50px] h-[50px] rounded-lg"
            style={{
                background: selectedColor.value
            }}
        />
        
        <div class="flex gap-1 mt-2">
            <Button onclick={cancel}>Batal</Button>
            <Button onclick={save}>Simpan</Button>
        </div>
    </div>
}