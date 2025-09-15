import { parse, stringify, type Rule, type Comment, type AtRule } from "css"

export function css(strings: TemplateStringsArray, ...args: any[]): Css {
    const arr: string[] = []
    
    for (let a = 0; a < strings.length; a++) {
        arr.push(strings[a])
        
        if (a < args.length) {
            arr.push(args[a].toString())
        }
    }
    
    const id = generateId()
    const content = giveId(id, arr.join(''))
    
    return { id, content }
}

export function globalCss(strings: TemplateStringsArray, ...args: any[]): Css {
    const arr: string[] = []
    
    for (let a = 0; a < strings.length; a++) {
        arr.push(strings[a])
        
        if (a < args.length) {
            arr.push(args[a].toString())
        }
    }
    
    const id = generateId()
    const content = arr.join('')
    
    return { id, content }
}

export function clsJoin(...classes: (string | null | undefined)[]): string {
    return classes.filter(x => !!x).join(' ')
}

function giveId(id: string, content: string): string {
    const ast = parse(content)
    const rules = ast.stylesheet?.rules
    
    if (rules) {
        processRules(rules, id)
    }
    
    return stringify(ast)
}

function processRules(rules: Array<Rule | Comment | AtRule>, id: string) {
    for (const rule of rules) {
        if (rule.type === 'rule') {
            processRule(rule, id)
        }
        else if (rule.type === 'media') {
            if (rule.rules) {
                processRules(rule.rules, id)
            }
        }
    }
}

function processRule(rule: Rule, id: string) {
    if (rule.selectors) {
        for (let a = 0; a < rule.selectors.length; a++) {
            rule.selectors[a] = rule.selectors[a].split(' ').map(x => `${x}.${id}`).join(' ')
        }
    }
}

function generateId() {
    const result           = [] as string[]
    const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'
    const charactersLength = characters.length

    for (let i = 0; i < 12; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * charactersLength)))
    }

    return result.join('')
}