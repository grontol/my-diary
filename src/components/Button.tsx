import { twMerge } from "tailwind-merge"

type Props = {
    children?: JSX.Element
    onclick?: () => void
    class?: string
}

export function Button(props: Props) {
    return (
        <button
            class={twMerge(
                "flex justify-center relative bg-fuchsia-500 px-3 py-1.5 active:bg-fuchsia-400 cursor-pointer text-base font-bold text-white rounded-lg",
                props.class,
            )}
            onclick={props.onclick}
        >
            {props.children}
        </button>
    )
}