import { showAlert } from "@/components/Alert.jsx";
import { Button } from "@/components/Button.jsx";
import { ActorData, actorGetAll, actorImport } from "@/data/actor.js";
import { DiaryData, diaryGetAll, diaryImport } from "@/data/diary.js";
import { ResepData, resepGetAll, resepImport } from "@/data/resep.js";
import { TrackData, trackDataGetAll, trackDataImport } from "@/data/track_data.js";
import { TrackingData, trackingDataGetAll, trackingImport } from "@/data/tracking.js";
import { envAsAndroidFileUrl, envIsAndroidMode, getAndroidEnv } from "@/utils/env.js";
import { state } from "@pang/reactive.js";

export function Sync() {
    async function exports() {
        const data = {
            actor: await actorGetAll(),
            track_data: await trackDataGetAll(),
            diary: await diaryGetAll(),
            tracking: await trackingDataGetAll(),
            resep: await resepGetAll(),
        }
        
        const fileName = createNameCurDate("diary-tracking-data")
        
        if (envIsAndroidMode()) {
            getAndroidEnv()?.export(JSON.stringify(data), fileName)
        }
        else {
            writeFile(JSON.stringify(data), fileName, "text/plain")
        }
    }
    
    async function imports() {
        try {
            const content = await readFile()
            const data: {
                actor?: ActorData[],
                track_data?: TrackData[],
                diary?: DiaryData[],
                tracking?: TrackingData[],
                resep?: ResepData[],
            } = JSON.parse(content)
            
            if (data.actor) await actorImport(data.actor)
            if (data.track_data) await trackDataImport(data.track_data)
            if (data.diary) await diaryImport(data.diary)
            if (data.tracking) await trackingImport(data.tracking)
            if (data.resep) await resepImport(data.resep)
                
            showAlert({
                title: "Sukses",
                message: "Import data sukses",
                type: "info",
            })
        }
        catch (e: any) {
            showAlert({
                title: "Error",
                message: e?.message ?? e?.toString() ?? "Error importing data",
                type: "error"
            })
        }
    }
    
    const isServerRunning = state(getAndroidEnv()?.isServerRunning() ?? false)
    
    async function startServer() {
        getAndroidEnv()?.startServer()
        isServerRunning.value = true
    }
    
    async function stopServer() {
        getAndroidEnv()?.stopServer()
        isServerRunning.value = false
    }
    
    function deleteUnusedMedia() {
        getAndroidEnv()?.deleteUnusedMedia()
        showAlert({
            title: "Done",
            message: "Deleting is done",
            type: "info"
        })
    }
    
    return <div class="flex flex-col p-6 gap-4">
        {envIsAndroidMode() && (
            <div>This is Android</div>
        )}
        
        <Button onclick={exports}>Export</Button>
        <Button onclick={imports}>Import</Button>
        
        {envIsAndroidMode() && (
            <>
                {isServerRunning.value ? (
                    <Button onclick={stopServer}>Stop Server</Button>
                ) : (
                    <Button onclick={startServer}>Start Server</Button>
                )}                
            </>
        )}
        
        <Button onclick={deleteUnusedMedia}>Delete Unused Media</Button>
    </div>
}

async function readFile(): Promise<string> {
    return new Promise((res, rej) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = ".txt"

        input.addEventListener('change', function(event) {
            const selectedFile = (event?.target as any).files[0]
            
            if (selectedFile) {
                const reader = new FileReader()
                
                reader.onload = function(e) {
                    const content = e.target?.result
                    input.remove()
                    res(content?.toString() ?? '')
                }
                
                reader.onerror = function(e) {
                    console.log("Error reading file : ", e.target?.error)
                    input.remove()
                    rej(e.target?.error)
                }
                
                reader.readAsText(selectedFile)
            }
        });

        input.click()
    })
}

function writeFile(data: string, filename: string, mime: string) {
    const blobData = new Blob([data], { type: mime })
    const urlToBlob = window.URL.createObjectURL(blobData)

    const a = document.createElement('a')
    a.style.setProperty('display', 'none')
    document.body.appendChild(a)
    a.href = urlToBlob
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(urlToBlob)
    a.remove()
}

function createNameCurDate(name: string) {
    const d = new Date()
    const ye = d.getFullYear()
    const mo = (d.getMonth() + 1).toString().padStart(2, '0')
    const da = d.getDate().toString().padStart(2, '0')
    const ho = d.getHours().toString().padStart(2, '0')
    const mi = d.getMinutes().toString().padStart(2, '0')
    const se = d.getSeconds().toString().padStart(2, '0')
    
    return `${name}-${ye}-${mo}-${da}_${ho}-${mi}-${se}.txt`
}