import { parse } from "@babel/parser"
import { ArrowFunctionExpression, CallExpression, Expression, Node, Statement, isExpression } from "@babel/types"
// @ts-ignore
import generate from "@babel/generator"
import { PluginOption } from "vite"
import { baseNodeEvents } from "./events.js"

let _isServer = false

export function transformJsxPlugin(isServer = true): PluginOption {
    _isServer  = isServer
    
    return {
        name: 'purr-jsx-transform',
        transform(code, id, options) {
            if (/.[tj]sx$/.test(id)) {
                return {
                    code: transformJsx(code)
                }
            }
        },
    }
}

export function transformJsxToAst(code: string) {
    const ast = parse(code, { sourceType: 'module' })
    transformStmts(ast.program.body)
    return ast
}

export function transformJsx(code: string): string {
    const ast = transformJsxToAst(code)
    return generate.default(ast).code
}

function transformStmts(stmts: Statement[]) {
    for (const stmt of stmts) {
        if (stmt.type === 'ExpressionStatement') {
            checkExpression(stmt.expression)
        }
        else if (stmt.type === 'FunctionDeclaration') {
            transformStmts(stmt.body.body)
        }
        else if (stmt.type === 'VariableDeclaration') {
            for (const decl of stmt.declarations) {
                if (decl.init && decl.init.type === 'ArrowFunctionExpression') {
                    if (decl.init.body.type === 'BlockStatement') {
                        transformStmts(decl.init.body.body)
                    }
                    else if (decl.init.body.type === 'CallExpression') {
                        checkCall(decl.init.body)
                    }
                }
            }
        }
        else if (stmt.type === 'ReturnStatement') {
            if (stmt.argument) {
                checkExpression(stmt.argument)
            }
        }
        else if (stmt.type === 'ExportDefaultDeclaration' || stmt.type === 'ExportNamedDeclaration') {
            if (isExpression(stmt.declaration)) {
                checkExpression(stmt.declaration)
            }
            else if (stmt.declaration?.type === 'FunctionDeclaration') {
                transformStmts(stmt.declaration.body.body)
            }
        }
    }
}

function checkExpression(expr: Expression) {
    if (expr.type === 'CallExpression') {
        checkCall(expr)
    }
}

function checkCall(call: CallExpression) {
    if (call.callee.type === 'Identifier' && call.callee.name === 'jsx') {
        const tagOrComp = call.arguments[0]
        
        // Kalau primitive tag
        if (tagOrComp.type === 'StringLiteral') {
            processJsxCall(call)
        }
        // Kalau component
        else if (tagOrComp.type === 'Identifier') {
            processJsxCall(call)
        }
    }
    else {
        for (const arg of call.arguments) {
            if (isExpression(arg)) {
                checkExpression(arg)
            }
        }
    }
}

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
                
                if (key && !baseNodeEvents.includes(key)) {
                    prop.value = wrapWithArrow(prop.value)
                }
            }
        }
    }
    
    for (let a = 2; a < call.arguments.length; a++) {
        const child = call.arguments[a]
            
        if (isExpression(child)) {
            checkExpression(child)
            call.arguments[a] = wrapWithArrow(child)
        }
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