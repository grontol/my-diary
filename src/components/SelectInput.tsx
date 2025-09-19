import { foreach } from "@pang/core.js"

type Props<T> = {
    items: T[]
    render: (i: T) => JSX.Element
}

export function SelectInput<T>(props: Props<T>) {
    return <div class="flex flex-col">
        <select class="bg-white/60 border border-fuchsia-600 rounded-lg outline-none px-3 py-1 appearance-none">
            {foreach(props.items, a => (
                <option>{props.render(a)}</option>
            ))}
        </select>
    </div>
}