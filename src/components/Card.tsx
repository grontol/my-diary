import { twMerge } from "tailwind-merge";

export function Card(props: { children?: JSX.Element, class?: string }) {
    return <div
        class={twMerge(
            "flex items-center px-4 py-2 bg-white/80 rounded-lg shadow-lg",
            props.class,
        )}
    >
        {props.children}
    </div>
}