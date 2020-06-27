export class Protocol {
    protected encoder: TextEncoder;
    protected decoder: TextDecoder;
    protected readonly conn: Connection;

    constructor(conn: Connection) {
        this.conn = conn;
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    async data_in(buffer: Uint8Array) {
        let decoded = this.decoder.decode(buffer);
        console.log(`RECEIVED TEXT FROM ${this}: ${decoded}`);
        await this.data_out(this.encoder.encode(`ECHO: ${decoded}`));
    }

    async data_out(buffer: Uint8Array) {
        await this.conn.send(buffer);
    }
}

export class Handler {
    private readonly conn: Connection;

    constructor(conn: Connection) {
        this.conn = conn;
    }
}


export class Connection {
    public readonly id: number;
    public readonly server: Server;
    public readonly protocol: Protocol;
    public readonly handler: Handler;
    public readonly stream: Deno.Conn;

    constructor(conn: Deno.Conn, id: number, srv: Server) {
        this.id = id;
        this.server = srv;
        this.stream = conn;
        this.protocol = new srv.protocol(this);
        this.handler = new srv.handler(this);
    }

    async start() {

        while(true) {
            let buffer = new Uint8Array(4096);
            let data = await this.stream.read(buffer);
            if(data != null) {
                await this.protocol.data_in(buffer.slice(0, data));
            }
            else {
                console.log("ERROR READING!");
                break;
            }
        }
    }

    async send(buffer: Uint8Array) {
        let written = await this.stream.write(buffer);
        console.log(`Bytes written: ${written}`);
    }
}


export class Server {
    private readonly name: string;
    private readonly listener: Deno.Listener;
    public readonly protocol: typeof Protocol;
    public readonly handler: typeof Handler;
    private readonly manager: NetworkManager;

    constructor(manager: NetworkManager, name: string, listener: Deno.Listener, protocol: typeof Protocol, handler: typeof Handler) {
        this.manager = manager;
        this.name = name;
        this.listener = listener;
        this.protocol = protocol;
        this.handler = handler;
    }

    async start() {
        for await (const conn of this.listener) {
            let id = this.manager.generate_id();
            let connect = new Connection(conn, id, this);
            this.manager.register_connection(connect);
        }
    }
}


export class NetworkManager {
    private next_id: number;
    private tls: boolean;
    private readonly cert: string;
    private readonly key: string;
    private protocols: Map<string, typeof Protocol>;
    private handlers: Map<string, typeof Handler>;
    private servers: Map<string, Server>;
    private connections: Map<number, Connection>;

    constructor(certFile = "", keyFile = "") {
        this.next_id = 0;
        this.tls = false;
        this.cert = certFile;
        this.key = keyFile;
        this.servers = new Map<string, Server>();
        this.connections = new Map<number, Connection>();
        this.protocols = new Map<string, typeof Protocol>();
        this.handlers = new Map<string, typeof Handler>();
    }

    generate_id() : number {
        this.next_id+=1;
        return this.next_id;
    }

    async register_connection(conn: Connection) {
        this.connections.set(conn.id, conn);
        await conn.start();
    }

    register_protocol(name: string, protocol: typeof Protocol) {
        this.protocols.set(name, protocol);
    }

    register_handler(name: string, handler: typeof Handler) {
        this.handlers.set(name, handler);
    }

    async start_server(name: string, addr: string, port: number, protocol: string, handler: string, tls: boolean) {
        if (!this.protocols.has(protocol)) {
            console.log("Unrecognized protocol!");
            return;
        }
        let prot = this.protocols.get(protocol);

        if(!this.handlers.has(handler)) {
            console.log("Unrecognized handler!");
            return;
        }
        let hand = this.handlers.get(handler);

        let listener;

        if (tls) {
            listener = Deno.listenTls({hostname: addr, port: port, certFile: this.cert, keyFile: this.key});
        }
        else {
            listener = Deno.listen({hostname: addr, port: port});
        }

        // not sure why this is freaking out.
        // @ts-ignore
        let srv = new Server(this, name, listener, prot, hand);
        this.servers.set(name, srv);
        await srv.start();
    }
}