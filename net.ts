import {Application} from "./app.ts";
import { fs } from "./deps.ts";

// This class is the basic protocol.
export class Connection {
    protected encoder: TextEncoder = new TextEncoder();
    protected decoder: TextDecoder = new TextDecoder();
    public readonly id: number;
    public readonly server: Server;
    public readonly stream: Deno.Conn;
    public readonly protocol: string = "raw";
    private readonly buffer: Uint8Array = new Uint8Array(4096);

    constructor(conn: Deno.Conn, id: number, srv: Server) {
        this.id = id;
        this.server = srv;
        this.stream = conn;
    }

    async start() {
        this.read_data();
    }

    async read_data() {
        let buffer = new Uint8Array(4096);
        this.stream.read(buffer).then((data: number | null) => {
                if(data !== null) {
                    if(data > 0) {
                        this.data_in(buffer.slice(0, data));
                    }
                    this.read_data();
                }
                else {
                    console.log("CONNECTION CLOSED RECEIVED EOF");
                }
        });
    }

    // This function is meant to be overloaded.
    async data_in(buffer: Uint8Array) {
        console.log(`"RECEIVED ${buffer.length} Bytes!`);
    }

    async data_out(buffer: Uint8Array) {
        this.stream.write(buffer);
    }

}


export class Server {
    private readonly name: string;
    private readonly listener: Deno.Listener;
    public readonly protocol: typeof Connection;
    private readonly manager: NetworkManager;

    constructor(manager: NetworkManager, name: string, listener: Deno.Listener, protocol: typeof Connection) {
        this.manager = manager;
        this.name = name;
        this.listener = listener;
        this.protocol = protocol;
    }

    async start() {
        for await (const conn of this.listener) {
            if(conn) {
                let id = this.manager.generate_id();
                let connect = new this.protocol(conn, id, this);
                this.manager.register_connection(connect);
            }
            else {
                break;
            }
        }
    }

    async accept() {
        this.listener.accept().then((conn: Deno.Conn | null) => {
            if(conn) {
                let id = this.manager.generate_id();
                let connect = new this.protocol(conn, id, this);
                this.manager.register_connection(connect);
                this.accept();
            }
        });
    }
}

export class NetworkManager {
    public readonly app: Application;
    private next_id: number = 0;
    private readonly tls: boolean = false;
    private readonly cert: string;
    private readonly key: string;
    private protocols: Map<string, typeof Connection> = new Map<string, typeof Connection>();
    private servers: Map<string, Server> = new Map<string, Server>();
    private connections: Map<number, Connection> = new Map<number, Connection>();

    constructor(app: Application) {
        this.app = app;

        // let's try to setup TLS if possible.
        this.cert = app.config.config.tls.cert;
        this.key = app.config.config.tls.key;
        if(fs.exists(this.cert) && fs.exists(this.key)) {
            //this.tls = true;
        }
    }

    generate_id() : number {
        this.next_id+=1;
        return this.next_id;
    }

    async register_connection(conn: Connection) {
        this.connections.set(conn.id, conn);
        await conn.start();
    }

    register_protocol(name: string, protocol: typeof Connection) {
        this.protocols.set(name, protocol);
    }

    async start() {
        for (const sdef of this.app.config.config.server) {
            if(sdef.tls && !this.tls) {
                // Only use TLS if TLS is properly ready.
                continue;
            }
            this.start_server(sdef.name, sdef.interface, sdef.port, sdef.protocol, sdef.tls);
        }
    }

    async start_server(name: string, addr: string, port: number, protocol: string, tls: boolean) {

        let prot = this.protocols.get(protocol);
        if (prot === undefined) {
            throw "Unrecognized protocol!";
        }

        let listener;

        if (tls) {
            throw "TLS not supported yet!";
            //listener = Deno.listenTls({hostname: addr, port: port, certFile: this.cert, keyFile: this.key});
        }
        else {
            listener = Deno.listen({hostname: addr, port: port});
        }

        let srv = new Server(this, name, listener, prot);
        this.servers.set(name, srv);
        srv.start();
    }
}