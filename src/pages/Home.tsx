import { Button } from "@/components/Button.jsx";
import { goto } from "@pang/router.js";

export function Home() {
    return <div class="flex flex-col items-center p-4">
        <Button onclick={() => goto("/calendar")}>Calender</Button>
    </div>
}