export function TextInput(props: { value: string, oninput?: (v: string) => void }) {
    return <div class="flex flex-col">        
        <input
            class="bg-white/60 border border-fuchsia-600 rounded-lg outline-none px-3 py-1"
            value={props.value}
            oninput={props.oninput}
        />
    </div>
}