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
    selectable?: boolean
    selected?: boolean
} | {
    kind: "divider"
}

export function PopupMenu(props: {
    items: PopupMenuItem[],
    visible: boolean,
    onClose: () => void,
    onSelect: (id: string) => void,
    title?: string,
}) {
    const hasIcon = derived(() => props.items.some(x => x.kind === "item" && !!x.icon))
    const hasSelectable = derived(() => props.items.some(x => x.kind === "item" && (x.selectable ?? false)))
    
    return <div
        class={twMerge(
            "fixed inset-0 bg-black/40 flex justify-center items-center",
            props.visible ? "" : "hidden"
        )}
        onclick={self(props.onClose)}
    >        
        <div class="flex flex-col bg-white rounded py-2 min-w-[60%]">
            {props.title && (
                <div class="font-black text-center py-1">{props.title}</div>
            )}
        
            {foreach(props.items, i => (
                i.kind === "item" ? (
                    <div
                        class="px-4 py-2 flex items-center gap-2 active:bg-black/10 transition-colors"
                        onclick={() => props.onSelect(i.id)}
                    >
                        {i.selectable && i.selected && (
                            <span class="icon-[mdi--check] text-xl"></span>
                        )}
                        
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
                        
                        {hasSelectable.value && (!i.selectable || !i.selected) && (
                            <span class="w-5"/>
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