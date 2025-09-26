import { showAlert } from "@/components/Alert.jsx"
import { Button, IconButton } from "@/components/Button.jsx"
import { TextInput } from "@/components/TextInput.jsx"
import { resepAdd, ResepData, resepDelete, resepEdit, resepGetAll } from "@/data/resep.js"
import { envAddDataChangedListener } from "@/utils/env.js"
import { foreach } from "@pang/core.js"
import { stop } from "@pang/event-utils.js"
import { onDestroy, onMount } from "@pang/lifecycle.js"
import { derived, state } from "@pang/reactive.js"
import Quill from "quill"
import "quill/dist/quill.core.css"
import "quill/dist/quill.snow.css"
import { twMerge } from "tailwind-merge"

export function Resep() {
    const reseps = state<ResepData[]>([])
    const allTags = derived(() => {
        return [...new Set(reseps.value.map(x => x.tags).flatMap(x => x))]
    })
    const selectedTags = state<string[]>([])
    const search = state("")
    const filteredReseps = derived(() => {
        let res = reseps.value
        
        if (selectedTags.value.length > 0) {
            res = res.filter(x => x.tags.some(y => selectedTags.value.includes(y)))
        }
        
        if (search.value) {
            res = res.filter(x => x.name.toLowerCase().includes(search.value.toLowerCase()))
        }
        
        return res
    })
    
    const inputVisible = state(false)
    const inputName = state("")
    const inputBahans = state<string[]>([])
    const inputTags = state<string[]>([])
    const inputContent = state<any | null>(null)
    const inputReadonly = state(false)
    
    let editId = ""
    
    function toggleSelectedTag(t: string) {
        if (selectedTags.value.includes(t)) {
            selectedTags.value.splice(selectedTags.value.indexOf(t), 1)
        }
        else {
            selectedTags.value.push(t)
        }
    }    
    
    function remove(r: ResepData) {
        showAlert({
            title: "Konfirmasi",
            message: "Delete data?",
            type: "error",
            onOk: async () => {
                await resepDelete(r.id)
                refreshData()
            }
        })
    }
    
    function startAdd() {
        editId = ""
        
        inputName.value = ""
        inputBahans.value = []
        inputTags.value = []
        inputContent.value = null
        inputReadonly.value = false
        inputVisible.value = true
    }
    
    function startEdit(r: ResepData) {
        editId = r.id
        
        inputName.value = r.name
        inputBahans.value = r.bahans
        inputTags.value = r.tags
        inputContent.value = r.content
        inputReadonly.value = false
        inputVisible.value = true
    }
    
    function show(r: ResepData) {
        inputName.value = r.name
        inputBahans.value = r.bahans
        inputTags.value = r.tags
        inputContent.value = r.content
        inputReadonly.value = true
        inputVisible.value = true
    }
    
    async function save(name: string, bahans: string[], tags: string[], content: any) {
        if (editId) {
            await resepEdit(editId, {
                name,
                bahans,
                tags,
                content
            })
        }
        else {
            await resepAdd({
                name,
                bahans,
                tags,
                content
            })
        }
        
        refreshData()
        
        inputVisible.value = false
    }
    
    function cancel() {
        inputVisible.value = false
    }
    
    async function refreshData() {
        reseps.value = await resepGetAll()
    }
    
    function dataChangedListener() {
        refreshData()
    }
    
    onMount(() => {
        refreshData()
        
        envAddDataChangedListener(dataChangedListener, ["resep"])
    })
    
    onDestroy(() => {
        envAddDataChangedListener(dataChangedListener)
    })
    
    return <div class="flex flex-col h-full overflow-hidden">
        <div class="flex gap-1 flex-wrap px-6">
            {foreach(allTags, t => (
                <div
                    class={twMerge(
                        "font-bold text-xs px-2 py-1 rounded-full flex-wrap border border-transparent",
                        selectedTags.value.includes(t) ? "bg-pink-400 text-white" : "bg-white/40 border-pink-500 text-pink-500"
                    )}
                    onclick={() => toggleSelectedTag(t)}
                >{t}</div>
            ))}
        </div>
        
        <div class="px-6 mt-3">
            <TextInput
                value={search.value}
                placeholder="Cari..."
                class="bg-white/20"
                text="sm"
                oninput={v => search.value = v}
            />
        </div>
        
        <div class="flex-1 flex flex-col gap-2 px-6 py-2 mt-2 mb-4 overflow-auto">
            {foreach(filteredReseps, r => (
                <ResepItem
                    data={r}
                    onEdit={() => startEdit(r)}
                    onRemove={() => remove(r)}
                    onSelect={() => show(r)}
                />
            ))}
            
            <Button onclick={startAdd}>Tambah</Button>
        </div>
        
        {inputVisible.value && (
            <ResepInput
                name={inputName.value}
                bahans={inputBahans.value}
                tags={inputTags.value}
                content={inputContent.value}
                onCancel={cancel}
                onSave={save}
                readonly={inputReadonly.value}
            />
        )}
    </div>
}

