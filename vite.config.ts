import path from "path"
import { defineConfig } from 'vite'
import checker from "vite-plugin-checker"
import { transformJsxPlugin } from "./src/lib/pang/jsx-transform.js"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

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
        VitePWA({
            manifest: {
                name: "My Diary",
                short_name: "MyDiary",
                description: "My Diary App",
            }
        })
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