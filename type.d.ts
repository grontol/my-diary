type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

type Refable<T, RefType = any> = T & { ref?: (c: RefType) => void }

type Obs<T = any> = {
    readonly value: T
}

type MaybeObs<T = any> = T | Obs<T>

type State<T> = {
    value: T,
    trigger: () => void
}

type NestedState<T> = T

type RenderBlock<T extends any[] = []> = (...args: T) => void

type MakeObs<T extends Record<string, any>> = {
    [K in keyof T]: Obs<T[K]>
}

type MakeMayObs<T extends Record<string, any>> = {
    [K in keyof T]: MayObs<T[K]>
}

type Lazy<T> = () => T
type MayLazy<T> = T | Lazy<T>
type MayFn<T> = T | (() => T)
type MayPromise<T> = T | Promise<T>

type EasingFn = (t: number) => number
type EasingCubic = {
    type: 'cubic'
    value: [number, number, number, number]
}
type EasingFrames = {
    type: 'frames'
    values: {
        frame: number
        value: number
    }[]
}
type Easing = EasingFn | EasingCubic | EasingFrames
type Transition = {
    delay: number
    duration: number
    easing: Easing
    frame: (t: number) => Keyframe
}

type TransitionRunner = (node: Element) => Transition

interface PRenderNode {
    parentNode: PParentNode | null
    
    remove(): void
    
    isEqualTo(other: PRenderNode): boolean
    render(): string
}

interface PRenderText extends PRenderNode {
    textContent: string | null
}

interface PRenderElementCollection extends IterableIterator<PRenderElement> {}
interface PRenderNodeCollection extends IterableIterator<PRenderNode> {
    entries(): IterableIterator<[number, PRenderNode]>
    keys(): IterableIterator<number>
    values(): IterableIterator<PRenderNode>
}

interface PParentNode extends PRenderNode {
    children: PRenderElementCollection
    childNodes: PRenderNodeCollection
    
    removeChild<T extends PRenderNode>(child: T): T
    insertBefore(el: PRenderNode, before: PRenderNode | null): void
}

interface PRenderElement extends PParentNode {
    readonly tagName: string
    readonly classList: Set<string>
    
    remove(): void
    
    getAttribute(qualifiedName: string): string | null
    setAttribute(qualifiedName: string, value: string): void
    removeAttribute(qualifiedName: string): void
}

interface PNode {
    attachStyleId(id: string): void
    mount(parent: PParentNode, before: PRenderNode | null, parentEffect: Effect): void
    hydrate(parent: ParentNode, index: number, parentEffect: Effect): number
    outTransition(): Promise<void>
    dispose(): void
    
    children: readonly PNode[] | null
    print(): string
}

type PElement = PNode | string | number | undefined | null | PElement[]
type PFunctionComponent = (props?: Record<string, MayFn<unknown>> | null) => PElement
type PClassComponent = {
    new(props?: Record<string, MayFn<unknown>> | null)
    
    render: () => PElement
}
type PComponent = PFunctionComponent | PClassComponent

type Css = {
    id: string
    content: string
}

type PersistentComponent = {
    element: JSX.Element
    mount: () => void
    dispose: () => void
}