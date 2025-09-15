import { render, Router } from "@pang/index.js"
import "./index.css"
import "./lib/pang/jsx.js"
import { routes } from "./routes.js"

const app = document.getElementById('app')!
render(app, Router(routes))

if (import.meta.hot) {
    import.meta.hot.accept()
}