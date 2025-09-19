import { effect } from "@pang/reactive.js"

export function TextInput(props: {
    value: string
    oninput?: (v: string) => void
    placeholder?: string
    canGrow?: boolean
}) {
    let textArea: HTMLTextAreaElement | null = null
    
    function refreshHeight() {
        if (props.canGrow && textArea) {
            if (props.value) {
                textArea.style.height = ""
                textArea.style.height = `${Math.min(textArea.scrollHeight + 2, window.innerHeight * 0.3)}px`
            }
            else {
                textArea.style.height = "unset"
            }
        }
    }
    
    effect(() => {
        props.value;
        
        if (textArea) {
            textArea.value = props.value
        }
        
        setTimeout(() => {
            refreshHeight()
        }, 0)
    })
    
    return <div class="flex flex-col">
        {props.canGrow ? (
            <textarea
                ref={x => textArea = x}
                class="bg-white/60 border border-fuchsia-600 rounded-lg outline-none px-3 py-1"
                oninput={props.oninput}
                placeholder={props.placeholder}
                rows="1"
            >{props.value}</textarea>
        ) : (
            <input
                class="bg-white/60 border border-fuchsia-600 rounded-lg outline-none px-3 py-1"
                value={props.value}
                oninput={props.oninput}
                placeholder={props.placeholder}
            />
        )}
        
    </div>
}