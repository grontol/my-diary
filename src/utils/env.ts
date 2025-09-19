function getEnv(): any | undefined {
    const w = window as any
    return w['AndroidEnv']
}

export function envIsAndroid() {
    return getEnv()?.isAndroid()
}

export function envExport(data: string) {
    getEnv()?.export(data)
}