import { showAlert } from "@/components/Alert.jsx";
import { Button, IconButton } from "@/components/Button.jsx";
import { TextInput } from "@/components/TextInput.jsx";
import { ActorData, actorGetAll } from "@/data/actor.js";
import { DiaryMediaData } from "@/data/diary.js";
import { AudioData, envAsAndroidFileUrl, getAndroidEnv, PhotoData, VideoData } from "@/utils/env.js";
import { formatFileSizeText, formatVideoLengthText } from "@/utils/format.js";
import { foreach } from "@pang/core.js";
import { onDestroy, onMount } from "@pang/lifecycle.js";
import { derived, state } from "@pang/reactive.js";
import { twMerge } from "tailwind-merge";

const sampleMedia: AudioData = {
    type: "audio",
    name: "diary_1759478849449_audio.m4a",
    size: 135889000,
    duration: 5200,
}

export function MediaDiaryInput(props: {
    onCancel: () => void
    onSave: (acrot: string, data: VideoData | PhotoData | AudioData, gain: number, note: string) => void
    data?: DiaryMediaData
}) {
    const actors = state<ActorData[]>([])
    const selectedActor = state(props.data?.actor ?? "")
    const mediaData = state<VideoData | PhotoData | AudioData | null>(null)
    
    if (props.data) {
        if (props.data.type === "video") {
            mediaData.value = {
                type: "video",
                name: props.data.content.video,
                length: props.data.content.duration,
                size: props.data.content.size,
                thumbnail: props.data.content.thumbnail,
            }
        }
        else if (props.data.type === "photo") {
            mediaData.value = {
                type: "photo",
                name: props.data.content.image,
                size: props.data.content.size,
            }
        }
        else if (props.data.type === "audio") {
            mediaData.value = {
                type: "audio",
                name: props.data.content.audio,
                duration: props.data.content.duration,
                size: props.data.content.size,
            }
        }
        else {
            alert("UNKNOWN MEDIA")
        }
    }
    
    const compressing = state(false)
    const compressError = state(false)
    const compressProgress = state(0)
    
    const uploading = state(false)
    const uploadProgress = state(0)
    
    const recordingAudio = state(false)
    const recordingAudioAmp = state(0)
    
    const gain = state((props.data?.type === "video" || props.data?.type === "audio") ? props.data.content.gain : 0)
    const note = state(props.data?.content.note ?? "")
    
    const colledtedMedias: (VideoData | PhotoData | AudioData)[] = []
    
    function save() {
        if (!mediaData.value) {
            showAlert({
                title: "No...",
                message: "Isi media dulu dong!",
                type: "info"
            })
            return
        }
        
        const toDelete: string[] = []
        
        if (!props.data) {
            // Kalau save dan add, hapus semua collected videos kecuali yang terakhir
            
            for (let a = 0; a < colledtedMedias.length - 1; a++) {
                const m = colledtedMedias[a]
                
                toDelete.push(m.name)
                
                if (m.type === "video") {
                    toDelete.push(m.thumbnail)
                }
            }
        }
        else {
            // Kalau save dan edit, hapus semua collected videos kecuali yang terakhir + original video (kalau ada video baru)
            
            if (colledtedMedias.length > 0) {                
                if (props.data.type === "video") {
                    toDelete.push(props.data.content.video)
                    toDelete.push(props.data.content.thumbnail)
                }
                else if (props.data.type === "photo") {
                    toDelete.push(props.data.content.image)
                }
                else {
                    toDelete.push(props.data.content.audio)
                }
            }
            
            for (let a = 0; a < colledtedMedias.length - 1; a++) {
                const m = colledtedMedias[a]
                
                toDelete.push(m.name)
                
                if (m.type === "video") {
                    toDelete.push(m.thumbnail)
                }
            }
        }
        
        getAndroidEnv()?.deleteMedia(toDelete)
        
        props.onSave(selectedActor.value, mediaData.value, gain.value, note.value)
    }
    
    function cancel() {
        // Kalau cancel, hapus semua collected videos
        getAndroidEnv()?.deleteMedia(
            colledtedMedias.map(x => x.type === "video" ? [x.name, x.thumbnail] : [x.name]).flatMap(x => x)
        )
        
        props.onCancel?.()
    }
    
    function recordVideo() {
        getAndroidEnv()?.recordVideo((success, video) => {
            if (success) {
                mediaData.value = video ?? null
                
                if (video) {
                    colledtedMedias.push(video)
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
                    mediaData.value = video ?? null
                    
                    if (video) {
                        colledtedMedias.push(video)
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
        if (!mediaData.value || mediaData.value.type !== "video") return
        
        compressError.value = false
        compressing.value = true
        
        getAndroidEnv()?.compressVideo(mediaData.value.name, (success, completed, progress, newSize) => {
            if (!success) {
                compressing.value = false
                compressError.value = true
            }
            else if (completed) {
                compressing.value = false
                
                if (mediaData.value) {
                    mediaData.value.size = newSize
                    mediaData.trigger()
                    
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
    
    function takePhoto() {
        getAndroidEnv()?.takePhoto((success, photo) => {
            if (success) {
                mediaData.value = photo ?? null
                
                if (photo) {
                    colledtedMedias.push(photo)
                }
            }
        })
    }
    
    function uploadPhoto() {
        uploading.value = true
        
        getAndroidEnv()?.uploadPhoto((success, progress, photo) => {
            if (success) {
                if (progress >= 1) {
                    uploading.value = false
                    mediaData.value = photo ?? null
                    
                    if (photo) {
                        colledtedMedias.push(photo)
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
    
    function recordAudio() {
        recordingAudio.value = true
        
        getAndroidEnv()?.recordAudio(amp => {
            recordingAudioAmp.value = amp
        })
    }
    
    function stopRecordAudio() {
        getAndroidEnv()?.stopRecordAudio(data => {
            recordingAudio.value = false
            mediaData.value = data ?? null
            
            if (data) {
                colledtedMedias.push(data)
            }
        })
    }
    
    function uploadAudio() {
        uploading.value = true
        
        getAndroidEnv()?.uploadAudio((success, progress, audio) => {
            console.log(success, progress, audio)
            if (success) {
                if (progress >= 1) {
                    uploading.value = false
                    mediaData.value = audio ?? null
                    
                    if (audio) {
                        colledtedMedias.push(audio)
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
    
    function deleteMedia() {
        showAlert({
            title: "Konfirmasi",
            message: "Delete media?",
            type: "question",
            onOk() {                
                mediaData.value = null
            },
        })
    }
    
    function playMedia() {
        if (mediaData.value?.type === "video") {
            getAndroidEnv()?.playVideo(mediaData.value.name, gain.value)
        }
        else if (mediaData.value?.type === "photo") {
            getAndroidEnv()?.viewPhoto(mediaData.value.name)
        }
        else if (mediaData.value?.type === "audio") {
            getAndroidEnv()?.playAudio(mediaData.value.name, gain.value)
        }
    }
    
    function actorChanged(e: Event) {
        // @ts-ignore
        selectedActor.value = e.target?.value ?? ''
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
            
            {mediaData.value ? (
                <div class="flex flex-col items-center mt-4">
                    <div class="relative self-center">
                        {mediaData.value.type === "audio" ? (
                            <div class="w-60% px-10 py-6sssss">
                                <span class="icon-[mdi--waveform] text-9xl text-pink-800"/>
                            </div>
                        ) : (
                            <img
                                src={envAsAndroidFileUrl(mediaData.value.type === "video" ? mediaData.value.thumbnail : mediaData.value.name)}
                                width={`${window.innerWidth * 0.5}px`}
                                class="rounded-xl"
                            />
                        )}
                        
                        <div
                            class="absolute bg-black/10 inset-0 flex items-center justify-center active:bg-black/20 rounded-xl"
                            onclick={playMedia}
                        >
                            {mediaData.value.type === "video" || mediaData.value.type === "audio" ? (
                                <span class="icon-[solar--play-bold] text-white text-4xl"></span>
                            ) : (
                                <span class="icon-[ion--open] text-white text-4xl"></span>
                            )}
                        </div>
                        
                        <IconButton
                            icon="icon-[mdi--trash] text-white text-xl"
                            class="absolute top-1 right-1 bg-red-400 active:bg-red-500"
                            onclick={deleteMedia}
                        />
                        
                        {mediaData.value.type === "video" ? (
                            <span
                                class="absolute z-10 right-0 bottom-0 bg-black/50 text-white px-2 py-1 rounded-xl"
                            >{formatVideoLengthText(mediaData.value.length)}</span>
                        ) : mediaData.value.type === "audio" ? (
                            <span
                                class="absolute z-10 right-0 bottom-0 bg-black/50 text-white px-2 py-1 rounded-xl"
                            >{formatVideoLengthText(mediaData.value.duration)}</span>
                        ) : null}
                    </div>
                    
                    <span class="font-bold mt-2">{mediaData.value.name} - {formatFileSizeText(mediaData.value.size)}</span>
                    
                    {(mediaData.value.type === "video" || mediaData.value.type === "audio") && (
                        <>
                            {mediaData.value.type === "video" ? <>
                                {compressing.value ? <>
                                    <ProgressBar value={compressProgress.value}/>
                                    <span>Compressing</span>
                                    
                                    <Button class="mt-2" onclick={cancelCompress}>Cancel Compression</Button>
                                </> : (
                                    <Button class="mt-2" onclick={compressVideo}>Compress</Button>
                                )}
                            </> : null}
                            
                            <GainSlider
                                class="mt-4"
                                value={gain.value}
                                onChange={v => gain.value = v}
                            />
                        </>
                    )}
                </div>
            ) : uploading.value ? (
                <div class="flex flex-col items-center mt-4">
                    <ProgressBar value={uploadProgress.value}/>
                    <span>Upload</span>
                </div>
            ) : recordingAudio.value ? (
                <div class="flex items-center justify-center w-[80%] aspect-square relative self-center mt-6">
                    <div
                        class="bg-pink-300 aspect-square rounded-full absolute"
                        style={{
                            width: `${60 + 40 * recordingAudioAmp.value / 90}%`
                        }}
                    />
                    <div
                        class="bg-pink-600 active:bg-pink-700 w-[60%] aspect-square rounded-full absolute flex items-center justify-center"
                        onclick={stopRecordAudio}
                    >
                        <span class="icon-[ic--round-stop] text-7xl text-white"/>
                    </div>
                </div>
            ) : (
                <div class="grid grid-cols-2 p-6 gap-2">
                    <MainIcon
                        text="Record Video"
                        icon="icon-[fluent-color--video-32] text-7xl"
                        onclick={recordVideo}
                    />
                    
                    <MainIcon
                        text="Upload Video"
                        icon="icon-[fluent-color--cloud-32] text-7xl"
                        onclick={uploadVideo}
                    />
                    
                    <MainIcon
                        text="Take Photo"
                        icon="icon-[flat-color-icons--photo-reel] text-7xl"
                        onclick={takePhoto}
                    />
                    
                    <MainIcon
                        text="Upload Photo"
                        icon="icon-[fluent-color--camera-24] text-7xl"
                        onclick={uploadPhoto}
                    />
                    
                    <MainIcon
                        text="Record Audio"
                        icon="icon-[emojione-v1--bull-horn-with-sound-waves] text-7xl"
                        onclick={recordAudio}
                    />
                    
                    <MainIcon
                        text="Upload Audio"
                        icon="icon-[fxemoji--wave] text-7xl"
                        onclick={uploadAudio}
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
    const maxGain = 30
    
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
