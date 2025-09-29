export function scale({
    delay = 0,
    duration = 50,
    from = 0,
    to = 1,
    easing = easeDefault,
}: {
    delay?: number
    duration?: number
    from?: number
    to?: number
    easing?: Easing,
} = {}): TransitionRunner {
    return (node) => {
        const style = getComputedStyle(node)
	    const transform = style.transform === 'none' ? '' : style.transform
        const el = node instanceof HTMLElement ? node as HTMLElement : null
        
        // if (el) {
        //     el.style.transform = `${transform} scale(0)`
        // }
        
        return {
            delay,
            duration,
            easing,
            frame(t) {
                const value = from + (to - from) * t
                
                return {
                    opacity: value,
                    scale: value,
                }
            },
        }
    }
}

export function fade({
    delay = 0,
    duration = 50,
    from = 0,
    to = 1,
    easing = easeDefault,
}: {
    delay?: number
    duration?: number
    from?: number
    to?: number
    easing?: Easing,
} = {}): TransitionRunner {    
    return (node) => {
        const el = node instanceof HTMLElement ? node as HTMLElement : null
        
        return {
            delay,
            duration,
            easing,
            frame(t) {
                return {
                    opacity: t,
                }
            },
        }
    }
}

export function curtain({
    delay = 0,
    duration = 150,
    easing = easeDefault,
    direction = 'vertical',
}: {
    delay?: number
    duration?: number
    easing?: Easing,
    direction?: 'vertical' | 'horizontal',
} = {}): TransitionRunner {
    return (node) => {
        const el = node instanceof HTMLElement ? node as HTMLElement : null
        
        let originalSize = 0
        let originalPaddingStart = 0
        let originalPaddingEnd = 0
        let originalMarginStart = 0
        let originalMarginEnd = 0
        let originalBorderStartSize = 0
        let originalBorderEndSize = 0
        
        if (el) {
            const computedStyle = getComputedStyle(el)
            
            if (direction === 'vertical') {
                originalSize = parseFloat(computedStyle.height)
                originalPaddingStart = parseFloat(computedStyle.paddingTop)
                originalPaddingEnd = parseFloat(computedStyle.paddingBottom)
                originalMarginStart = parseFloat(computedStyle.marginTop)
                originalMarginEnd = parseFloat(computedStyle.marginBottom)
                originalBorderStartSize = parseFloat(computedStyle.borderTopWidth)
                originalBorderEndSize = parseFloat(computedStyle.borderBottomWidth)
            }
            else {
                originalSize = parseFloat(computedStyle.width)
                originalPaddingStart = parseFloat(computedStyle.paddingLeft)
                originalPaddingEnd = parseFloat(computedStyle.paddingRight)
                originalMarginStart = parseFloat(computedStyle.marginLeft)
                originalMarginEnd = parseFloat(computedStyle.marginRight)
                originalBorderStartSize = parseFloat(computedStyle.borderLeftWidth)
                originalBorderEndSize = parseFloat(computedStyle.borderRightWidth)
            }
        }
        
        return {
            delay,
            duration,
            easing,
            frame(t) {
                if (direction === 'vertical') {
                    return {
                        minHeight: `${originalSize * t}px`,
                        height: `${originalSize * t}px`,
                        paddingTop: `${originalPaddingStart * t}px`,
                        paddingBottom: `${originalPaddingEnd * t}px`,
                        marginTop: `${originalMarginStart * t}px`,
                        marginBottom: `${originalMarginEnd * t}px`,
                        borderTopWidth: `${originalBorderStartSize * t}px`,
                        borderBottomWidth: `${originalBorderEndSize * t}px`,
                    }
                }
                else {
                    return {
                        minWidth: `${originalSize * t}px`,
                        width: `${originalSize * t}px`,
                        paddingLeft: `${originalPaddingStart * t}px`,
                        paddingRight: `${originalPaddingEnd * t}px`,
                        marginLeft: `${originalMarginStart * t}px`,
                        marginRight: `${originalMarginEnd * t}px`,
                        borderLeftWidth: `${originalBorderStartSize * t}px`,
                        borderRightWidth: `${originalBorderEndSize * t}px`,
                    }
                }
            },
        }
    }
}

export async function runTransition(node: Element, transition: Transition, mode: 'in' | 'out') {
    const frames: Keyframe[] = []
    let easing: string | undefined
    
    if (typeof transition.easing === 'function') {
        // 60 FPS
        const inc = 1000 / 60
        let curTime = 0
        
        while (curTime < transition.duration) {
            frames.push(transition.frame(transition.easing(curTime / transition.duration)))
            curTime += inc
        }
        
        frames.push(transition.frame(transition.easing(1)))
        
        if (mode === 'out') {
            frames.reverse()
        }
    }
    else if (transition.easing.type === 'cubic') {
        const startFrame = transition.frame(0)
        const endFrame = transition.frame(1)
        
        frames.push(startFrame)
        frames.push(endFrame)
        
        const value = [...transition.easing.value]
        
        if (mode === 'out') {
            frames.reverse()
            value.reverse()
        }
        
        easing = `cubic-bezier(${value.join(',')})`
    }
    else {
        for (const f of transition.easing.values) {
            const frame = transition.frame(f.value)
            frame.offset = mode === 'in' ? f.frame : 1 - f.frame
            
            frames.push(frame)
        }
        
        if (mode === 'out') {
            frames.reverse()
        }
    }
    
    const anim = node.animate(frames, {
        duration: transition.duration,
        fill: 'forwards',
        easing,
    })
    
    return new Promise<void>((res) => {
        anim.onfinish = () => {
            res()
        }
    })
}

export const easeLinear: Easing = { type: 'cubic', value: [0, 0, 1, 1] }
export const easeCubicOut: Easing = { type: 'cubic', value: [0.33, 1, 0.68, 1] }
export const easeBounceOut: Easing = {
    type: 'frames',
    values: [
        { frame: 0, value: 0 },
        { frame: 0.12, value: 0.10999999999999999 },
        { frame: 0.24, value: 0.43999999999999995 },
        { frame: 0.36, value: 0.98 },
        { frame: 0.54, value: 0.75 },
        { frame: 0.74, value: 0.98 },
        { frame: 0.82, value: 0.94 },
        { frame: 0.92, value: 0.99 },
        { frame: 0.96, value: 0.98 },
        { frame: 1, value: 1 }
    ]
}
export const easeElasticOut: Easing = {
    type: 'frames',
    values: [
        { frame: 0, value: 0 },
        { frame: 0.16, value: 1.32 },
        { frame: 0.28, value: 0.87 },
        { frame: 0.44, value: 1.05 },
        { frame: 0.59, value: 0.98 },
        { frame: 0.73, value: 1.01 },
        { frame: 0.88, value: 1 },
        { frame: 1, value: 1 }
    ]
}
export const easeCircOut: Easing = { type: 'cubic', value: [0, 0.55, 0.45, 1] }
export const easeExpoInOut: Easing = { type: 'cubic', value: [0.87, 0, 0.13, 1] }
export const easeDefault = easeCubicOut