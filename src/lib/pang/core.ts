import { ContextOwner, getContextOwner, popContextOwner, pushContextOwner } from "./context.js"
import { baseNodeEvents, mappedEvents } from "./events.js"
import { Lifecycle, popLifecycleOwner, pushLifecycleOwner } from "./lifecycle.js"
import {
    Effect,
    effectEmpty,
    effectInternal,
    isObs,
    noDeps,
    noEffects,
    popDeps,
    popEffects,
    pushDeps,
    pushEffects
} from "./reactive.js"
import { createMarker, createRawHtmlElement, createTextElement, cretateElement, isBrowser } from "./render.js"
import { runTransition } from "./transition.js"

export class ElNode implements PNode {
    readonly tagName: string
    private el!: PRenderElement
    children: PNode[] = []
    
    private effect!: Effect
    private parentEffect?: Effect
    
    private transition: Transition | null = null
    
    // Init field
    private attrs: Record<string, MayFn<unknown>> | null
    private styleId: string | null = null
    
    private eventListeners = new Map<string, any | null>()
    
    constructor(tagName: string, attrs: Record<string, MayFn<unknown>> | null, children: MayFn<PElement>[] | null) {
        this.tagName = tagName
        this.attrs = attrs
        
        if (children) {
            this.children.push(...createChildren(children))
        }
    }
    
    attachStyleId(id: string) {
        this.styleId = id
        
        for (const c of this.children) {
            c.attachStyleId(id)
        }
    }
    
    private init(el: PRenderElement, parentEffect: Effect) {
        this.el = el
        this.effect = effectEmpty()
        
        this.parentEffect = parentEffect
        parentEffect.addChild(this.effect)
        
        if (this.attrs) {
            this.initAttrs(this.attrs)
        }
        
        if (this.styleId) {
            this.el.classList.add(this.styleId)
        }
    }
    
