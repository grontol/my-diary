export function formatVideoLengthText(length: number): string {
    const s = Math.round(length / 1000) % 60
    const m = Math.floor(length / (60 * 1000)) % 60
    const h = Math.floor(length / (60 * 60 * 1000))
    
    const hs = h > 0 ? `${h}:` : ''
    const ms = (h > 0 ? m.toString().padStart(2, '0') : m) + ':'
    const ss = s.toString().padStart(2, '0')
    
    return `${hs}${ms}${ss}`
}

export function formatFileSizeText(size: number): string {
    if (size < 1024) {
        return `${size}B`
    }
    else if (size < 1024 * 1024) {
        return `${formatNumberToStringPrecision(size / 1024)}KB`
    }
    else if (size < 1024 * 1024 * 1024) {
        return `${formatNumberToStringPrecision(size / (1024 * 1024))}MB`
    }
    else {
        return `${formatNumberToStringPrecision(size / (1024 * 1024 * 1024))}GB`
    }
}

export function formatNumberToStringPrecision(n: number): string {
    const base = Math.floor(n)
    
    if (base === n) {
        return n.toString()
    }
    else {
        const frac = Math.floor((n - base) * 100)
        const fracStr = frac % 10 === 0 ? (frac / 10).toString() : frac.toString()
        
        return `${base}.${fracStr}`
    }
}