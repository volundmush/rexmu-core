import {Newable} from "./types.ts";
import {DefaultConfig} from "./config.ts";
import {RexConfig, IPlugin, ICore, IConnection} from "./types.ts";
import {log} from "../deps.ts";


export class Plugin implements IPlugin {

    protected readonly core: ICore;

    constructor(core: ICore) {
        this.core = core;
    }

    public async atUpdate(delta: number, source: string) {

    }
    public getUpdateOrder() {
        return 0;
    }

    public async atColdStart() {

    }
    public async atWarmStart() {

    }
    public async atShutdown() {

    }
    public async atReload() {

    }

    public getName() {
        return "plugin";
    }

    public getDependencies() {
        return [];
    }

    public async atInit() {

    }

    public async atLoad() {
        // Do nothing.
    }

    public async atFinalize() {

    }

}

export class Core implements ICore {
    private readonly pluginsMap: Map<string, IPlugin> = new Map<string, IPlugin>();
    private readonly modules: Map<string, any> = new Map<string, any>();
    private readonly config: RexConfig;
    private readonly plugins: IPlugin[] = [];
    private readonly connections: Map<string, IConnection> = new Map<string, IConnection>();
    private readonly services: Promise<void>[] = [];
    private loaded = false;
    private readonly abortController: AbortController = new AbortController();

    constructor(config: Partial<RexConfig>) {
        this.config = {...DefaultConfig, ...config};
    }

    public getAbortSignal(): AbortSignal {
        return this.abortController.signal;
    }

    protected async setup() {
        await this.setupLogger();
        await this.setupModules();
    }

    protected async setupModules() {
        for (const [key, value] of this.config.modules.entries()) {
            let mod;
            log.info(`Loading module '${key}' from '${value}'...`);
            if (typeof value === "string") {
                // If the value is a string, treat it as a module URL and import it
                mod = await import(value);
            } else {
                // Otherwise, assume it's an already-loaded module object
                mod = value;
            }

            // Check if the module has an `init` function before calling it
            if (mod && mod.init && typeof mod.init === "function") {
                this.modules.set(key, mod);
                mod.init(key, this);
            } else {
                throw new Error(`Module '${key}' does not have an init function or is not a module.`);
            }
        }
    }

    protected async setupLogger() {
        log.setup({
            handlers: {
                console: new log.handlers.ConsoleHandler("INFO"),
            },

            loggers: {
                default: {
                    level: "INFO",
                    handlers: ["console"],
                },
            },
        });
    }

    public async atColdStart() {

    }

    public async atWarmStart() {

    }

    public async atShutdown() {

    }

    public async atReload() {

    }

    public getConnectionCount(): number {
        return this.connections.size;
    }

    public getConnections(): IConnection[] {
      return [...this.connections.values()]
    }

    public getConnection(arg0: string) {
      return this.connections.get(arg0);
    }

    public getConfig(): RexConfig {
        return {...this.config};
    }

    public getPlugins(): IPlugin[] {
        return [...this.plugins];
    }

    public addPlugin<T extends IPlugin>(pluginClass: Newable<T>): void {
        // The 'new () => T' type is a constructor signature. It denotes a class that can be instantiated with 'new' and will produce an instance of type T.
        const pluginInstance = new pluginClass(this);
        if(this.pluginsMap.has(pluginClass.name)) {
            throw new Error(`Plugin '${pluginClass.name}' is already registered.`);
        }
        this.pluginsMap.set(pluginClass.name, pluginInstance);
    }

    public addService(service: Promise<void>) {
        this.services.push(service);
    }

    public getPlugin(name: string): IPlugin | undefined {
        return this.pluginsMap.get(name) as IPlugin;
    }

    public async init() {
        if(this.loaded) return;
        this.loaded = true;
        const plugins = [...this.pluginsMap.values()];

        // let's check dependencies first.
        for(const plugin of plugins) {
            for(const dependency of plugin.getDependencies()) {
                if(!this.pluginsMap.has(dependency)) {
                    throw new Error(`Plugin '${plugin.getName()}' depends on '${dependency}', which is not registered.`);
                }
            }
        }

        // Now we'll determine the load order of the plugins. This should go in order of dependencies.

        // First, we'll filter all plugins with zero dependencies into sortedPlugins.
        for(const plugin of plugins) {
            if(plugin.getDependencies().length === 0) {
                this.plugins.push(plugin);
                plugins.splice(plugins.indexOf(plugin), 1);
            }
        }


        while(plugins.length > 0) {
            // Now we'll loop through the remaining plugins, and add any that have all their dependencies in sortedPlugins.
            for(const plugin of plugins) {
                let dependenciesMet = true;
                for(const dependency of plugin.getDependencies()) {
                    if(!this.plugins.some(p => p.getName() === dependency)) {
                        dependenciesMet = false;
                        break;
                    }
                }
                if(dependenciesMet) {
                    this.plugins.push(plugin);
                    plugins.splice(plugins.indexOf(plugin), 1);
                }
            }
        }

        await this.atInit();

        // Finally, we'll call their init methods in order.
        for(const plugin of this.plugins) {
            await plugin.atInit();
        }

        await this.atLoad();
        for(const plugin of this.plugins) {
            await plugin.atLoad();
        }

        await this.atFinalize();
        for(const plugin of this.plugins) {
            await plugin.atFinalize();
        }
    }

    public async atInit() {

    }

    public async atLoad() {

    }

    public async atFinalize() {

    }

    public async runUpdate(delta: number, source: string) {
        for(const plugin of this.plugins) {
            await plugin.atUpdate(delta, source);
        }
        for(const connection of this.connections.values()) {
            await connection.atUpdate(delta, source);
        }
    }

    public async signalHandler(signal: Deno.Signal)  {
        switch(signal) {
            case "SIGINT":
                log.critical("Received SIGINT! Performing graceful shutdown...");
                await this.atShutdown();
                Deno.exit(0);
                break;
            case "SIGBREAK":
            case "SIGUSR1":
                log.critical(`Received ${signal}! Performing reload...`);
                await this.atReload();
                Deno.exit(1);
                break;
        }
    }

    public async run() {
        const sig: Deno.Signal[] = (Deno.build.os === "windows") ? ["SIGINT", "SIGBREAK"] : ["SIGUSR1", "SIGINT"];

        for (const s of sig) {
            Deno.addSignalListener(s, () => {
                this.signalHandler(s);
            });
        }

        await Promise.all(this.services);
    }

    public async handleConnection(connection: IConnection) {
        this.connections.set(connection.getIdentifier(), connection);
        await connection.run();
        this.connections.delete(connection.getIdentifier());
    }

}