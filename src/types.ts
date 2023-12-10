export type Newable<T> = { new (...args: any[]): T; };

export interface RexConfig {
    gameName: string;
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
    atUpdate(delta: number): Promise<void>;

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
    atUpdate(delta: number): Promise<void>;
}

export interface ICore {
    getPlugins(): IPlugin[];
    getConnection(arg0: string): IConnection | undefined;
    getConnections(): IConnection[];
    getConnectionCount(): number;
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