function ResepItem(props: { data: ResepData, onRemove?: () => void, onEdit?: () => void, onSelect?: () => void }) {
    const expanded = state(false)
    
    return <div
        class="px-2 py-2 bg-white/80 active:bg-white/60 rounded-lg shadow-lg"
        onclick={props.onSelect}
    >
        <div class="flex items-center gap-2">
            <IconButton
                icon="icon-[mingcute--right-line]"
                class={twMerge(
                    "text-xl transition-transform",
                    expanded.value ? "rotate-90" : ""
                )}
                onclick={stop(() => expanded.value = !expanded.value)}
            />
            
            <span>{props.data.name}</span>
            
            <div class="flex-1"/>
            
            <IconButton
                onclick={stop(props.onRemove)}
                icon="icon-[material-symbols--delete]"
            />
            
            <IconButton
                onclick={stop(props.onEdit)}
                icon="icon-[material-symbols--edit]"
            />
        </div>
        
        {expanded.value && (
            <div
                class="flex flex-col text-sm px-2 my-2"
            >
                <span class="font-bold">Bahan :</span>
                {foreach(props.data.bahans, b => (
                    <div class="ml-2 flex gap-1 text-xs">
                        <span>-</span>
                        <span>{b}</span>
                    </div>
                ))}
                
                {props.data.tags.length > 0 && (
                    <div class="flex gap-1 mt-2">
                        {foreach(props.data.tags, t => (
                            <div class="bg-pink-400 text-white font-bold text-xs px-2 py-1 rounded-full flex-wrap">{t}</div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
}

function ResepInput(props: {
    readonly?: boolean
    name?: string
    bahans?: string[]
    tags?: string[]
    content?: any
    onCancel?: () => void,
    onSave?: (name: string, bahans: string[], tags: string[], content: any) => void,
}) {
    let editorEl: HTMLDivElement
    let quill: Quill
    
    const name = state(props.name ?? "")
    const bahans = state(props.bahans?.join(", ") ?? "")
    const tags = state(props.tags?.join(", ") ?? "")
    
    function save() {
        const splitBahans = bahans.value.split(",").map(x => x.split("\n")).flatMap(x => x).map(x => x.trim()).filter(x => !!x)
        const splitTags = tags.value.split(",").map(x => x.split("\n")).flatMap(x => x).map(x => x.trim()).filter(x => !!x)
        
        props.onSave?.(name.value, splitBahans, splitTags, quill.getContents())
    }
    
    function cancel() {
        props.onCancel?.()
    }
    
    async function delay(ms: number) {
        return new Promise((res) => {
            setTimeout(res, ms)
        })
    }
    
    onMount(async () => {
        await delay(0)
        
        quill = new Quill(editorEl, {
            theme: "snow",
            readOnly: props.readonly ?? false,
            modules: {
                toolbar: "#toolbar",
            }
        })
        
        if (props.content) {
            quill.setContents(props.content)
        }
    })
    
    return <div
        class="fixed inset-0 h-screen from-fuchsia-200 via-fuchsia-100 to-purple-300 bg-gradient-to-b flex flex-col z-10 overflow-y-auto"
    >
        <div class="flex flex-col flex-1 mb-10">
            {!(props.readonly ?? false) && (
                <div class="flex flex-col">
                    <TextInput
                        noStyle={true}
                        text="sm"
                        value={name.value}
                        placeholder="Nama"
                        oninput={v => name.value = v}
                    />
                    
                    <div class="h-[1px] bg-fuchsia-700"/>
                    
                    <TextInput
                        noStyle={true}
                        text="sm"
                        value={bahans.value}
                        placeholder="Bahan-bahan"
                        canGrow={true}
                        oninput={v => bahans.value = v}
                    />
                    
                    <div class="h-[1px] bg-fuchsia-700"/>
                    
                    <TextInput
                        noStyle={true}
                        text="sm"
                        value={tags.value}
                        placeholder="Tags"
                        canGrow={true}
                        oninput={v => tags.value = v}
                    />
                    
                </div>
            )}
            
            <div
                id="toolbar"
                class="flex"
                style={{
                    border: "1px solid var(--color-fuchsia-700)",
                    borderLeft: "none",
                    borderRight: "none",
                }}
            >
                {(props.readonly ?? false) ? (
                    <div>{props.name}</div>
                ) : (
                    <>
                        <select class="ql-header">
                            <option value="1"></option>
                            <option value="2"></option>
                            <option selected></option>
                        </select>
                        
                        <button class="ql-bold"></button>
                        <button class="ql-italic"></button>
                        <button class="ql-underline"></button>
                        
                        <button class="ql-list" value="ordered"></button>
                        <button class="ql-list" value="bullet"></button>
                    </>
                )}
            </div>
            <div class="flex-1" ref={e => editorEl = e} />
        </div>
        
        <div class="fixed bottom-0 left-0 right-0 flex border-t border-fuchsia-700 z-10 bg-purple-300">
            <IconButton
                class="flex-1 py-2"
                icon="icon-[material-symbols--close] text-xl"
                onclick={cancel}
            />
            
            {!(props.readonly ?? false) && (
                <IconButton
                    class="flex-1 py-2"
                    icon="icon-[material-symbols--check] text-xl"
                    onclick={save}
                />
            )}
        </div>
    </div>
}