    mount(parent: PRenderElement, before: PRenderElement | null, parentEffect: Effect) {
        this.init(cretateElement(this.tagName), parentEffect)
        
        for (const child of this.children) {
            child.mount(this.el, null, this.effect)
        }
        
        parent.insertBefore(this.el, before)
        
        if (this.transition) {
            setTimeout(this.doInTransition.bind(this), 0)
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        const el = parent.childNodes[index]
        
        if (!(el instanceof Element)) {
            hydrationError(`${el} is not an element`)
        }
        
        if (this.tagName !== el.localName) {
            hydrationError(`tag mismatch, node is ${this.tagName} but got ${el.localName} in DOM`)
        }
        
        let childIndex = 0
        
        for (const child of this.children) {
            if (childIndex >= el.childNodes.length) {
                hydrationError(`end of child nodes but need more`)
            }
            
            const consume = child.hydrate(el, childIndex, parentEffect)
            childIndex += consume
        }
        
        if (childIndex < el.childNodes.length) {
            console.log(el.childNodes[childIndex])
            hydrationError(`unprocessed child node : ${el.childNodes[childIndex]}`)
        }
        
        this.init(el as any, parentEffect)
        
        return 1
    }
    
    async outTransition() {
        const promises: Promise<void>[] = []
        
        if (this.transition) {
            promises.push(this.doOutTransition())
        }
        
        for (const child of this.children) {
            promises.push(child.outTransition())
        }
        
        await Promise.all(promises)
    }
    
    dispose() {
        this.parentEffect?.removeChild(this.effect)
        this.effect.dispose()
        
        for (const child of this.children) {
            child.dispose()
        }
        
        this.el.remove()
    }
    
    print() {
        return `${this.tagName} ${this.el.getAttribute('class')}`
    }
    
    private async doInTransition() {
        if (!this.transition) return
        
        if (isBrowser) {
            await runTransition(this.el as any, this.transition, 'in')
        }
    }
    
    private async doOutTransition() {
        if (!this.transition) return
        
        if (isBrowser) {
            await runTransition(this.el as any, this.transition, 'out')
        }
    }
    
    private setAttr(key: string, value: any) {
        if (value === undefined) {
            this.el.removeAttribute(key)
        }
        // Set style object
        else if (this.el instanceof HTMLElement && key === "style" && typeof value === "object") {
            for (const k in value) {
                (this.el.style as any)[k] = value[k]
            }
        }
        else if (typeof value === 'boolean') {
            if (value) {
                this.el.setAttribute(key, "")
            }
            else {
                this.el.removeAttribute(key)
            }
        }
        else {
            // HACK: Why setting `value` attribute on <input/> sometime doesn't work
            // This is a away to get around that
            if (key === 'value' && this.el instanceof HTMLInputElement) {
                this.el.value = value
            }
            else {
                this.el.setAttribute(key, value)
                
                if (key === 'class' && this.styleId) {
                    this.el.classList.add(this.styleId)
                }
            }
        }
    }
    
    private setEvent(key: string, value: any) {
        if (!(this.el instanceof HTMLElement)) return
        
        // Remove `on` from key
        const actualKey = key.substring(2)
        
        // Remove previously attached event listener
        if (this.eventListeners.has(key)) {
            this.el.removeEventListener(actualKey, this.eventListeners.get(key))
            this.eventListeners.delete(key)
        }
        
        // If no listener is provided, immediately return
        // This is effectively just removes previous listeners
        if (!value) {            
            return
        }
        
        let listener: any
        
        if (mappedEvents.includes(key)) {
            listener = (e: any) => value(e.target.value)
        }
        else {
            listener = value
        }
        
        this.el.addEventListener(key.substring(2), listener)
        this.eventListeners.set(key, listener)
    }
    
    private initAttrs(attrs: Record<string, MayFn<unknown>>) {
        for (const key in attrs) {
            const attr = attrs[key]
            
            if (key === 'ref') {
                if (typeof attr === 'function') {
                    pushDeps()
                    const value = attr()
                    const deps = popDeps()!
                    
                    if (deps.size > 0) {
                        const effect = effectInternal(() => {
                            attr()(this.el)
                        }, {
                            deps,
                            runOnInit: false,
                            recalculateDeps: true,
                        })
                        
                        this.effect.addChild(effect)
                    }
                                        
                    value(this.el)
                }
                else {
                    throw new Error("Unreachable : ref attr should be wrapped with arrow")
                }
            }
            else if (key === 'transition') {
                if (typeof attr === 'function') {
                    pushDeps()
                    const value = attr()
                    const deps = popDeps()!
                    
                    if (deps.size > 0) {
                        const effect = effectInternal(() => {
                            this.transition = attr()(this.el)
                        }, {
                            deps,
                            runOnInit: false,
                            recalculateDeps: true,
                        })
                        
                        this.effect.addChild(effect)
                    }
                    
                    this.transition = value(this.el)
                }
                else {
                    throw new Error("Unreachable : transition attr should be wrapped with arrow")
                }
            }
            else if (baseNodeEvents.includes(key)) {
                if (typeof attr === 'function') {
                    pushDeps()
                    const value = attr()
                    const deps = popDeps()!
                    
                    if (deps.size > 0) {
                        const effect = effectInternal(() => {
                            this.setEvent(key, attr())
                        }, {
                            deps,
                            runOnInit: false,
                            recalculateDeps: true,
                        })
                        
                        this.effect.addChild(effect)
                    }
                    
                    this.setEvent(key, value)
                }
                else {
                    throw new Error("Unreachable : event attr should be wrapped with arrow")
                }
            }
            else {
                if (typeof attr === 'function') {
                    pushDeps()
                    const value = attr()
                    const deps = popDeps()!
                    
                    if (deps.size > 0) {
                        const effect = effectInternal(() => {
                            this.setAttr(key, attr())
                        }, {
                            deps,
                            runOnInit: false,
                            recalculateDeps: true,
                        })
                        
                        this.effect.addChild(effect)
                    }
                    
                    this.setAttr(key, value)
                }
                else {
                    throw new Error("Unreachable : attr should be wrapped with arrow")
                }
            }
        }
    }
}

export class PrimitiveNode implements PNode {
    private el!: PRenderText
    private effect?: Effect
    private parentEffect?: Effect
    children = null
    
    constructor(private value: any) {}
    attachStyleId(id: string) {}
    
    private init(el: PRenderText) {
        this.el = el
    }
    
    mount(parent: PRenderElement, before: PRenderElement | null, parentEffect: Effect) {
        this.init(createTextElement(this.value.toString()))
        
        if (this.effect) {
            parentEffect.addChild(this.effect)
            this.parentEffect = parentEffect
        }
        
        parent.insertBefore(this.el, before)
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        let node = parent.childNodes[index]
        
        if (!(node instanceof Text)) {
            hydrationError(`expected text node, but got ${node} in DOM`)
        }
        
        this.init(node as any)
        
        return 1
    }
    
    async outTransition() {}
    
    dispose() {
        if (this.parentEffect && this.effect) {
            this.parentEffect.removeChild(this.effect)
        }
        
        this.effect?.dispose()
        this.el.parentNode?.removeChild(this.el)
    }
    
    print() {
        return `text ${this.el.textContent}`
    }
}

class MarkerNode implements PNode {
    private markerStart = createMarker()
    private markerEnd = createMarker()
    private effect: Effect
    private parentEffect?: Effect
    children: PNode[]
    
    constructor(runner: () => PElement, deps: Set<Obs>, initial: PElement) {
        this.effect = effectInternal(() => {
            this.refreshChild(runner())
        }, {
            deps,
            runOnInit: false,
            recalculateDeps: true,
        })
        
        this.children = toPNodeArray(initial)
    }
    
    attachStyleId(id: string) {
        for (const c of this.children) {
            c.attachStyleId(id)
        }
    }
    
