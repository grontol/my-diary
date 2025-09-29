import { foreach } from "@pang/core.js"
import { self } from "@pang/event-utils.js"
import { derived } from "@pang/reactive.js"
import { twJoin, twMerge } from "tailwind-merge"

export type PopupMenuItem = {
    kind: "item"
    id: string
    text: string
    icon?: string
    iconColor?: string
} | {
    kind: "divider"
}

export function PopupMenu(props: {
    items: PopupMenuItem[],
    visible: boolean,
    onClose: () => void,
    onSelect: (id: string) => void,
}) {
    const hasIcon = derived(() => props.items.some(x => x.kind === "item" && !!x.icon))
    
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
                        class="px-4 py-2 flex items-center gap-2 active:bg-black/10 transition-colors"
                        onclick={() => props.onSelect(i.id)}
                    >
                        {i.icon && (
                            <span
                                class={twJoin(
                                    "text-gray-400",
                                    i.icon,
                                )}
                                style={{
                                    color: i.iconColor,
                                }}
                            />
                        )}
                        
                        <span
                            class={twMerge(
                                hasIcon.value && !i.icon ? "ml-6" : ""
                            )}
                        >{i.text}</span>
                    </div>
                ) : (
                    <div
                        class="h-[1px] bg-gray-200"
                    />
                )
            ))}
        </div>
    </div>
}