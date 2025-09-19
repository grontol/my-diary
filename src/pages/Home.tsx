import { Button } from "@/components/Button.jsx";
import { onMount } from "@pang/lifecycle.js";
import { goto } from "@pang/router.js";

export function Home() {
    onMount(() => goto("/tracking", false))
    
    return <div class="flex flex-col items-center p-4">
        <Button onclick={() => goto("/tracking")}>Calender</Button>
    </div>
}