    mount(parent: PRenderElement, before: PRenderElement | null, parentEffect: Effect) {
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        parent.insertBefore(this.markerStart, before)
        parent.insertBefore(this.markerEnd, before)
        
        for (const child of this.children) {
            child.mount(parent, this.markerEnd, this.effect)
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        const markerStart = parent.childNodes[index]
        if (markerStart.nodeType !== Node.COMMENT_NODE) {
            hydrationError(`tag mismatch, expected comment node but got ${markerStart}`)
        }
        
        let consumed = 1
        
        for (const child of this.children) {
            consumed += child.hydrate(parent, index + consumed, this.effect)
        }
        
        const markerEnd = parent.childNodes[index + consumed]
        if (markerEnd.nodeType !== Node.COMMENT_NODE) {
            hydrationError(`tag mismatch, expected comment node but got ${markerEnd}`)
        }
        
        consumed++
        
        this.markerStart = markerStart as any
        this.markerEnd = markerEnd as any
        
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        return consumed
    }
    
    async outTransition() {
        await Promise.all(this.children.map(x => x.outTransition()))
    }
    
    dispose() {
        this.parentEffect?.removeChild(this.effect)
        
        this.effect.dispose()
        
        for (const child of this.children) {
            child.dispose()
        }
        
        this.markerStart.remove()
        this.markerEnd.remove()
    }
    
    print() {
        return 'marker'
    }
    
    private refreshChild(child: PElement) {
        for (const child of this.children) {
            child.dispose()
        }
        
        this.children = toPNodeArray(child)
        const parent = this.markerEnd.parentNode
        
        if (parent) {
            for (const child of this.children) {
                child.mount(parent, this.markerEnd, this.effect)
            }
        }
    }
}

class ForNode implements PNode {
    private each: any[] = []
    private prevEach: any[] = []
    private effect = effectEmpty()
    private parentEffect?: Effect
    private eachEffect: Effect | null = null
    private childFn: (item: any, index: number) => PElement
    private $children: PNode[][] = []
    
    private marker = createMarker()
    private styleId?: string
    
    private contextOwner?: ContextOwner
    private firstRender = true
    
    constructor(attrs: { each: MayFn<MaybeObs<readonly any[] | number>> }, childFn: (item: any, index: number) => PElement) {
        this.childFn = childFn
        const each = attrs.each
        
        if (typeof each === 'function') {
            pushDeps()
            const eachValue = each()
            const deps = popDeps()!
            
            if (deps.size > 0) {
                const effect = effectInternal(() => {
                    this.refreshEach(each())
                }, {
                    deps,
                    runOnInit: false,
                    recalculateDeps: true,
                })
                
                this.effect.addChild(effect)
            }
            
            this.refreshEach(eachValue)
        }
        else {
            this.refreshEach(each)
        }   
    }
    
    attachStyleId(id: string) {
        this.styleId = id
        
        for (const chs of this.$children) {
            for (const c of chs) {
                c.attachStyleId(id)
            }
        }
    }
    
