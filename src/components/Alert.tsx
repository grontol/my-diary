import { Button } from "@/components/Button.jsx"
import { self } from "@pang/event-utils.js"
import { state } from "@pang/reactive.js"

type AlertType = 'info' | 'success' | 'warning' | 'error' | 'question'

type AlertData = {
    title: string
    message: string
    type: AlertType
    
    onOk?: () => MayPromise<void>
    onCancel?: () => MayPromise<void>
    onDismiss?: () => MayPromise<void>
}

const alertState = state<AlertData | null>(null)

export function Alert() {
    async function ok() {
        if (alertState.value?.onOk) await Promise.resolve(alertState.value?.onOk?.())
        if (alertState.value?.onDismiss) await Promise.resolve(alertState.value?.onDismiss?.())
        
        alertState.value = null
    }
    
    async function dismiss() {
        if (alertState.value?.onDismiss) await Promise.resolve(alertState.value?.onDismiss?.())
        
        alertState.value = null
    }
    
    return <>
        {alertState.value && (
            <div
                class="fixed inset-0 bg-black/50 flex justify-center items-center"
                onclick={self(dismiss)}
            >
                <div class="bg-white p-6 flex flex-col min-w-[80%] rounded-lg">
                    <span>{alertState.value.title}</span>
                    <span>{alertState.value.message}</span>
                    
                    <div class="flex justify-end">
                        <Button onclick={ok}>OK</Button>
                    </div>
                </div>
            </div>
        )}
    </>
}

export function showAlert(alert: AlertData) {
    alertState.value = alert
}