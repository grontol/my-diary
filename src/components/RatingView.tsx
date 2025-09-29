import { foreach } from "@pang/core.js"
import { onMount } from "@pang/lifecycle.js"
import { derived } from "@pang/reactive.js"
import { twMerge } from "tailwind-merge"

export function RatingView(props: {
    value: number
    onChange?: (value: number) => void
    readonly?: boolean
    size?: "sm" | "md"
    class?: string
}) {
    const size = derived(() => props.size === "sm" ? "text-lg" : "text-3xl")
    
    let container: HTMLDivElement
    
    let left = 0
    let width = 0
    
    let isMouseDown = false
    
    function mouseDown(e: MouseEvent) {
        isMouseDown = true
        refreshValue(e.clientX)
    }
    
    function refreshValue(x: number) {
        props.onChange?.(Math.round((x - left) * 10 / width))
    }
    
    onMount(() => {
        setTimeout(() => {
            const r = container.getBoundingClientRect()
            
            left = r.left
            width = r.width
        }, 0)
    })
    
    return <div
        class={twMerge(
            "flex self-center",
            props.class,
        )}
        ref={v => container = v}
        onmousedown={mouseDown}
    >
        {foreach(5, i => <>
            {(i + 1) * 2 <= props.value ? (
                <span class={`icon-[mdi--star] ${size.value} text-yellow-500`}/>
            ) : i * 2 + 1 <= props.value ? (
                <div class="relative flex">
                    <span
                        class={`icon-[mdi--star] ${size.value} text-yellow-500`}
                        style={{ clipPath: "inset(0 50% 0 0)" }}
                    />
                    
                    <span
                        class={`icon-[mdi--star] ${size.value} text-gray-400 absolute left-0`}
                        style={{ clipPath: "inset(0 0 0 50%)" }}
                    />
                </div>
            ) : (
                <span class={`icon-[mdi--star] ${size.value} text-gray-400`}/>
            )}
        </>)}
    </div>
}