    mount(parent: PRenderElement, before: PRenderNode | null, parentEffect: Effect) {
        this.contextOwner = getContextOwner()
        
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        parent.insertBefore(this.marker, before ?? null)
        
        for (const children of this.$children) {
            for (const child of children) {
                child.mount(parent, this.marker, this.effect)
            }
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 1
    }
    
    async outTransition() {
        const promises: Promise<void>[] = []
        
        for (const children of this.$children) {
            for (const child of children) {
                promises.push(child.outTransition())
            }
        }
        
        await Promise.all(promises)
    }
    
    dispose() {
        this.parentEffect?.removeChild(this.effect)
        this.effect.dispose()
        
        for (const children of this.$children) {
            for (const child of children) {
                child.dispose()
            }
        }
        
        this.marker.remove()
    }
    
    get children() {
        return this.$children.flatMap(x => x)
    }
    
    print() {
        return 'For'
    }
    
    private refreshEach(each: MaybeObs<readonly any[] | number>) {        
        if (isObs(each)) {
            pushDeps()
            
            this.prevEach = [...this.each]
            const value = each.value
            this.each = typeof value === 'number' ? Array.from(Array(value).keys()) : [...value]
            
            popDeps()
            
            if (this.eachEffect) {
                this.effect.removeChild(this.eachEffect)
                this.eachEffect.dispose()
            }
            
            const effect = effectInternal(() => {
                this.prevEach = [...this.each]
                const value = each.value
                this.each = typeof value === 'number' ? Array.from(Array(value).keys()) : [...value]
                this.refreshChildren()
            }, {
                deps: new Set([each]),
                runOnInit: false,
                recalculateDeps: false,
            })
            
            this.eachEffect = effect
            this.effect.addChild(effect)
        }
        else {
            this.prevEach = [...this.each]
            
            pushDeps()
            this.each = typeof each === 'number' ? Array.from(Array(each).keys()) : [...each]
            const deps = popDeps()!
            
            if (deps.size > 0) {
                if (this.eachEffect) {
                    this.effect.removeChild(this.eachEffect)
                    this.eachEffect.dispose()
                }
                
                const effect = effectInternal(() => {
                    this.prevEach = [...this.each]
                    this.each = typeof each === 'number' ? Array.from(Array(each).keys()) : [...each]
                    this.refreshChildren()
                }, {
                    deps: new Set([...deps]),
                    runOnInit: false,
                    recalculateDeps: false,
                })
                
                this.eachEffect = effect
                this.effect.addChild(effect)
            }
        }
        
        this.refreshChildren()
    }
    
    private refreshChildren() {
        const parent = this.marker.parentNode
        let newChildren: PNode[]
        
        for (let a = 0; a < this.each.length; a++) {
            if (a < this.prevEach.length) {
                if (this.prevEach[a] === this.each[a]) {
                    // Gak perlu ngapa-ngapain
                }
                else {
                    const oldChildren = this.$children[a]
                    
                    for (const child of oldChildren) {
                        child.outTransition().then(() => {
                            child.dispose()
                        })
                    }
                    
                    newChildren = toPNodeArray(this.childFn(this.each[a], a))
                    this.$children[a] = newChildren
                    
                    if (this.styleId) {
                        for (const c of newChildren) {
                            c.attachStyleId(this.styleId)
                        }
                    }
                    
                    if (parent) {
                        if (!this.firstRender) pushContextOwner(this.contextOwner)
                        
                        for (const child of newChildren) {
                            child.mount(parent, this.marker, this.effect)
                        }
                        
                        if (!this.firstRender) popContextOwner()
                    }
                }
            }
            else {
                newChildren = toPNodeArray(this.childFn(this.each[a], a))
                this.$children.push(newChildren)
                    
                if (this.styleId) {
                    for (const c of newChildren) {
                        c.attachStyleId(this.styleId)
                    }
                }
                
                if (parent) {
                    if (!this.firstRender) pushContextOwner(this.contextOwner)
                    
                    for (const child of newChildren) {
                        child.mount(parent, this.marker, this.effect)
                    }
                        
                    if (!this.firstRender) popContextOwner()
                }
            }
        }
        
        for (let a = this.prevEach.length - 1; a >= this.each.length; a--) {
            const oldChildren = this.$children[a]
                    
            for (const child of oldChildren) {
                child.outTransition().then(() => {
                    child.dispose()
                })
            }
            
            this.$children.splice(a, 1)
        }
        
        this.firstRender = false
    }
}

class IfBranchNode implements PNode {
    readonly type: 'if' | 'elseif' | 'else'
    readonly cond: MayFn<any> | null
    readonly $children: MayFn<PElement>[] | null
    
    constructor(type: 'if' | 'elseif' | 'else', cond: MayFn<any> | null, children: MayFn<PElement>[] | null) {
        this.type = type
        this.cond = cond
        this.$children = children
    }
    
    attachStyleId(id: string) {}
    mount(parent: PParentNode, before?: PRenderNode | null | undefined) {}
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 0
    }
    async outTransition() {}
    dispose() {}
    children = null
    print() { return '' }
}

type IfBranch = {
    index: number
    rawCond: MayFn<any> | null
    rawChildren: MayFn<PElement>[] | null
    
    condValue: any
    condHasCalled: boolean
    effect?: Effect
}

class IfNode implements PNode {    
    private branches: IfBranch[] = []
    
    private curBranchIndex = -1
    private curBranch: IfBranch | null = null
    children: PNode[] = []
    
    private marker = createMarker()
    private effect: Effect
    private parentEffect?: Effect
    
    private styleId?: string
    private contextOwner?: ContextOwner
    private firstRender = true
    
    constructor(cond: MayFn<any> | null, children: MayFn<PElement>[] | null) {        
        this.branches.push({
            index: 0,
            rawCond: cond,
            rawChildren: children,
            condValue: null,
            condHasCalled: false,
        })
        
        this.effect = effectEmpty()
    }
    
    merge(node: IfBranchNode) {
        this.branches.push({
            index: this.branches.length,
            rawCond: node.cond,
            rawChildren: node.$children,
            condValue: null,
            condHasCalled: false,
        })
    }
    
    finalize() {
        this.processBranches()
    }
    
    attachStyleId(id: string) {
        this.styleId = id
        
        for (const c of this.children) {
            c.attachStyleId(id)
        }
    }
    
