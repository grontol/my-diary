import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { defineConfig } from 'vite'
import checker from "vite-plugin-checker"
import { transformJsxPlugin } from "./src/lib/pang/jsx-transform.js"

export default defineConfig({
    root: "./",
    build: {
        outDir: "./build"
    },
    plugins: [
        tailwindcss(),
        checker({
            typescript: true,
        }),
        transformJsxPlugin(),
    ],
    server: {
        watch: {
            ignored: ["**/android/**"]
        }
    },
    resolve: {
        alias: {
            '@pang': path.resolve(__dirname, 'src/lib/pang'),
            '@': path.resolve(__dirname, 'src'),
        }
    }
})