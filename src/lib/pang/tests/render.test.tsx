import "@pang/jsx.js";
import { effectEmpty, flushPendingEffects, state } from "@pang/reactive.js";
import { ServerRenderElement } from "@pang/render.js";
import { describe, expect, it } from "vitest";

describe('Render test', () => {
    it('Basic effect', () => {
        const count = state(0)
        
        const el1 = createRoot(
            <div>{count.value}</div>
        )
        
        const el2 = createRoot(
            <div>1</div>
        )
        
        count.value++
        flushPendingEffects()
        
        expect(el1.isEqualTo(el2)).toBe(true)
    })
    
    it('Dynamic class', () => {
        const isBlue = state(false)
        
        const el = createRoot(
            <div class={isBlue.value ? "blue" : "red"}></div>
        )
        
        const el1 = createRoot(
            <div class={"red"}></div>
        )
        
        expect(el.isEqualTo(el1)).toBe(true)
        
        isBlue.value = !isBlue.value
        flushPendingEffects()
        
        const el2 = createRoot(
            <div class="blue"></div>
        )
        
        expect(el.isEqualTo(el2)).toBe(true)
    })
    
    it('Dynamic text child', () => {
        const name = state('')
        
        const el = createRoot(
            <div>{name.value}</div>
        )
        
        const el1 = createRoot(
            <div>{""}</div>
        )
        
        expect(el.isEqualTo(el1)).toBe(true)
        
        name.value = "Saya"
        flushPendingEffects()
        
        const el2 = createRoot(
            <div>Saya</div>
        )
        
        expect(el.isEqualTo(el2)).toBe(true)
    })
    
    it('If', async () => {
        const count = state(0)
        
        const el = createRoot(
            <div>
                {count.value % 2 === 0 ? (
                    <div>Genap</div>
                ) : null}
            </div>
        )
        
        const el1 = createRoot(
            <div>
                <div>Genap</div>
            </div>
        )
        
        expect(el.isEqualTo(el1)).toBe(true)
        
        count.value++
        await delay(0)
        
        const el2 = createRoot(
            <div></div>
        )
        
        expect(el.isEqualTo(el2)).toBe(true)
    })
})

function createRoot(el: JSX.Element): PRenderElement {
    const rootEl = new ServerRenderElement('div')
    rootEl.classList.add('root')
    ;(el as PNode).mount(rootEl, null, effectEmpty())
    
    return rootEl
}

async function delay(time: number) {
    return new Promise(res => {
        setTimeout(res, time)
    })
}