    mount(parent: PRenderElement, before: PRenderNode | null, parentEffect: Effect) {
        this.contextOwner = getContextOwner()
        
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        parent.insertBefore(this.marker, before ?? null)
        
        for (const child of this.children) {
            child.mount(parent, this.marker, this.curBranch?.effect ?? this.effect)
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 1
    }
    
    async outTransition() {
        await Promise.all(this.children.map(x => x.outTransition()))
    }
    
    dispose() {
        this.parentEffect?.removeChild(this.effect)
        this.effect.dispose()
        
        for (const branch of this.branches) {
            branch.effect?.dispose()
        }
        
        for (const child of this.children) {
            child.dispose()
        }
        
        this.marker.remove()
    }
    
    print() {
        return 'If'
    }
    
    private processBranches() {
        for (const branch of this.branches) {
            if (this.processBranch(branch)) {
                if (this.curBranchIndex !== branch.index) {
                    this.curBranchIndex = branch.index
                    
                    const children = branch.rawChildren ? createChildren(branch.rawChildren) : []
                    
                    this.curBranch = branch
                    this.refreshChildren(children)
                }
                
                this.firstRender = false
                return
            }
        }
        
        this.curBranchIndex = -1
        this.curBranch = null
    }
    
    private processBranch(branch: IfBranch): boolean {
        if (!branch.condHasCalled) {
            branch.condHasCalled = true
            
            if (branch.rawCond) {
                if (typeof branch.rawCond === 'function') {
                    pushDeps()
                    const condValue = branch.rawCond()
                    const deps = popDeps()!
                    
                    if (deps.size > 0) {
                        const effect = effectInternal(() => {
                            const condValue = branch.rawCond()
                            this.setAndObserveBranchCond(condValue, branch, true)
                        }, {
                            deps,
                            runOnInit: false,
                            recalculateDeps: true,
                            shouldDiscard() {
                                return !branch.condValue
                            },
                        })
                        
                        this.effect.addChild(effect)
                        branch.effect = effect
                    }
                    
                    this.setAndObserveBranchCond(condValue, branch, false)
                    return !!branch.condValue
                }
                else {
                    this.setAndObserveBranchCond(branch.rawCond, branch, false)
                    return !!branch.condValue
                }
            }
            else {
                branch.condValue = true
                return true
            }
        }
        else {
            return branch.condValue
        }
    }
    
    private setAndObserveBranchCond(cond: MaybeObs, branch: IfBranch, processChildren: boolean) {
        if (isObs(cond)) {
            pushDeps()
            branch.condValue = !!cond.value
            popDeps()
            
            if (branch.effect) {
                this.effect.removeChild(branch.effect)
                branch.effect.dispose()
            }
            
            const effect = effectInternal(() => {
                branch.condValue = !!cond.value
                this.processBranches()
            }, {
                deps: new Set([cond]),
                runOnInit: false,
                recalculateDeps: false,
            })
            
            branch.effect = effect
            this.effect.addChild(effect)
        }
        else {
            branch.condValue = !!cond
        }
        
        if (processChildren) {
            this.processBranches()
        }
    }
    
    private refreshChildren(newChildren: PNode[]) {
        const parent = this.marker.parentNode
        
        for (const child of this.children) {
            child.outTransition().then(() => {
                child.dispose()
            })
        }
        
        if (this.styleId) {
            for (const c of newChildren) {
                c.attachStyleId(this.styleId)
            }
        }
        
        if (parent) {
            if (!this.firstRender) pushContextOwner(this.contextOwner)
            
            for (const child of newChildren) {
                child.mount(parent, this.marker, this.curBranch?.effect ?? this.effect)
            }
            
            if (!this.firstRender) popContextOwner()
        }
        
        this.children = newChildren
        this.firstRender = false
    }
}

class CompNode implements PNode {
    name: string
    children!: PNode[]
    
    private comp: PComponent
    private attrs: Record<string, MayFn<unknown>> | null
    private rawChildren: MayFn<PElement>[] | null
    
    private lifecycle: Lifecycle = {}
    private effect = effectEmpty()
    private parentEffect?: Effect
    
    constructor(comp: PComponent, attrs: Record<string, MayFn<unknown>> | null, children: MayFn<PElement>[] | null) {
        this.comp = comp
        this.name = comp.name
        this.attrs = attrs
        this.rawChildren = children
    }
    
    attachStyleId(id: string) {}
    
    private init() {
        const computedAttrs = {} as any
        
        for (const key in this.attrs) {
            const attr = this.attrs[key]
            
            if (typeof attr === 'function') {
                Object.defineProperty(computedAttrs, key, { get: attr as any })
            }
            else {
                console.log(this.name, key, attr)
                throw new Error("Unreachable : component prop should be wrapped with arrow")
            }
        }
            
        if (this.rawChildren) {
            computedAttrs['children'] = createChildren(this.rawChildren, true)
        }
        
        pushLifecycleOwner(this.lifecycle)
        {
            pushEffects()
            noDeps()
            
            // @ts-ignore
            const isClassComp = this.comp.prototype && !!this.comp.prototype['render']
            // @ts-ignore
            const childrenNodes = toPNodeArray(isClassComp ? new this.comp(computedAttrs).render() : this.comp(computedAttrs))
            popDeps()
            const effects = popEffects()!
            
            for (const e of effects) {
                this.effect.addChild(e)
            }
            
            const styleNodes: StyleNode[] = []
            const otherNodes: PNode[] = []
            
            for (const c of childrenNodes) {
                if (c instanceof StyleNode) {
                    styleNodes.push(c)
                }
                else {
                    otherNodes.push(c)
                }
            }
            
            if (styleNodes.length > 1) {
                throw new Error("Only one style node is allowed")
            }
            
            if (styleNodes.length > 0) {
                const styleId = styleNodes[0].getId(this.comp)
                
                for (const c of otherNodes) {
                    c.attachStyleId(styleId)
                }
            }
            
            this.children = childrenNodes
        }
        popLifecycleOwner()
    }
    
