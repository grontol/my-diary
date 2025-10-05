import { effect } from "@pang/reactive.js"
import { twMerge } from "tailwind-merge"

export function TextInput(props: {
    value: string
    oninput?: (v: string) => void
    placeholder?: string
    canGrow?: boolean
    noStyle?: boolean
    text?: "md" | "sm" | "lg"
    type?: string
    class?: string
}) {
    let textArea: HTMLTextAreaElement | null = null
    
    function refreshHeight() {
        if (props.canGrow && textArea) {
            if (props.value) {
                const borderHeight = props.noStyle ? 0 : 2
                
                textArea.style.height = ""
                textArea.style.height = `${Math.min(textArea.scrollHeight + borderHeight, window.innerHeight * 0.3)}px`
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
                class={twMerge(
                    "outline-none px-3 py-1",
                    props.noStyle ? "py-2" : "bg-white/60 border border-fuchsia-600 rounded-lg",
                    props.text === "sm" ? "text-sm" : props.text === "lg" ? "text-lg" : "text-base",
                    props.class,
                )}
                oninput={props.oninput}
                placeholder={props.placeholder}
                rows="1"
            >{props.value}</textarea>
        ) : (
            <input
                type={props.type}
                class={twMerge(
                    "outline-none px-3 py-1",
                    props.noStyle ? "py-2" : "bg-white/60 border border-fuchsia-600 rounded-lg",
                    props.text === "sm" ? "text-sm" : props.text === "lg" ? "text-lg" : "text-base",
                    props.class,
                )}
                value={props.value}
                oninput={props.oninput}
                placeholder={props.placeholder}
            />
        )}
        
    </div>
}