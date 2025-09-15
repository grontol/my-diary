import { describe, expect, it, vi } from "vitest"
import { derived, effect, flushPendingEffects, state } from "../reactive.js"

describe('Reactive test', () => {
    it('state simple effect', () => {
        const count = state(0)
        const out: number[] = []
        
        effect(() => {
            out.push(count.value)
        })
        
        count.value++
        count.value++
        
        flushPendingEffects()
        expect(out).toStrictEqual([0, 2])
    })
    
    it('state change same value', () => {
        const count = state(0)
        const out: number[] = []
        
        effect(() => {
            out.push(count.value)
        })
        
        count.value = 1
        count.value = 1
        
        flushPendingEffects()
        expect(out).toStrictEqual([0, 1])
    })
    
    it('derived simple effect', () => {
        const count = state(0)
        const double = derived(() => count.value * 2)
        const out: number[] = []
        
        effect(() => {
            out.push(double.value)
        })
        
        count.value++
        count.value++
        
        flushPendingEffects()
        expect(out).toStrictEqual([0, 4])
    })
    
    it('effect explicit dependencies', () => {
        const count = state(0)
        const name = state("Saya")
        const out: any[] = []
        
        effect(() => {
            out.push(count.value, name.value)
        }, [count])
        
        count.value++
        flushPendingEffects()
        count.value++
        flushPendingEffects()
      
        expect(out).toStrictEqual([
            0, "Saya",
            1, "Saya",
            2, "Saya",
        ])
    })
    
    it('effect explicit multiple dependencies', () => {
        const count = state(0)
        const name = state("Saya")
        const out: any[] = []
        
        effect(() => {
            out.push(count.value, name.value)
        }, [count, name])
        
        count.value++
        flushPendingEffects()
        name.value = "Dia"
        flushPendingEffects()
        
        expect(out).toStrictEqual([
            0, "Saya",
            1, "Saya",
            1, "Dia",
        ])
    })
    
    it('effect implicit dependencies', () => {
        const count = state(0)
        const name = state("Saya")
        const out: any[] = []
        
        effect(() => {
            out.push(count.value, name.value)
        })
        
        count.value++
        flushPendingEffects()
        name.value = "Dia"
        flushPendingEffects()
        
        expect(out).toStrictEqual([
            0, "Saya",
            1, "Saya",
            1, "Dia",
        ])
    })
    
    it('array state (push, splice)', () => {
        const names = state<string[]>([])
        const out: any[] = []
        
        effect(() => {
            out.push("Changed", [...names.value])
        })
        
        names.value.push("Saya")
        flushPendingEffects()
        names.value.push("Dia")
        flushPendingEffects()
        names.value.splice(1, 1)
        flushPendingEffects()
        
        expect(out).toStrictEqual([
            "Changed", [],
            "Changed", ["Saya"],
            "Changed", ["Saya", "Dia"],
            "Changed", ["Saya"],
        ])
    })
    
    it('state inside condition', () => {
        const mock = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        
        const count = state(0)
        const name = state('')
        
        effect(() => {
            if (count.value % 2 === 1) {
                console.log(name.value)
            }
        })
        
        count.value++
        flushPendingEffects()
        name.value = 'Samain'
        flushPendingEffects()
        
        expect(mock).toHaveBeenCalledTimes(2)
    })
})