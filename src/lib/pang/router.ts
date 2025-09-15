import { ElNode, PrimitiveNode, ReplaceableNode, createCompNode, createTextNode } from "./core.js"
import { state } from "./reactive.js"

export type RouteParam = {
    path?: Record<string, string>,
    children?: JSX.Element,
}

export type RouterConfig = {
    path: string,
    component?: (param: RouteParam) => JSX.Element,
    children?: RouterConfig[],
}

type RouterComponent = (param: RouteParam) => JSX.Element

type RouterItem = {
    paths: string[],
    components: RouterComponent[]
}

const activePath = state<string[]>([])

export function Router(configs: RouterConfig[]): JSX.Component {
    const node = new ReplaceableNode()
    const items = collectRouterItems(configs)
    let comps: RouterComponent[] = []
    const nodes = [node]
    
    function reload() {
        const hash = location.hash
        const paths = splitPath(trimAnyChar(hash, '#'))
        activePath.value = paths
        const item = matchItems(paths, items)
        
        let replaceIndex = 0
        
        if (item) {
            for (let a = 0; a < comps.length; a++) {
                if (a >= item.components.length || comps[a] !== item.components[a]) {
                    break
                }
                
                replaceIndex = a + 1
            }
            
            comps = [...item.components]
            
            for (let a = nodes.length - 1; a > replaceIndex; a--) {
                nodes.splice(a, 1)
            }
            
            let prevNode: PNode | null = null
            
            for (let a = comps.length - 1; a >= replaceIndex; a--) {
                const replacable = prevNode ? new ReplaceableNode(prevNode) : null
                const compNode = createCompNode(comps[a], null, replacable ? [replacable] : null)
                
                if (replacable) {
                    nodes[a + 1] = replacable
                }
                
                prevNode = compNode
            }
            
            nodes[replaceIndex].replace(prevNode)
        }
        else {
            comps = []
            nodes.splice(1, nodes.length - 1)
            
            node.replace(
                new ElNode('div', { class: () => 'bg-gray-800 h-screen flex items-center justify-center text-3xl font-bold' }, [
                    new PrimitiveNode('NOT FOUND')
                ])
            )
        }
    }
    
    reload()
    
    window.onhashchange = () => {
        reload()
    }
    
    return () => node
}

export function formatUrlPath(path: string, withHash = true) {
    if (withHash) {
        return '/' + [
            '#',
            ...path.split('/').filter(x => !!x)
        ].join('/')
    }
    else {
        return '/' + [
            ...path.split('/').filter(x => !!x)
        ].join('/')
    }
}

export function goto(path: string) {
    window.location.hash = formatUrlPath(path, false)
}

export function isActivePath(path: string) {
    return matchPath(activePath.value, splitPath(trimAnyChar(path, "#/")))
}

function matchPath(paths: string[], patterns: string[]) {
    if (paths.length !== patterns.length) {
        return false
    }
    
    for (let a = 0; a < paths.length; a++) {
        if (paths[a] !== patterns[a]) {
            return false
        }
    }
    
    return true
}

function matchItems(paths: string[], items: RouterItem[]): RouterItem | null {
    for (const item of items) {
        if (matchPath(paths, item.paths)) {                
            return item
        }
    }
    
    return null
}

function collectRouterItems(configs: RouterConfig[]) {
    function inner(
        config: RouterConfig,
        parentPaths: string[],
        parentComponents: (RouterComponent | undefined)[],
        out: RouterItem[],
    ) {
        const paths = [...parentPaths, ...splitPath(config.path)].filter(x => !!x)
        const components = [...parentComponents, config.component]
        
        if (config.children) {
            for (const child of config.children) {
                inner(child, paths, components, out)
            }
        }
        else {
            out.push({
                paths,
                components: components.filter(x => !!x) as any,
            })
        }
    }
    
    const items: RouterItem[] = []
    
    for (const config of configs) {
        inner(config, [], [], items)
    }
    
    return items
}

function splitPath(path: string) {
    return trimAnyChar(path, '/').split('/').filter(x => !!x)
}

function trimAnyChar(path: string, chars: string) {
    let start = 0
    let end = path.length
    
    for (let a = 0; a < path.length; a++) {
        if (chars.includes(path[a])) {
            start++
        }
        else {
            break
        }
    }
    
    for (let a = path.length - 1; a > start; a--) {
        if (chars.includes(path[a])) {
            end--
        }
        else {
            break
        }
    }
    
    if (start === 0 && end === path.length) {
        return path
    }
    else if (end - start > 0) {
        return path.slice(start, end)
    }
    else {
        return ''
    }
}