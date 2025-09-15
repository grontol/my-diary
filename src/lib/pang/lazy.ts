const lazySymbol = Symbol("$lazy")

export function lazy<T>(runner: () => T): Lazy<T> {
    (runner as any)['$lazy'] = lazySymbol
    
    return runner
}

export function isLazy<T>(value: MayLazy<T>): value is Lazy<T> {
    return value && (value as any)['$lazy'] === lazySymbol
}

export function evalLazy<T>(value: MayLazy<T>): T {
    if (isLazy(value)) return value()
    else return value
}