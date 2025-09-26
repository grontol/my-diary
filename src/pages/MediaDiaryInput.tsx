import { showAlert } from "@/components/Alert.jsx";
import { Button, IconButton } from "@/components/Button.jsx";
import { TextInput } from "@/components/TextInput.jsx";
import { ActorData, actorGetAll } from "@/data/actor.js";
import { DiaryMediaData } from "@/data/diary.js";
import { envAsAndroidFileUrl, getAndroidEnv, VideoData } from "@/utils/env.js";
import { foreach } from "@pang/core.js";
import { onDestroy, onMount } from "@pang/lifecycle.js";
import { derived, state } from "@pang/reactive.js";
import { twMerge } from "tailwind-merge";

// const sampleVideo: VideoData = {
//     "name": "diary_1758906146885.mp4",
//     "length": 54020,
//     "size": 135889000,
//     "thumbnail": "diary_1758906146885_thumb.png"
// }

export function MediaDiaryInput(props: {
    onCancel: () => void
    onSave: (acrot: string, data: VideoData, gain: number, note: string) => void
    data?: DiaryMediaData
}) {
    const isEdit = derived(() => !!props.data)
    
    const actors = state<ActorData[]>([])
    const selectedActor = state(props.data?.actor ?? "")
    const videoData = state<VideoData | null>(props.data ? {
        name: props.data.content.video,
        length: props.data.content.duration,
        size: props.data.content.size,
        thumbnail: props.data.content.thumbnail,
    } : null)
    
    const compressing = state(false)
    const compressError = state(false)
    const compressProgress = state(0)
    
    const uploading = state(false)
    const uploadProgress = state(0)
    
    const gain = state(props.data?.content.gain ?? 0)
    const note = state(props.data?.content.note ?? "")
    
    const colledtedVideoDatas: VideoData[] = []
    
    function save() {
        if (!videoData.value) {
            showAlert({
                title: "No...",
                message: "Isi data dulu dong!",
                type: "info"
            })
            return
        }
        
        const toDelete: string[] = []
        
        if (!props.data) {
            // Kalau save dan add, hapus semua collected videos kecuali yang terakhir
            
            for (let a = 0; a < colledtedVideoDatas.length - 1; a++) {
                toDelete.push(colledtedVideoDatas[a].name)
                toDelete.push(colledtedVideoDatas[a].thumbnail)
            }
        }
        else {
            // Kalau save dan edit, hapus semua collected videos kecuali yang terakhir + original video (kalau ada video baru)
            
            if (colledtedVideoDatas.length > 0) {
                toDelete.push(props.data.content.video)
                toDelete.push(props.data.content.thumbnail)
            }
            
            for (let a = 0; a < colledtedVideoDatas.length - 1; a++) {
                toDelete.push(colledtedVideoDatas[a].name)
                toDelete.push(colledtedVideoDatas[a].thumbnail)
            }
        }
        
        getAndroidEnv()?.deleteMedia(toDelete)
        
        props.onSave(selectedActor.value, videoData.value, gain.value, note.value)
    }
    
    function cancel() {
        // Kalau cancel, hapus semua collected videos
        getAndroidEnv()?.deleteMedia(
            colledtedVideoDatas.map(x => [x.name, x.thumbnail]).flatMap(x => x)
        )
        
        props.onCancel?.()
    }
    
    function recordVideo() {
        getAndroidEnv()?.recordVideo((success, video) => {
            if (success) {
                videoData.value = video ?? null
                
                if (video) {
                    colledtedVideoDatas.push(video)
                }
            }
        })
    }
    
    function uploadVideo() {
        uploading.value = true
        
        getAndroidEnv()?.uploadVideo((success, progress, video) => {
            if (success) {
                if (progress >= 1) {
                    uploading.value = false
                    videoData.value = video ?? null
                    
                    if (video) {
                        colledtedVideoDatas.push(video)
                    }
                }
                else {
                    uploadProgress.value = progress
                }
            }
            else {
                uploading.value = false
            }
        })
    }
    
    function compressVideo() {
        if (!videoData.value) return
        
        compressError.value = false
        compressing.value = true
        
        getAndroidEnv()?.compressVideo(videoData.value.name, (success, completed, progress, newSize) => {
            if (!success) {
                compressing.value = false
                compressError.value = true
            }
            else if (completed) {
                compressing.value = false
                
                if (videoData.value) {
                    videoData.value.size = newSize
                    videoData.trigger()
                    
                    showAlert({
                        title: "Completed",
                        message: "Compressing is completed",
                        type: "info",
                    })
                }
            }
            else {
                compressProgress.value = progress
            }
        })
    }
    
    function cancelCompress() {
        
    }
    
    function deleteVideo() {
        showAlert({
            title: "Konfirmasi",
            message: "Delete video?",
            type: "question",
            onOk() {                
                videoData.value = null
            },
        })
    }
    
    function playVideo() {
        if (videoData.value) {
            getAndroidEnv()?.playVideo(videoData.value.name, gain.value)
        }
    }
    
    function actorChanged(e: Event) {
        // @ts-ignore
        selectedActor.value = e.target?.value ?? ''
    }
    
    function comingSoon() {
        showAlert({
            title: "Coming Soon",
            message: "Feature will come soon",
            type: "info"
        })
    }
    
    onMount(async () => {
        actors.value = await actorGetAll()
        
        if (actors.value.length > 0 && !selectedActor.value) {
            selectedActor.value = actors.value[0].id
        }
    })
    
    return <div
        class="fixed inset-0 from-fuchsia-200 via-fuchsia-100 to-purple-300 bg-gradient-to-b flex flex-col z-10 overflow-y-auto"
    >
        <div class="flex-1 flex flex-col">
            <select
                class="px-3 py-2 outline-none mr-2"
                onchange={actorChanged}
            >
                {foreach(actors, a => (
                    <option value={a.id} selected={selectedActor.value === a.id}>{a.name} {a.emoji}</option>
                ))}
            </select>
            
            <TextInput
                class="px-4 border-t border-b border-fuchsia-700"
                value={note.value}
                oninput={v => note.value = v}
                placeholder="Note..."
                canGrow={true}
                noStyle={true}
            />
            
            {videoData.value ? (
                <div class="flex flex-col items-center mt-4">
                    <div class="relative self-center">
                        <img
                            src={envAsAndroidFileUrl(videoData.value.thumbnail)}
                            width={`${window.innerWidth * 0.5}px`}
                            class="rounded-xl"
                        />
                        
                        <div
                            class="absolute bg-black/10 inset-0 flex items-center justify-center active:bg-black/20 rounded-xl"
                            onclick={playVideo}
                        >
                            <span class="icon-[solar--play-bold] text-white text-4xl"></span>
                        </div>
                        
                        <IconButton
                            icon="icon-[mdi--trash] text-white text-xl"
                            class="absolute top-1 right-1 bg-red-400 active:bg-red-500"
                            onclick={deleteVideo}
                        />
                        
                        <span
                            class="absolute z-10 right-0 bottom-0 bg-black/50 text-white px-2 py-1 rounded-xl"
                        >{videoLengthText(videoData.value.length)}</span>
                    </div>
                    
                    <span class="font-bold">{videoData.value.name} - {fileSizeText(videoData.value.size)}</span>
                    
                    {compressing.value ? <>
                        <ProgressBar value={compressProgress.value}/>
                        <span>Compressing</span>
                        
                        <Button class="mt-2" onclick={cancelCompress}>Cancel Compression</Button>
                    </> : (
                        <Button class="mt-2" onclick={compressVideo}>Compress</Button>
                    )}
                    
                    <GainSlider
                        class="mt-4"
                        value={gain.value}
                        onChange={v => gain.value = v}
                    />
                </div>
            ) : uploading.value ? (
                <div class="flex flex-col items-center mt-4">
                    <ProgressBar value={uploadProgress.value}/>
                    <span>Upload</span>
                </div>
            ) : (
                <div class="grid grid-cols-2 p-6 gap-2">
                    <MainIcon
                        text="Record Video"
                        icon="icon-[fluent-color--video-32] text-7xl"
                        onclick={recordVideo}
                    />
                    
                    <MainIcon
                        text="Take Photo"
                        icon="icon-[flat-color-icons--photo-reel] text-7xl"
                        onclick={comingSoon}
                    />
                    
                    <MainIcon
                        text="Upload Video"
                        icon="icon-[fluent-color--cloud-32] text-7xl"
                        onclick={uploadVideo}
                    />
                    
                    <MainIcon
                        text="Upload Photo"
                        icon="icon-[fluent-color--camera-24] text-7xl"
                        onclick={comingSoon}
                    />
                </div>
            )}
        </div>
        
        <div class="fixed bottom-0 left-0 right-0 flex border-t border-fuchsia-700 z-10 bg-purple-300">
            <IconButton
                class="flex-1 py-2"
                icon="icon-[material-symbols--close] text-xl"
                onclick={cancel}
            />
            
            <IconButton
                class="flex-1 py-2"
                icon="icon-[material-symbols--check] text-xl"
                onclick={save}
            />
        </div>
    </div>
}

