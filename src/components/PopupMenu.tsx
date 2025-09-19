import { foreach } from "@pang/core.js"
import { self } from "@pang/event-utils.js"
import { twMerge } from "tailwind-merge"

export type PopupMenuItem = {
    kind: "item"
    id: string
    text: string
} | {
    kind: "divider"
}

export function PopupMenu(props: {
    items: PopupMenuItem[],
    visible: boolean,
    onClose: () => void,
    onSelect: (id: string) => void,
}) {
    return <div
        class={twMerge(
            "fixed inset-0 bg-black/40 flex justify-center items-center",
            props.visible ? "" : "hidden"
        )}
        onclick={self(props.onClose)}
    >
        <div class="flex flex-col bg-white rounded py-2 min-w-[60%]">
            {foreach(props.items, i => (
                i.kind === "item" ? (
                    <div
                        class="px-4 py-2 active:bg-black/10 transition-colors"
                        onclick={() => props.onSelect(i.id)}
                    >{i.text}</div>
                ) : (
                    <div
                        class="h-[1px] bg-gray-200"
                    />
                )
            ))}
        </div>
    </div>
}