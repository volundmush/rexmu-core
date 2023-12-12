import {Plugin, Core} from "../core.ts";
import {IConnection, ICore, Color, Capabilities} from "../types.ts";
import {WebsocketStream} from "../utils.ts";


export class WebsocketConnection implements IConnection {
    private readonly core: ICore;
    private readonly stream: WebsocketStream;
    public capabilities: Capabilities;
    private readonly name: string;
    private accountID: string | number | undefined;
    private loginTime: number | undefined;
    private idleTime = 0;

    constructor(core: ICore, stream: WebsocketStream, data: any) {
        this.stream = stream;
        this.core = core;
        this.capabilities = data.capabilities;
        this.name = data.name;
    }

    public getIdentifier() {
        return this.name;
    }

    public getRemoteAddress() {
        return this.capabilities.hostAddress;
    }

    public getHostnames() {
        return this.capabilities.hostNames;
    }

    public getClientName() {
        return this.capabilities.clientName;
    }

    public getClientVersion() {
        return this.capabilities.clientVersion;
    }

    public getClientWidth() {
        return this.capabilities.width;
    }

    public getProtocolName() {
        return this.capabilities.encryption ? "telnets" : "telnet";
    }

    public getScreenReader() {
        return this.capabilities.screenReader;
    }

    public getColor() {
        return this.capabilities.color;
    }

    public getAccountID() {
        return this.accountID;
    }

    public getProtocolOptions() {
        return {};
    }

    public getConnectionTime() {
        return this.capabilities.connectionTime;
    }

    public getLoginTime() {
        return this.loginTime;
    }

    public getIdleTime() {
        return this.idleTime;
    }

    public write(data: any) {
        this.stream.ws.send(data);
    }

    public async close() {
        await this.stream.ws.close();
    }

    public async atUpdate(delta: number, source: string) {

    }

    public async run() {

        for await (const event of this.stream.rs) {
            const data = JSON.parse(event.data);
            console.log(`${this.name} got data: ${data}`);
            if ("capabilities" in data) {
                this.capabilities = data.capabilities;
            }
            if ("text" in data) {
                const t = data.text;
                console.log(`${this.name} got text: ${t}`);
                this.write(JSON.stringify({text: `ECHO: ${t}`}));
            }
        }

        // TODO: handle stream ending...

    }

    public async shutdown() {
        await this.close();
    }

    public async finalize() {
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
        this.server = Deno.serve(this.config as Deno.ServeOptions, this.handleConnections);
    }

    protected async handleConnections(request: Request, info: Deno.ServeHandlerInfo) {
        if (request.headers.get("upgrade") != "websocket") {
            return new Response(null, { status: 501 });
        }

        const { socket, response } = Deno.upgradeWebSocket(request);

        const stream = new WebsocketStream(socket);

        let data;
        for await (const msg of stream.rs) {
            try {
                data = JSON.parse(msg.data) as Capabilities;
                if(!(("name" in data) && ("capabilities" in data))) {
                    throw new Error("Invalid data.");
                }
            }
            catch (err) {
                // if it's not, we just kill the connection...
                stream.close();
                return response;
            }
            break;
        }

        // then create a connection using the socket.
        const conn = new (this.constructor as typeof PortalPlugin).connectionClass(this.core, stream, data);
        this.core.handleConnection(conn);

        return response;
    }

}

export function init(key: string, core: ICore) {
    core.addPlugin(PortalPlugin);
}