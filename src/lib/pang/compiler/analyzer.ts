import { ArrowFunctionExpression, ExportNamedDeclaration, FunctionDeclaration, Node, Program, Statement, VariableDeclaration } from "@babel/types"
import { parseFile, parseString } from "./parser.js"

type Module = {
    id: string
    node: Program
    scope: Scope
}

type FunctionSymbol = {
    type: 'Function'
    name: string
    isComp: boolean,
    node: FunctionDeclaration
}

type Symbol = FunctionSymbol

class Scope {
    symbols = new Map<string, Symbol>()
    parent: Scope | null = null
    
    inherit(): Scope {
        const scope = new Scope()
        scope.parent = this
        return scope
    }
    
    addSymbol(name: string, symbol: Symbol) {
        this.symbols.set(name, symbol)
    }
}

const globalScope = new Scope()
const modules = new Map<string, Module>()

export async function analyzeFile(file: string): Promise<Module> {
    if (modules.has(file)) {
        return modules.get(file)!
    }
    
    const node = await parseFile(file)
    const moduleScope = globalScope.inherit()
    
    const module: Module = {
        id: file,
        node: node,
        scope: moduleScope
    }
    
    for (const stmt of node.body) {
        analyzeStmt(stmt, moduleScope)
    }
    
    return module
}

export function analyzeString(code: string, id: string): Module {
    if (modules.has(id)) {
        return modules.get(id)!
    }
    
    const node = parseString(code)
    const moduleScope = globalScope.inherit()
    
    const module: Module = {
        id,
        node: node,
        scope: moduleScope,
    }
    
    for (const stmt of node.body) {
        analyzeStmt(stmt, moduleScope)
    }
    
    return module
}

function analyzeStmt(node: Statement, scope: Scope) {
    if (node.type === 'FunctionDeclaration') {
        analyzeFunctionDeclaration(node, scope)
    }
    else if (node.type === 'ExportNamedDeclaration') {
        analyzeExportNamedDeclaration(node, scope)
    }
    else if (node.type === 'VariableDeclaration') {
        analyzeVariableDeclaration(node, scope)
    }
    else {
        console.log(node)
    }
}

const regCompName = /^[A-Z][a-zA-Z_]*$/

function analyzeFunctionDeclaration(node: FunctionDeclaration, scope: Scope) {
    if (node.id) {
        const name = node.id.name
        let isComp = false
        
        if (regCompName.test(name)) {
            isComp = true
        }
        
        scope.addSymbol(name, { type: 'Function', name, isComp, node })
        
        if (isComp) {
            analyzeComp(node, scope)
        }
    }
}

function analyzeExportNamedDeclaration(node: ExportNamedDeclaration, scope: Scope) {
    if (node.declaration) {
        analyzeStmt(node.declaration, scope)
    }
}

function analyzeVariableDeclaration(node: VariableDeclaration, scope: Scope) {
    for (const decl of node.declarations) {
        if (decl.id.type === 'Identifier' && regCompName.test(decl.id.name) && decl.init && decl.init.type === 'ArrowFunctionExpression') {
            analyzeComp(decl.init, scope)
        }
    }
}

function analyzeComp(node: FunctionDeclaration | ArrowFunctionExpression, scope: Scope) {
    console.log(node)
}