function MainIcon(props: {
    text: string
    icon: string
    onclick?: () => void
}) {
    return <button
        class="flex flex-col items-center bg-fuchsia-600/10 rounded-xl py-2 active:bg-fuchsia-600/20 transition-colors"
        onclick={props.onclick}
    >
        <span
            class={twMerge(
                "",
                props.icon,
            )}
        />
        <span class="text-sm font-bold text-fuchsia-700">{props.text}</span>
    </button>
}

function ProgressBar(props: { value: number }) {
    return <div
        class="self-stretch bg-gray-400 mx-6 rounded-full h-5 relative mt-2"
    >
        <div
            class="bg-fuchsia-500 h-5 rounded-full"
            style={{
                width: `${props.value * 100}%`
            }}
        />
    </div>
}

function GainSlider(props: {
    value: number,
    onChange: (v: number) => void,
    class?: string
}) {
    let container: HTMLDivElement
    
    const knobWidth = window.innerWidth * 0.07
    const maxGain = 15
    
    const xPercent = derived(() => (props.value + maxGain) * 100 / (maxGain * 2))
    const isMouseDown = state(false)
    
    let rect: DOMRect
    
    function mouseDown() {
        isMouseDown.value = true
    }
    
    function mouseMove(e: TouchEvent) {
        if (!isMouseDown.value) return
        
        let linearValue = ((e.touches[0].clientX - rect.left) * 2 / rect.width) - 1
        linearValue = Math.max(-1, linearValue)
        linearValue = Math.min(1, linearValue)
        
        const db = Math.floor(linearValue * maxGain)
        props.onChange(db)
    }
    
    function mouseUp() {
        if (!isMouseDown.value) return
        
        isMouseDown.value = false
    }
    
    onMount(() => {
        document.addEventListener('touchmove', mouseMove)
        document.addEventListener('touchend', mouseUp)
        
        setTimeout(() => {
            rect = container.getBoundingClientRect()
        }, 0)
    })
    
    onDestroy(() => {
        document.removeEventListener('touchmove', mouseMove)
        document.removeEventListener('touchend', mouseUp)
    })
    
    return <div
        class={twMerge(
            "flex flex-col self-stretch items-center",
            props.class
        )}
    >
        <div>{props.value}dB</div>
        
        <div
            class="self-stretch mx-6 flex flex-col h-6 justify-center relative"
            ref={v => container = v}
        >
            <div
                class="bg-gray-400 h-2 rounded-full"
            />
            
            <div
                class={twMerge(
                    "absolute rounded-full",
                    isMouseDown.value ? "bg-fuchsia-400" : "bg-fuchsia-500"
                )}
                style={{
                    width: `${knobWidth}px`,
                    height: `${knobWidth}px`,
                    left: `calc(${xPercent.value}% - ${knobWidth / 2}px)`
                }}
                ontouchstart={mouseDown}
            />
        </div>
    </div>
}

function videoLengthText(length: number): string {
    const s = Math.round(length / 1000) % 60
    const m = Math.floor(length / (60 * 1000)) % 60
    const h = Math.floor(length / (60 * 60 * 1000))
    
    const hs = h > 0 ? `${h}:` : ''
    const ms = (h > 0 ? m.toString().padStart(2, '0') : m) + ':'
    const ss = s.toString().padStart(2, '0')
    
    return `${hs}${ms}${ss}`
}

function fileSizeText(size: number): string {
    if (size < 1024) {
        return `${size}B`
    }
    else if (size < 1024 * 1024) {
        return `${numberToStringPrecision(size / 1024)}KB`
    }
    else if (size < 1024 * 1024 * 1024) {
        return `${numberToStringPrecision(size / (1024 * 1024))}MB`
    }
    else {
        return `${numberToStringPrecision(size / (1024 * 1024 * 1024))}GB`
    }
}

function numberToStringPrecision(n: number): string {
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

async function readFile(): Promise<string> {
    return new Promise((res, rej) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = ".mp4"

        input.addEventListener('change', function(event) {
            const selectedFile = (event?.target as any).files[0]
            
            if (selectedFile) {
                console.log(selectedFile)
            }
        });

        input.click()
    })
}