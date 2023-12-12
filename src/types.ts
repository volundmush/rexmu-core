export type Newable<T> = { new (...args: any[]): T; };

export interface RexConfig {
    gameName: string;
    modules: { [key: string]: any }
    pluginConfig: { [key: string]: any }
}

export interface IPlugin {
    getName(): string;
    getDependencies(): string[];
    atInit(): Promise<void>;
    atLoad(): Promise<void>;
    atFinalize(): Promise<void>;

    // Called when the server is going to reload.
    atReload(): Promise<void>;
    // Called when the server is going to shut down.
    atShutdown(): Promise<void>;
    // Called when the server has recovered from a reload.
    atWarmStart(): Promise<void>;
    // Called when the server has recovered from a shutdown.
    atColdStart(): Promise<void>;

    // Used by systems that implement a main loop, game loop, or similar.
    getUpdateOrder(): number;
    atUpdate(delta: number, source: string): Promise<void>;

}

export interface IConnection {
    getIdentifier(): string;
    getRemoteAddress(): string;
    getHostnames(): string[];
    getClientName(): string;
    getClientVersion(): string;
    getClientWidth(): number;
    getProtocolName(): string;
    getScreenReader(): boolean;
    getColor(): number;
    getAccountID(): string | number | undefined;
    getProtocolOptions(): { [key: string]: any };
    getConnectionTime(): number;
    getLoginTime(): number | undefined;
    getIdleTime(): number;

    // Used by systems that implement a main loop, game loop, or similar.
    atUpdate(delta: number, source: string): Promise<void>;
    run(): Promise<void>;
}

export interface ICore {
    getPlugins(): IPlugin[];
    getConnection(arg0: string): IConnection | undefined;
    getConnections(): IConnection[];
    getConnectionCount(): number;
    handleConnection(arg0: IConnection): Promise<void>;
    getConfig(): RexConfig;
    addPlugin<T extends IPlugin>(pluginClass: Newable<T>): void;
    addService(service: Promise<void>): void;
    run(): Promise<void>;

    // Called when the server is going to reload.
    atReload(): Promise<void>;
    // Called when the server is going to shut down.
    atShutdown(): Promise<void>;
    // Called when the server has recovered from a reload.
    atWarmStart(): Promise<void>;
    // Called when the server has recovered from a shutdown.
    atColdStart(): Promise<void>;

    atInit(): Promise<void>;
    atLoad(): Promise<void>;
    atFinalize(): Promise<void>;
    getAbortSignal(): AbortSignal;

}

export enum Color {
    NoColor = 0,
    Standard = 1,
    Xterm256 = 2,
    TrueColor = 3
}

export class Capabilities {
    public encryption = false;
    public clientName = "UNKNOWN";
    public clientVersion = "UNKNOWN";
    public hostAddress = "UNKNOWN";
    public hostNames: string[] = [];
    public connectionTime = 0;
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