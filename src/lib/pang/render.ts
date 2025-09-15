export const isBrowser = !(typeof window === 'undefined')

export function cretateElement(tag: string): PRenderElement {
    if (isBrowser) {
        return document.createElement(tag) as any
    }
    else {
        return new ServerRenderElement(tag)
    }
}

export function createTextElement(text: string | number): PRenderText {
    if (isBrowser) {
        return document.createTextNode(text.toString()) as any
    }
    else {
        return new ServerRenderText(text.toString())
    }
}

export function createMarker(name = ''): PRenderNode {
    if (isBrowser) {
        return document.createComment(name) as any
    }
    else {
        return new ServerRenderMarker()
    }
}

export function createRawHtmlElement(inner: string): PRenderNode[] {
    if (isBrowser) {
        const root = document.createElement('div')
        root.innerHTML = inner
        return [...root.childNodes] as any
    }
    else {
        throw new Error("Not implemented")
    }
}

export function isRenderElement(node: PRenderNode): node is PRenderElement {
    if (isBrowser) {
        return node instanceof Element
    }
    else {
        return node instanceof ServerRenderElement
    }
}

export class ServerRenderElement implements PRenderElement {
    tagName: string
    classList = new Set<string>()
    parentNode: PParentNode | null = null
    
    childNodes = new RenderNodeCollection()
    children = new RenderElementCollection(this.childNodes)
    attributes = new Map<string, string>()
    
    constructor(tag: string) {
        this.tagName = tag
    }
    
    insertBefore(el: PRenderNode, before: PRenderNode | null): void {
        el.parentNode = this
        
        if (before) {
            const index = this.childNodes.indexOf(before)
            
            if (index >= 0) {
                this.childNodes.splice(index, 0, el)
            }
        }
        else {
            this.childNodes.push(el)
        }
    }
    
    remove(): void {
        if (this.parentNode) {
            this.parentNode.removeChild(this)
        }
    }
    
    removeChild<T extends PRenderNode>(child: T): T {
        const index = this.childNodes.indexOf(child)
            
        if (index >= 0) {
            this.childNodes.splice(index, 1)
        }
        
        return child
    }
    
    getAttribute(qualifiedName: string): string | null {
        if (qualifiedName === 'class') {
            return [...this.classList].join(' ')
        }
        else {
            return this.attributes.get(qualifiedName) ?? null
        }
    }
    
    setAttribute(qualifiedName: string, value: string): void {
        if (qualifiedName === 'class') {
            this.classList.clear()
            
            for (const c of value.split(' ')) {
                this.classList.add(c)
            }
        }
        else {
            this.attributes.set(qualifiedName, value)
        }
    }
    
    removeAttribute(qualifiedName: string): void {
        if (qualifiedName === 'class') {
            this.classList.clear()
        }
        else {
            this.attributes.delete(qualifiedName)
        }
    }
    
    isEqualTo(other: PRenderNode): boolean {
        if (!(other instanceof ServerRenderElement)) return false
        if (this.tagName !== other.tagName) return false
        
        const thisClass = [...this.classList].sort()
        const otherClass = [...other.classList].sort()
        
        if (thisClass.length !== otherClass.length) return false
        
        for (let a = 0; a < thisClass.length; a++) {
            if (thisClass[a] !== otherClass[a]) return false
        }
        
        const thisAttrs = [...this.attributes.keys()].sort()
        const otherAttrs = [...other.attributes.keys()].sort()
        
        if (thisAttrs.length !== otherAttrs.length) return false
        
        for (let a = 0; a < thisAttrs.length; a++) {
            if (this.attributes.get(thisAttrs[a]) !== other.attributes.get(otherAttrs[a])) return false
        }
        
        const thisChildren = this.childNodes.filter(x => !(x instanceof ServerRenderMarker))
        const otherChildren = other.childNodes.filter(x => !(x instanceof ServerRenderMarker))
        
        if (thisChildren.length !== otherChildren.length) return false
        
        for (let a = 0; a < thisChildren.length; a++) {
            if (!thisChildren[a].isEqualTo(otherChildren[a])) return false
        }
        
        return true
    }
    
    render(): string {
        let res: string[] = []
        
        res.push(`<${this.tagName}`)
        
        if (this.classList.size > 0) {
            res.push(` class="${[...this.classList].join(' ')}"`)
        }
        
        for (const k in this.attributes) {
            res.push(` ${k}="${this.attributes.get(k)}"`)
        }
        
        res.push(">")
        
        if (this.childNodes.length > 0) {
            res.push('\n')
            
            for (const c of this.childNodes) {
                const cText = c.render()
                
                for (const line of cText.split("\n")) {
                    res.push('    ')
                    res.push(line)
                    res.push('\n')
                }
            }
        }
        
        res.push(`</${this.tagName}>`)
        
        return res.join("")
    }
}

class ServerRenderText implements PRenderText {
    textContent: string | null = null
    parentNode: PParentNode | null = null
    
    constructor(text: string) {
        this.textContent = text
    }
    
    remove(): void {
        this.parentNode?.removeChild(this)
    }
    
    isEqualTo(other: PRenderNode): boolean {
        return other instanceof ServerRenderText && this.textContent === other.textContent
    }
    
    render(): string {
        return this.textContent ?? ''
    }
}

class ServerRenderMarker implements PRenderNode {
    parentNode: PParentNode | null = null
    
    remove(): void {
        this.parentNode?.removeChild(this)
    }
    
    isEqualTo(other: PRenderNode): boolean {
        return other instanceof ServerRenderMarker
    }
    
    render(): string {
        return '<!---->'
    }
}

class RenderNodeCollection implements PRenderNodeCollection {
    entries(): IterableIterator<[number, PRenderNode]> {
        throw new Error("Method not implemented.")
    }
    keys(): IterableIterator<number> {
        throw new Error("Method not implemented.")
    }
    values(): IterableIterator<PRenderNode> {
        throw new Error("Method not implemented.")
    }
    
    [Symbol.iterator](): IterableIterator<PRenderNode> {
        this.curIndex = 0
        return this
    }
    
    arr: PRenderNode[] = []
    private curIndex = 0
    
    next(...args: [] | [undefined]): IteratorResult<PRenderNode, any> {
        return {
            value: this.arr[this.curIndex++],
            done: this.curIndex >= this.arr.length
        }
    }
    
    get length(): number {
        return this.arr.length
    }
    
    push(...items: PRenderNode[]): number {
        return this.arr.push(...items)
    }
    
    indexOf(el: PRenderNode, from?: number): number {
        return this.arr.indexOf(el, from)
    }
    
    splice(start: number, deleteCount: number, ...items: PRenderNode[]): PRenderNode[] {
        return this.arr.splice(start, deleteCount, ...items)
    }
    
    filter(predicate: (value: PRenderNode, index: number, array: PRenderNode[]) => unknown, thisArg?: any): PRenderNode[] {
        return this.arr.filter(predicate, thisArg)
    }
}

class RenderElementCollection implements PRenderElementCollection {
    [Symbol.iterator](): IterableIterator<PRenderElement> {
        this.curIndex = 0
        this.arr = this.nodes.filter(x => x instanceof ServerRenderElement) as any
        return this
    }
    
    private curIndex = 0
    private arr: PRenderElement[] = []
    
    constructor(private nodes: RenderNodeCollection) {}
    
    next(...args: [] | [undefined]): IteratorResult<PRenderElement, any> {
        return {
            value: this.arr[this.curIndex++],
            done: this.curIndex >= this.arr.length
        }
    }
}