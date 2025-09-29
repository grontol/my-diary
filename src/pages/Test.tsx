import { Button } from "@/components/Button.jsx"
import { onMount } from "@pang/lifecycle.js"
import { state } from "@pang/reactive.js"
import { curtain, fade, scale } from "@pang/transition.js"

export function Test() {
    let el: HTMLDivElement
    
    const visible = state(true)
    
    onMount(() => {
        // console.log("PARENT", el.getBoundingClientRect())
    })
    
    return <div ref={v => el = v} class="p-6">
        <Foo visible={visible.value}/>
        <Button onclick={() => visible.value = !visible.value}>Toggle</Button>
    </div>
}

function Foo(props: { visible: boolean }) {
    let el: HTMLDivElement
    
    onMount(() => {
        // console.log("FOO", el.getBoundingClientRect())
        
        // el.style.height = '0px'
    })
    
    return <>
        {props.visible ? (
            <div
                ref={v => el = v}
                class="bg-red-300 p-8 box-border"
                transition={curtain({ direction: 'vertical' })}
            >FOO</div>
        ) : (
            <div></div>
        )}
    </>
}

/*
<div class="flex">
    <div
        ref={v => el = v}
        class="bg-red-300 p-8 flex-1"
        transition={curtain({ duration: 1000 })}
    >FOO</div>
    <div
        class="flex-1"
    >BAR</div>
</div>

<div class="flex">
    <div class="wrapper">
        <div
            ref={v => el = v}
            class="bg-red-300 p-8 flex-1"
            transition={curtain({ duration: 1000 })}
        >FOO</div>
    </div>
    <div
        class="flex-1"
    >BAR</div>
</div>
*/