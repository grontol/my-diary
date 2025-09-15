import { parse } from "@babel/parser"
import {
    ArrowFunctionExpression,
    CallExpression,
    ConditionalExpression,
    Expression,
    LogicalExpression,
    SpreadElement,
    isBinaryExpression,
    isConditionalExpression,
    isExpression,
    isLogicalExpression,
    isStringLiteral
} from "@babel/types"
// @ts-ignore
import generate from "@babel/generator"
import { recursive } from "babel-walk"
import { PluginOption } from "vite"
import { baseNodeEvents } from "./events.js"

export function transformJsxPlugin(): PluginOption {
    return {
        name: 'purr-jsx-transform',
        transform(code, id, options) {
            if (/.[tj]sx$/.test(id)) {
                return {
                    code: transformJsx(code, false)
                }
            }
        },
    }
}

export function transformJsxToAst(code: string) {
    const ast = parse(code, { sourceType: 'module' })
    walkAst()(ast)
    return ast
}

export function transformJsx(code: string, isBrowser = true): string {
    const ast = transformJsxToAst(code)
    if (isBrowser) {
        return generate(ast).code
    }
    else {
        return generate.default(ast).code
    }
}

function walkAst() {
    return recursive({        
        CallExpression(node, state, c) {
            for (const arg of node.arguments) {
                c(arg)
            }
            
            if (node.callee.type === 'Identifier' && node.callee.name === 'jsx') {
                processJsxCall(node)
            }
        },
        
        // TaggedTemplateExpression(node, state, c) {
        //     if (node.tag.type === 'Identifier' && node.tag.name === 'css') {
        //         processCssCall(node)
        //     }
        //     else {
        //         for (const e of node.quasi.expressions) {
        //             c(e)
        //         }
        //     }
        // }
    })
}

// function processCssCall(call: TaggedTemplateExpression) {
//     const newNode: StringLiteral = {
//         type: 'StringLiteral',
//         value: 'Yoyoyo'
//     }
    
//     console.log("Process css")
//     // const content = call.arguments[0]
    
//     for (const k in newNode) {
//         (call as any)[k] = (newNode as any)[k]
//     }
// }

function processJsxCall(call: CallExpression) {
    const props = call.arguments[1]
    
    if (props.type === 'ObjectExpression') {
        for (const prop of props.properties) {
            if (prop.type === 'ObjectProperty' && isExpression(prop.value)) {
                let key: string | null = null
                
                if (prop.key.type === 'Identifier') {
                    key = prop.key.name
                }
                else if (prop.key.type === 'StringLiteral') {
                    key = prop.key.value
                }
                
                prop.value = wrapWithArrow(prop.value)
            }
        }
    }
    
    for (let a = 2; a < call.arguments.length; a++) {
        const child = call.arguments[a]
        
        if (isConditionalExpression(child)) {
            call.arguments[a] = replaceWithIf(child)
        }
        else if (isLogicalExpression(child) && child.operator === '&&') {
            call.arguments[a] = replaceWithIfLogical(child)
        }
        else if (isExpression(child)) {
            call.arguments[a] = wrapWithArrow(child)
        }
    }
}

function replaceWithIf(node: ConditionalExpression): SpreadElement {
    const elements: Expression[] = [
        wrapWithArrow(createCondition('$$If', node.test, node.consequent))
    ]
    
    let next = node.alternate
    
    while (isConditionalExpression(next)) {
        elements.push(
            wrapWithArrow(createCondition('$$ElseIf', next.test, next.consequent))
        )
        
        next = next.alternate
    }
    
    elements.push(
        wrapWithArrow(createCondition('$$Else', null, next))
    )
    
    return {
        type: "SpreadElement",
        argument: {
            type: 'ArrayExpression',
            elements,
        }
    }
}

function replaceWithIfLogical(node: LogicalExpression): SpreadElement {
    return {
        type: "SpreadElement",
        argument: {
            type: 'ArrayExpression',
            elements: [
                wrapWithArrow(
                    createCondition('$$If', node.left, node.right)
                ),
                wrapWithArrow(createCondition('$$Else', null, { type: 'NullLiteral' }))
            ]
        }
    }
}

function createCondition(type: '$$If' | '$$ElseIf' | '$$Else', test: Expression | null, consequent: Expression): CallExpression {
    return {
        type: 'CallExpression',
        callee: {
            type: 'Identifier',
            name: 'jsx'
        },
        arguments: [
            {
                type: 'StringLiteral',
                value: type,
            },
            type === '$$Else' ? {
                type: 'NullLiteral'
            } : {
                type: 'ObjectExpression',
                properties: [
                    {
                        type: 'ObjectProperty',
                        key: {
                            type: 'Identifier',
                            name: 'cond',
                        },
                        computed: false,
                        shorthand: false,
                        value: wrapWithArrow(test!)
                    }
                ]
            },
            wrapWithArrow(consequent),
        ]
    }
}

function wrapWithArrow(node: Expression): ArrowFunctionExpression {
    return {
        type: 'ArrowFunctionExpression',
        body: node,
        params: [],
        async: false,
        expression: true,
    }
}