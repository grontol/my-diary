import { parse } from "@babel/parser"
import { Program } from "@babel/types"

export async function parseFile(file: string): Promise<Program> {
    const fs = await import('node:fs/promises')
    const content = (await fs.readFile(file)).toString()
    
    return parseString(content)
}

export function parseString(code: string): Program {
    const res = parse(code, {
        plugins: ["jsx", "typescript"],
        allowImportExportEverywhere: true,
    })
    
    return res.program
}