import path from "path";
import { describe, it } from "vitest";
import { analyzeFile } from "./analyzer.js";

describe('Parser test', () => {
    it('', () => {
        analyzeFile(path.resolve(__dirname, 'ParseExample.tsx'))
    })
})