    mount(parent: PRenderElement, before: PRenderElement | null, parentEffect: Effect) {
        pushContextOwner()
        this.init()
        
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        for (const el of this.children) {
            el.mount(parent, before, this.effect)
        }
        
        popContextOwner()
        this.lifecycle.onMount?.()
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        pushContextOwner()
        this.init()
        
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        let consumed = 0
        
        for (const ch of this.children) {
            consumed += ch.hydrate(parent, index + consumed, this.effect)
        }
        
        popContextOwner()
        this.lifecycle.onMount?.()
        
        return consumed
    }
    
    async outTransition() {
        await Promise.all(this.children.map(x => x.outTransition()))
    }
    
    dispose() {
        this.parentEffect?.removeChild(this.effect)
        this.effect.dispose()
        
        this.lifecycle.onDestroy?.()

        for (const el of this.children) {
            el.dispose()
        }
    }
    
    print() {
        return this.name
    }
}

export class ReplaceableNode implements PNode {
    private marker = createMarker()
    private styleId?: string
    
    private effect = effectEmpty()
    private parentEffect?: Effect
    
    private contextOwner?: ContextOwner
    
    child: PNode | null = null
    
    constructor(child?: PNode | null) {        
        this.child = child ?? null
    }
    
    attachStyleId(id: string) {
        this.styleId = id
        this.child?.attachStyleId(id)
    }
    
    mount(parent: PRenderElement, before: PRenderNode | null, parentEffect: Effect) {
        this.contextOwner = getContextOwner()
        
        parentEffect.addChild(this.effect)
        this.parentEffect = parentEffect
        
        parent.insertBefore(this.marker, before)
        
        if (this.child) {
            this.child.mount(parent, this.marker, this.effect)
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 1
    }
    
    replace(child: PNode | null) {
        if (this.child) {
            this.child.dispose()
        }
        
        if (this.styleId) {
            child?.attachStyleId(this.styleId)
        }
        
        const parent = this.marker.parentNode
        
        if (parent) {
            pushContextOwner(this.contextOwner)
            child?.mount(parent, this.marker, this.effect)
            popContextOwner()
        }
        
        this.child = child
    }
    
    async outTransition() {
        if (this.child) {
            await this.child.outTransition()
        }
    }
    
    dispose() {
        this.parentEffect?.removeChild(this.effect)
        this.effect.dispose()
        
        if (this.child) {
            this.child.dispose()
        }
        
        this.marker.remove()
    }
    
    get children() {
        return this.child ? [this.child] : null
    }
    
    print() {
        return 'Replaceable'
    }
}

export class RawHtmlNode implements PNode {
    private els: PRenderNode[] | null = null
    
    constructor(content: string) {
        this.els = createRawHtmlElement(content)
    }
    
    attachStyleId(id: string) {
        if (this.els) {
            for (const el of this.els) {
                if (el && el instanceof Element) {
                    this.attachStyleIdRec(el, id)
                }
            }
        }
    }
    
    private attachStyleIdRec(el: Element, id: string) {
        el.classList.add(id)
        
        for (const c of el.children) {
            this.attachStyleIdRec(c, id)
        }
    }
    
    mount(parent: PParentNode, before?: PRenderNode | null | undefined) {
        if (this.els) {
            for (const el of this.els) {
                parent.insertBefore(el, before ?? null)
            }
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 1
    }
    
    async outTransition() {}
    
    async dispose() {
        if (this.els) {
            for (const el of this.els) {
                if (el instanceof Element) {
                    el.remove()
                }
                else {
                    el.parentNode?.removeChild(el)
                }
            }
        }
    }
    
    children = null
    
    print() {
        return 'RawHtml'
    }
}

class StyleNode implements PNode {
    static map = new Map<PComponent, Css>()
    static mountCountMap = new Map<string, number>()
        
    private css: MayFn<Css> | null
    private cssValue: Css | null = null
    
    constructor(attrs: Record<string, MayFn<unknown>> | null) {
        this.css = attrs?.['css'] as MayFn<Css> | null
    }
    
    getId(comp: PComponent): string {
        if (!this.css) return ''
        
        if (StyleNode.map.has(comp)) {
            const value = StyleNode.map.get(comp)!
            this.cssValue = value
            return value.id
        }
        
        let css: Css
        
        if (typeof this.css === 'function') {
            css = this.css()
        }
        else {
            css = this.css
        }
        
        StyleNode.map.set(comp, css)
        this.cssValue = css
        
        return css.id
    }
    
