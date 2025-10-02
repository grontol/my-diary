import { derived, state } from "@pang/reactive.js"

export function SwipeableView(props: {
    children?: JSX.Element
    onPrev?: () => void
    onNext?: () => void
}) {
    const xThreshold = window.innerWidth * 0.65 * 0.15
    const velocityThreshold = 0.5
    const duration = 100
    const minPercentage = 0.7
    
    const translation = state(0)
    const animating = state(false)
    
    const percentage = derived(() => {
        if (translation.value > 0) {
            return 1 - (1 - minPercentage) * translation.value / window.innerWidth
        }
        else {
            return 1 + (1 - minPercentage) * translation.value / window.innerWidth
        }
    })
    
    let dragging = false
    let startX = 0
    let startY = 0
    let deltaX = 0
    let startTime = 0
    let timeoutId: any = null
    
    function touchStart(e: TouchEvent) {
        if (timeoutId) clearTimeout(timeoutId)
        
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        deltaX = 0
        startTime = Date.now()
        dragging = true
    }
    
    function touchMove(e: TouchEvent) {
        if (!dragging) return
        
        deltaX = e.touches[0].clientX - startX
        const deltaY = e.touches[0].clientY - startY
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
            translation.value = 0
        }
        else {
            translation.value = Math.max(Math.min(deltaX, window.innerWidth * 1.1), -window.innerWidth * 1.1)
        }
    }
    
    function touchEnd(e: TouchEvent) {
        if (!dragging) return
        
        const deltaTime = Date.now() - startTime
        const velocity = deltaX / deltaTime
        
        let isDec = false
        let isInc = false
        
        if (deltaX > xThreshold || velocity > velocityThreshold) {
            translation.value = window.innerWidth
            isDec = true
        }
        else if (deltaX < -xThreshold || velocity < -velocityThreshold) {
            translation.value = -window.innerWidth
            isInc = true
        }
        else {
            translation.value = 0
        }
        
        dragging = false
        animating.value = true
        
        timeoutId = setTimeout(() => {
            if (isDec) props.onPrev?.()
            if (isInc) props.onNext?.()
            
            animating.value = false
            translation.value = 0
            
            timeoutId = null
        }, duration)
    }
    
    return <div
        class="flex flex-col"
        style={{
            transform: `translateX(${translation.value}px)`,
            transition: animating.value ? "transform" : "none",
            transitionDuration: `${duration}ms`,
        }}
        ontouchstart={touchStart}
        ontouchmove={touchMove}
        ontouchend={touchEnd}
    >
        {props.children}
    </div>
}