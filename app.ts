import {NetworkManager} from "./net.ts";
import {ConfigManager} from "./config.ts";
import {DbManager, BaseMigration} from "./db.ts";

export class BasePlugin {
    public readonly load_order: number = 0;
    public readonly name: string = "base";
    public readonly app: Application;
    public readonly migrations: typeof BaseMigration[] = [];

    constructor(app: Application) {
        this.app = app;
    }

    async load() {

    }

    async run_migrations() {
        let migrations = [];
        for (const mig_class of this.migrations) {
            migrations.push(new mig_class(this));
        }
        migrations.sort((a, b) => {return a.run_order - b.run_order});

        for (const mig of migrations) {
            mig.run();
        }
    }
}

export class Application {
    public readonly config: ConfigManager;
    public plugins: Map<string, BasePlugin> = new Map<string, BasePlugin>();
    public plugins_sorted: BasePlugin[] = [];
    public readonly net: NetworkManager;
    public readonly db: DbManager;

    constructor() {
        this.config = new ConfigManager(this);
        console.log(this.config.config);
        this.db = new DbManager(this);
        this.net = new NetworkManager(this);
    }

    async load_plugins() {
        // First, gather all plugins.
        for (const plug_name of this.config.config.plugins) {
            let plugin = await import(`./plugins/${plug_name}/plugin.ts`);
            if(plugin) {
                let plug_obj = new plugin.Plugin(this);
                this.plugins.set(plug_obj.name, plug_obj);
            }
        }

        // Sort plugins by sort order...

        for(const plugin of this.plugins.values()) {
            this.plugins_sorted.push(plugin);
        }
        this.plugins_sorted.sort((a, b) => {return a.load_order - b.load_order});

        // Lastly, run their load operation.
        for(const plugin of this.plugins_sorted) {
            await plugin.load();
        }
    }

    async start_servers() {
        await this.net.start();
    }

    async run_migrations() {
        for (const plug of this.plugins_sorted) {
            await plug.run_migrations();
        }
    }

    async setup() {
        await this.load_plugins();
        await this.run_migrations();
        await this.start_servers();
    }

    async run() {

    }
}