    attachStyleId(id: string) {}
    
    mount(parent: PParentNode, before: PRenderNode | null, parentEffect: Effect) {
        if (this.cssValue) {
            if (!StyleNode.mountCountMap.get(this.cssValue.id)) {
                StyleNode.mountCountMap.set(this.cssValue.id, 0)
            }
            
            const mountCount = StyleNode.mountCountMap.get(this.cssValue.id)!
            
            if (mountCount === 0) {
                const style = document.createElement('style')
                style.innerHTML = this.cssValue?.content
                style.setAttribute('data-style-id', this.cssValue.id)
                
                document.head.appendChild(style)
            }
            
            StyleNode.mountCountMap.set(this.cssValue.id, mountCount + 1)
        }
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 1
    }
    
    async outTransition() {}
    
    dispose() {
        if (this.cssValue) {
            const mountCount = StyleNode.mountCountMap.get(this.cssValue.id) ?? 0
            
            if (mountCount <= 1) {
                StyleNode.mountCountMap.delete(this.cssValue.id)
                document.querySelector(`style[data-style-id="${this.cssValue.id}"]`)?.remove()
            }
            else {
                StyleNode.mountCountMap.set(this.cssValue.id, mountCount - 1)
            }
        }
    }
    
    children = null
    
    print() {
        return 'Style'
    }
}

class HtmlElementNode implements PNode {
    private el: Element
    children: readonly PNode[] | null = []
    
    constructor(el: Element) {
        this.el = el
    }
    
    attachStyleId(id: string): void {}
    
    mount(parent: PParentNode, before: PRenderNode | null, parentEffect: Effect): void {
        parent.insertBefore(this.el as any, before)
    }
    
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number {
        return 1
    }
    
    async outTransition() {}
    
    dispose(): void {
        this.el.remove()
    }
    
