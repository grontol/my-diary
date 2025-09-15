type ContextKey = string | symbol

export type Context<T> = {
    set: (value: T) => void
    get: () => T | undefined
}

export function createContext<T>(): Context<T> {
    const key = Symbol()
    
    return {
        set(value) {
            if (contextStack.length === 0) return
    
            const owner = contextStack[contextStack.length - 1]
            owner.add(key, value)
        },
        get() {
            if (contextStack.length === 0) return
    
            const owner = contextStack[contextStack.length - 1]
            
            return owner.parent?.get(key)
        },
    }
}

export function pushContextOwner(prevOwner?: ContextOwner) {
    const owner = prevOwner ?? new ContextOwner()
    
    if (contextStack.length > 0) {
        owner.parent = contextStack[contextStack.length - 1]
    }
    
    contextStack.push(owner)
}

export function popContextOwner() {
    contextStack.pop()
}

export function getContextOwner(): ContextOwner | undefined {
    return contextStack[contextStack.length - 1]
}

const contextStack: ContextOwner[] = []

export class ContextOwner {
    private contexts = new Map<string | symbol, any>()
    parent?: ContextOwner
    
    add(key: ContextKey, value: any) {
        this.contexts.set(key, value)
    }
    
    get(key: ContextKey): any | undefined {
        if (this.contexts.has(key)) {
            return this.contexts.get(key)
        }
        
        return this.parent?.get(key)
    }
}