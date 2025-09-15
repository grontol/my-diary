import path from "path"
import { defineConfig } from 'vite'
import checker from "vite-plugin-checker"
import { transformJsxPlugin } from "./src/lib/pang/jsx-transform.js"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
    root: "./",
    base: "/my-diary",
    build: {
        outDir: "./docs"
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
            ignored: ["**/be/**"]
        }
    },
    resolve: {
        alias: {
            '@pang': path.resolve(__dirname, 'src/lib/pang'),
            '@': path.resolve(__dirname, 'src'),
        }
    }
})