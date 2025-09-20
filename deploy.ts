// rm -rf android/app/src/main/assets/* && cp -r docs/* android/app/src/main/assets/

import fs from "fs"
import path from "path"

removeAllFilesInDir("android/app/src/main/assets")
fs.cpSync("docs", "android/app/src/main/assets", { recursive: true })

function removeAllFilesInDir(dir: string) {
    const files = fs.readdirSync(dir)
    console.log(files)

    for (const f of files) {
        const p = path.join(dir, f)
        const stat = fs.lstatSync(p)
        
        if (stat.isDirectory()) {
            fs.rmSync(p, { recursive: true })
            fs.rmdirSync(p)
        }
        else {
            fs.rmSync(p)
        }
    }
}