    print(): string {
        return 'HtmlElement'
    }
}

function createChildren(children: MayFn<PElement>[], allowStyleNode = false): PNode[] {
    const res: PNode[] = []
    let ifNode: IfNode | null = null
    
    function processIfNode() {
        if (ifNode) {
            ifNode.finalize()
            res.push(ifNode)
            ifNode = null
        }
    }
    
    for (let a = 0; a < children.length; a++) {
        const child = children[a]
        
        if (typeof child === 'function') {
            pushDeps()
            const childValue = child()
            const deps = popDeps()!
            
            if (deps.size > 0) {
                processIfNode()
                res.push(new MarkerNode(child, deps, childValue))
            }
            else if (childValue instanceof IfNode) {
                processIfNode()
                ifNode = childValue
            }
            else if (childValue instanceof IfBranchNode) {
                if (childValue.type === 'elseif') {
                    if (!ifNode) {
                        throw new Error("ElseIf harus setelah If")
                    }
                    
                    ifNode.merge(childValue)
                }
                else {
                    if (!ifNode) {
                        throw new Error("Else harus setelah If")
                    }
                    
                    ifNode.merge(childValue)
                }
            }
            else if (childValue instanceof Element) {
                processIfNode()
                res.push(new HtmlElementNode(childValue))
            }
            else {
                processIfNode()
                res.push(...toPNodeArray(childValue))
            }
        }
        else {
            processIfNode()
            res.push(...toPNodeArray(child))
        }
    }
    
    processIfNode()
    
    if (!allowStyleNode) {
        for (const n of res) {
            if (n instanceof StyleNode) {
                throw new Error("Style node must be on component root")
            }
        }
    }
    
    return res
}

function toPNodeArray(el: PElement): PNode[] {
    if (Array.isArray(el)) {
        const arr: PNode[] = []
        
        for (const i of el) {
            arr.push(...toPNodeArray(i))
        }
        
        return arr
    }
    else if (el instanceof Element) {
        return [new HtmlElementNode(el)]
    }
    else if (isPNode(el)) {
        return [el]
    }
    else if (el === null || el === undefined) {
        return []
    }
    else {
        return [new PrimitiveNode(el)]
    }
}

function isPNode(el: any): el is PNode {
    return typeof el === 'object' && !!el && 'mount' in el && 'dispose' in el
}

let prevEl: PNode | null = null

type FnProps<T> = {
    [K in keyof T]: () => T[K]
}

export function render<T extends Record<string, any>>(
    parent: HTMLElement,
    comp: JSX.Component<T>,
    props?: FnProps<T>
) {
    document.querySelectorAll("style[data-style-id]").forEach(i => {
        i.remove()
    })
    
    if (prevEl) {
        prevEl.dispose()
    }
    
    parent.innerHTML = ''    
    
    const rootEffect = effectEmpty()
    
    const el = new CompNode(comp as PComponent, props ?? null, null)
    el.mount(parent as any, null, rootEffect)
    prevEl = el
}

export function renderToElement<T extends Record<string, any>>(
    parent: HTMLElement,
    comp: JSX.Component<T>,
    props: FnProps<T>,
) {
    parent.innerHTML = ''    
    
    const rootEffect = effectEmpty()
    
    const el = new CompNode(comp as PComponent, props ?? null, null)
    el.mount(parent as any, null, rootEffect)
}

export function createPersistentComponent<T extends Record<string, any>>(
    comp: JSX.Component<T>,
    props: FnProps<T>,
    autoMount?: boolean,
): PersistentComponent {
    const el = document.createElement('div')
    el.setAttribute('style', 'display: contents;')
    
    const rootEffect = effectEmpty()
    const node = new CompNode(comp as PComponent, props ?? null, null)
    let mounted = false
    
    if (autoMount ?? true) {
        node.mount(el as any, null, rootEffect)
        mounted = true
    }
    
    return {
        element: el,
        mount() {
            if (!mounted) {
                node.mount(parent as any, null, rootEffect)
                mounted = true
            }
        },
        dispose() {
            node.dispose()
        },
    }
}

export function createCompNode(
    comp: JSX.Component<any>,
    attrs: Record<string, MayFn<unknown>> | null,
    children: MayFn<PElement>[] | null
): PNode {
    return new CompNode(comp as PComponent, attrs, children)
}

export function createTextNode(text: any) {
    return new PrimitiveNode(text.toString())
}

export function html(content: string) {
    return new RawHtmlNode(content)
}

export function printNode(node: PNode) {
    // type NodePrint = {
    //     chs: NodePrint[] | undefined
    //     name: string
    // }
    
    // function go(node: PNode): NodePrint {
    //     const obj: NodePrint = {
    //         name: node.print(),
    //         chs: node.children?.map(x => go(x)),
    //     }
        
    //     return obj
    // }
    
    function go(node: PNode, indent = 0): string {
        let res = ''
        
        for (let a = 0; a < indent * 4; a++) {
            if (a % 4 === 0) {
                res += '|'
            }
            
            res += ' '
        }
        
        res += node.print().slice(0, 50) + "\n"
        
        if (node.children) {
            for (const ch of node.children) {
                res += go(ch, indent + 1)
            }
        }
        
        return res
    }
    
    console.log(go(node))
}

export function foreach<T extends readonly any[], U extends JSX.Element>(each: MaybeObs<T>, render: (item: T[number], index: number) => U): PNode
export function foreach<T extends number, U extends JSX.Element>(each: MaybeObs<T>, render: (index: number) => U): PNode
export function foreach<T extends readonly any[], U extends JSX.Element>(
    each: MaybeObs<T> | MaybeObs<number>,
    render: ((item: T[number], index: number) => U) | ((index: number) => U),
) {
    return new ForNode({ each }, render as any)
}

export function Dynamic<T extends Record<string, any>>(props: { comp: JSX.Component<T> } & T): JSX.Element {
    const { comp, children, ...rest } = props
    return new CompNode(comp as PComponent, rest, children) as any
}

export function For<T extends readonly any[], U extends JSX.Element>(props: {
    each: MaybeObs<T>,
    children: (item: T[number], index: number) => U
}): JSX.Element
export function For<T extends number, U extends JSX.Element>(props: {
    times: MaybeObs<T>,
    children: (index: number) => U
}): JSX.Element
export function For(props: any): JSX.Element {
    return undefined
}

export function If(props: {
    cond: any,
    children?: JSX.Element
}): JSX.Element {
    return undefined
}

export function ElseIf(props: {
    cond: any,
    children?: JSX.Element,
}): JSX.Element {
    return undefined
}

export function Else(props: {
    children?: JSX.Element
}): JSX.Element {
    return undefined
}

export function jsx(
    tag: string | PComponent,
    attributes: { [key: string]: MayFn<unknown> } | null,
    ...children: MayFn<PElement>[]
): PNode | PNode[] {
    let res: PNode | PNode[]
    noEffects()
    
    if (tag === For) {
        res = new ForNode(attributes as any, (children[0] as any)() as any)
    }
    else if (tag === If || tag === '$$If') {
        res = new IfNode((attributes as any)['cond'], children)
    }
    else if (tag === ElseIf || tag === '$$ElseIf') {
        res = new IfBranchNode('elseif', (attributes as any)['cond'], children)
    }
    else if (tag === Else || tag === '$$Else') {
        res = new IfBranchNode('else', null, children)
    }
    else if (tag === jsxFragment) {
        res = createChildren(children, true)
    }
    else if (typeof tag === 'function') {
        res = new CompNode(tag, attributes, children)
    }
    else if (tag === 'style') {
        res = new StyleNode(attributes)
    }
    else if (typeof tag === 'string') {
        res = new ElNode(tag, attributes, children)
    }
    else {
        console.log(tag)
        throw new Error("Unknown tag")
    }
    
    popEffects()
    return res
}

export function jsxFragment() {}

function hydrationError(message: string): never {
    throw new Error(`Hydration error : ${message}`)
}