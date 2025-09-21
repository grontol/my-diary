import { IconButton } from "@/components/Button.jsx";
import { ActorData, actorGetAll } from "@/data/actor.js";
import { foreach } from "@pang/core.js";
import { onMount } from "@pang/lifecycle.js";
import { derived, state } from "@pang/reactive.js";
import Quill from "quill";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";

export function DiaryInput(props: {
    onCancel?: () => void,
    onSave?: (actor: string, content: any) => void,
    readonly?: boolean,
    actor?: string,
    content?: any,
}) {
    const actors = state<ActorData[]>([])
    const selectedActor = state(props.actor ?? "")
    
    const actor = derived(() => actors.value.find(x => x.id === props.actor) ?? null)
    
    let editorEl: HTMLDivElement
    let quill: Quill
    
    function cancel() {
        props.onCancel?.()
    }

    function save() {
        props.onSave?.(selectedActor.value, quill.getContents())
    }
    
    function actorChanged(e: Event) {
        // @ts-ignore
        selectedActor.value = e.target?.value ?? ''
    }
    
    onMount(async () => {
        actors.value = await actorGetAll()
        
        if (actors.value.length > 0 && !selectedActor.value) {
            selectedActor.value = actors.value[0].id
        }
        
        quill = new Quill(editorEl, {
            theme: "snow",
            readOnly: props.readonly ?? false,
            modules: {
                // toolbar: [
                //     [{ header: [1, 2, false] }, 'bold', 'italic', 'underline', { 'list': 'ordered'}, { 'list': 'bullet' }],
                // ],
                toolbar: "#toolbar"
            },
        })
        
        if (props.content) {
            quill.setContents(props.content)
        }
    })
    
    return <div
        class="fixed inset-0 from-fuchsia-200 via-fuchsia-100 to-purple-300 bg-gradient-to-b flex flex-col z-10 overflow-y-auto"
    >
        <div class="flex flex-col flex-1">
            {!(props.readonly ?? false) && (
                <div class="flex flex-col">
                    <select
                        class="px-3 py-2 outline-none mr-2"
                        onchange={actorChanged}
                    >
                        {foreach(actors, a => (
                            <option value={a.id} selected={selectedActor.value === a.id}>{a.name} {a.emoji}</option>
                        ))}
                    </select>
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
                    <div>{actor.value?.name} {actor.value?.emoji}</div>
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
            <div ref={e => editorEl = e} />
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