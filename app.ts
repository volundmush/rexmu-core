import {path} from "./deps.ts";
import {NetworkManager} from "./net.ts";

export class ConfigManager {
    private app: Application;

    constructor(app: Application) {
        this.app = app;
    }
}

export class PluginBase {
    protected app: Application;

    constructor(app: Application) {
        this.app = app;
    }

    async load() {

    }

    async setup() {

    }
}

export class Application {
    public config: ConfigManager;
    public plugins: Map<string, PluginBase> = new Map<string, PluginBase>();
    public net: NetworkManager;

    constructor() {
        this.config = new ConfigManager(this);
        this.net = new NetworkManager(this);

    }

    async load_config() {

    }

    async load_plugins() {
        for await (const dir of Deno.readDir(path.join(Deno.cwd(), 'plugins'))) {
            console.log(`"FOUND DIR: ${dir.name}`);
            if (dir.isDirectory) {
                let plugin = await import(`./plugins/${dir.name}/plugin.ts`);
                if(plugin) {
                    let plug_obj = new plugin.Plugin(this);
                    this.plugins.set(dir.name, plug_obj);
                    await plug_obj.load();
                }
            }
        }


    }

    async setup() {
        await this.load_config();
        await this.load_plugins();
    }

    async run() {

        await this.net.start_server("test", "0.0.0.0", 4200, "core/telnet", false);
    }
}