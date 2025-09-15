import { onMount } from "@pang/lifecycle.js"
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import Quill from "quill"
import { Button } from "@/components/Button.jsx";
import { ActorData, actorGetAll } from "@/data/actor.js";
import { state } from "@pang/reactive.js";
import { foreach } from "@pang/core.js";

const x = {"ops":[{"insert":"sd"},{"attributes":{"bold":true},"insert":" asdasd "},{"attributes":{"italic":true,"bold":true},"insert":"asdasd"},{"insert":"\n"}]}

export function DiaryInput(props: {
    onCancel?: () => void,
    onSave?: (actor: string, content: any) => void,
}) {
    const actors = state<ActorData[]>([])
    const selectedActor = state("")
    
    let editorEl: HTMLDivElement
    let quill: Quill

    onMount(async () => {
        actors.value = await actorGetAll()
        
        quill = new Quill(editorEl, {
            theme: "snow",
            modules: {
                toolbar: [
                    [{ header: [1, 2, false] }],
                    ['bold', 'italic', 'underline'],
                ],
            },
            placeholder: 'Compose an epic...',
        })
    })
    
    function cancel() {
        props.onCancel?.()
    }

    function save() {
        props.onSave?.(selectedActor.value, quill.getContents())
    }
    
    function get() {
        quill.setContents(x)
        // console.log(JSON.stringify(quill.getContents()))
    }
    
    return <div
        class="fixed inset-0 bg-white flex flex-col"
    >
        <div>Diary Input</div>
        
        <div class="flex">
            <Button onclick={cancel}>Batal</Button>
            <Button onclick={save}>Simpan</Button>
            <Button onclick={get}>Get</Button>
        </div>
        
        <span>Actor</span>
        <select>
            {foreach(actors, a => (
                <option>{a.name}</option>
            ))}
        </select>
        
        <div class="flex-1 mt-5">
            <div ref={e => editorEl = e} />
        </div>
    </div>
}