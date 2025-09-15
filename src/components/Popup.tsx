import { self } from "@pang/event-utils.js";
import { twMerge } from "tailwind-merge";

export function Popup(props: {
    children?: JSX.Element,
    visible: boolean,
    title?: string,
    onClose?: () => void,
    contentClass?: string,
}) {
    return <div
        class={twMerge(
            "fixed inset-0 bg-black/40 flex justify-center items-center",
            props.visible ? "" : "hidden"
        )}
        onclick={self(props.onClose)}
    >
        <div
            class={twMerge(
                "flex flex-col bg-white rounded py-2 min-w-[60%]",
                props.contentClass
            )}
        >
            {props.title && (
                <div class="flex flex-col">
                    <span>{props.title}</span>
                    <div class="h-[1px] bg-gray-300 my-2"/>
                </div>
            )}
            
            {props.children}
        </div>
    </div>
}