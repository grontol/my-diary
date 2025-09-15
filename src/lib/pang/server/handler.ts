type HandlerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type Handler = {
    path: string
    method: HandlerMethod
    fn: (req: Request, res: Response) => void | Promise<void>
}

type HandlerGroup = {
    path: string
    handlers: Handler[]
}

async function getMe(req: Request, res: Response) {
    
}

export const MeApi: HandlerGroup = {
    path: '',
    handlers: [
        { path: '', method: 'GET', fn: getMe }
    ]
}