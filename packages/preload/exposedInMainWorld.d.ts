interface Window {
    readonly ipc: { send: (channel: string, data: any) => void; on: (channel: string, listener: IpcRendererListener) => () => void; invoke: (channel: string, ...args: any) => Promise<any>; };
}
