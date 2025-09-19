import { Alert } from "@/components/Alert.jsx"
import { foreach } from "@pang/core.js"
import { onMount } from "@pang/lifecycle.js"
import { derived, state } from "@pang/reactive.js"
import { goto, isActivePath } from "@pang/router.js"
import { twMerge } from "tailwind-merge"

type SidebarItemData = {
    text: string
    icon: string
    link: string
}

const sidebarItems: SidebarItemData[] = [
    {
        text: "Actor",
        icon: "icon-[fluent-emoji-flat--kissing-cat]",
        link: "/actor",
    },
    {
        text: "Track Data",
        icon: "icon-[flat-color-icons--line-chart]",
        link: "/track-data",
    },
    {
        text: "Diary & Tracking",
        icon: "icon-[emojione-v1--note-pad]",
        link: "/tracking",
    },
    {
        text: "Resep",
        icon: "icon-[emojione--pot-of-food]",
        link: "resep",
    },
    {
        text: "Sync",
        icon: "icon-[fluent-color--arrow-sync-16]",
        link: "sync",
    },
]

export function Root(props: { children?: JSX.Element }) {
    const sidebarWidth = Math.floor(window.innerWidth * 0.65)
    const xThreshold = sidebarWidth * 0.15
    const velocityThreshold = 0.5
    
    let startX = 0
    let startTime = 0
    let sidebarXStart = 0
    let deltaX = 0
    let isDragging = false
    
    const sidebarOpen = state(false)
    const sidebarX = state(0)
    const activeSidebar = state(sidebarItems.find(x => isActivePath(x.link)) ?? sidebarItems[0])
    const opacity = derived(() => sidebarX.value * 0.5 / sidebarWidth)
    
    function openSidebar() {
        sidebarX.value = sidebarWidth
        sidebarOpen.value = true
    }
    
    function closeSidebar() {
        sidebarX.value = 0
        sidebarOpen.value = false
    }
    
    function selectSidebar(i: SidebarItemData) {
        activeSidebar.value = i
        closeSidebar()
    }
    
    function blackClick(e: MouseEvent) {
        e.stopPropagation()
        closeSidebar()
    }
    
    onMount(() => {
        document.addEventListener("touchstart", e => {
            if (sidebarOpen.value || e.touches[0].clientX < window.innerWidth * 0.05) {
                sidebarXStart = sidebarX.value
                startX = e.touches[0].clientX
                deltaX = 0
                startTime = Date.now()
                isDragging = true
            }
        })
        
        document.addEventListener("touchmove", e => {
            if (!isDragging) return
            
            deltaX = e.touches[0].clientX - startX
            sidebarX.value = Math.floor(Math.max(Math.min(sidebarXStart + deltaX, sidebarWidth), 0))
        })
        
        document.addEventListener("touchend", () => {
            if (!isDragging) return
            
            isDragging = false
            
            const deltaTime = Date.now() - startTime
            const velocity = deltaX / deltaTime
            
            if (!sidebarOpen.value && (deltaX > xThreshold || velocity > velocityThreshold)) {
                openSidebar()
            }
            else if (sidebarOpen.value && (deltaX < -xThreshold || velocity < -velocityThreshold)) {
                closeSidebar()
            }
            else {
                if (sidebarOpen.value) openSidebar()
                else closeSidebar()
            }
        })
    })
    
    return <>
        <div
            class="h-full flex flex-col relative overflow-hidden"
        >
            <div
                class="flex-1 flex flex-col relative duration-75 transition-transform from-fuchsia-200 via-fuchsia-300/60 to-purple-300 bg-gradient-to-b overflow-hidden"
                style={{
                    transform: `translateX(${sidebarX.value}px)`
                }}
            >                
                <div
                    class={twMerge(
                        "absolute inset-0 bg-black z-10 transition-opacity",
                        opacity.value > 0 ? "" : "pointer-events-none"
                    )}
                    style={{
                        opacity: `${opacity.value}`,
                    }}
                    onclick={blackClick}
                />
                
                <div class="flex items-center relative px-2 py-1 gap-2 bg-gradient-to-r from-pink-400/0 mb-2">
                    <button
                        class="p-1 active:bg-fuchsia-600/10 flex items-center justify-center"
                        onclick={openSidebar}
                    >
                        <span
                            class="icon-[ic--baseline-menu] text-2xl"
                        />
                    </button>
                    
                    <span class="text-lg">{activeSidebar.value.text}</span>
                </div>
                
                <div class="flex-1 relative overflow-auto flex flex-col">
                    {props.children}
                </div>
            </div>
            
            <Sidebar
                open={sidebarOpen.value}
                onSelect={selectSidebar}
                width={sidebarWidth}
                x={sidebarX.value}
            />
        </div>
        
        <Alert/>
    </>
}

function Sidebar(props: { open: boolean, onSelect: (i: SidebarItemData) => void, width: number, x: number }) {
    return <div
        class="absolute h-full bg-pink-200 z-[100] shadow-2xl py-3 duration-75 transition-transform"
        style={{
            width: `${props.width}px`,
            transform: `translateX(${props.x - props.width}px)`
        }}
    >
        {foreach(sidebarItems, s => (
            <SidebarItem
                text={s.text}
                icon={s.icon}
                link={s.link}
                onSelect={() => props.onSelect(s)}
            />
        ))}
    </div>
}

function SidebarItem(props: { text: string, icon: string, link: string, onSelect: () => void }) {
    function select() {
        goto(props.link, false)
        props.onSelect()
    }
    
    return <div
        class="flex items-center px-4 py-2 gap-2 active:bg-fuchsia-600/10 transition-all"
        onclick={select}
    >
        <span class={twMerge(props.icon, "text-2xl")}></span>
        <span class="text-fuchsia-800">{props.text}</span>
    </div>
}