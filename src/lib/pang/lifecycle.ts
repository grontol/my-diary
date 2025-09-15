export type Lifecycle = {
    onMount?: () => void
    onDestroy?: () => void
}

const lifecycleOwners: Lifecycle[] = []

export function onMount(runner: () => void) {
    if (lifecycleOwners.length > 0) {
        lifecycleOwners[lifecycleOwners.length - 1].onMount = runner
    }
}

export function onDestroy(runner: () => void) {
    if (lifecycleOwners.length > 0) {
        lifecycleOwners[lifecycleOwners.length - 1].onDestroy = runner
    }
}

export function pushLifecycleOwner(value: Lifecycle) {
    lifecycleOwners.push(value)
}

export function popLifecycleOwner(): Lifecycle | undefined {
    return lifecycleOwners.pop()
}