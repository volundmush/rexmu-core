import {Plugin, Core} from "../core.ts";
import {IConnection, ICore} from "../types.ts";




enum Color {
    NoColor = 0,
    Standard = 1,
    Xterm256 = 2,
    TrueColor = 3
}

class Capabilities {
    public encryption = false;
    public clientName = "UNKNOWN";
    public clientVersion = "UNKNOWN";
    public hostAddress = "UNKNOWN";
    public hostNames: string[] = [];
    public encoding = "ascii";
    public color: Color = Color.NoColor;
    public width = 78;
    public height = 24;
    public mccp2 = false;
    public mccp2Enabled = false;
    public mccp3 = false;
    public mccp3Enabled = false;
    public gmcp = false;
    public msdp = false;
    public mssp = false;
    public mxp = false;
    public mtts = false;
    public naws = false;
    public sga = false;
    public linemode = false;
    public forceEndline = false;
    public screenReader = false;
    public mouseTracking = false;
    public vt100 = false;
    public oscColorPalette = false;
    public proxy = false;
    public mnes = false;
}

export class WebsocketConnection implements IConnection {
    private readonly socket: WebSocket;

    constructor(core: ICore, socket: WebSocket, capabilities: Capabilities) {
        this.socket = socket;
    }

    public async write(data: Uint8Array): Promise<void> {
        await this.socket.send(data);
    }

    public async read(): Promise<Uint8Array> {
        const { value, done } = await this.socket.receive();
        if (done) {
            throw new Error("Connection closed.");
        }
        return value;
    }

    public async close(): Promise<void> {
        await this.socket.close();
    }

    public async run(): Promise<void> {
        while (true) {
            const data = await this.read();
            await this.write(data);
        }
    }

    public async shutdown(): Promise<void> {
        await this.close();
    }

    public async finalize(): Promise<void> {
        await this.close();
    }

}

export const DefaultPortalConfig: Deno.ServeOptions = {
    hostname: "127.0.0.1",
    port: 4001
}

export class PortalPlugin extends Plugin {
    private readonly config: Deno.ServeOptions;
    private server?: Deno.HttpServer;
    private readonly sockets: WebSocket[] = [];

    static connectionClass = WebsocketConnection;

    constructor(core: Core) {
        super(core);
        this.config = {...DefaultPortalConfig, ...core.getConfig().pluginConfig[this.getName()],
            ...{signal: this.core.getAbortSignal()}};
    }

    public getName() {
        return "portal";
    }

    public async atInit() {
        this.server = Deno.serve(this.config, this.handleConnections);
    }

    protected async handleConnections(request: Request, info: Deno.ServeHandlerInfo) {
        if (request.headers.get("upgrade") != "websocket") {
            return new Response(null, { status: 501 });
        }

        const { socket, response } = Deno.upgradeWebSocket(request);
        this.sockets.push(socket);

        socket.onopen = (event) => this.atConnectionOpen(socket, event);
        socket.onclose = (event) => this.atConnectionClose(socket, event);
        socket.onmessage = (event) => this.createWebsocketConnection(socket, event);

        return response;
    }

    protected atConnectionOpen(socket: WebSocket, event: Event) {
        socket.onopen = null;
    }

    protected atConnectionClose(socket: WebSocket, event: CloseEvent) {
        socket.onclose = null;
        this.removeConnection(socket);
    }

    protected removeConnection(socket: WebSocket) {
        const idx = this.sockets.indexOf(socket);
        if (idx >= 0) {
            this.sockets.splice(idx, 1);
        }
    }

    protected createWebsocketConnection(socket: WebSocket, event: MessageEvent) {
        // first we check if event.data is a string and valid JSON...
        let data: any;
        try {
            data = JSON.parse(event.data) as Capabilities;
            if(!(("name" in data) && ("capabilities" in data))) {
                throw new Error("Invalid data.");
            }
        }
        catch (err) {
            // if it's not, we just kill the connection...
            socket.close();
            this.removeConnection(socket);
            return;
        }

        // then create a connection using the socket.
        const conn = new (this.constructor as typeof PortalPlugin).connectionClass(this.core, socket, data);
    }

}

