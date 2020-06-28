import { DB } from "./deps.ts";
import {Application, BasePlugin} from "./app.ts";


export class BaseMigration {
    public readonly run_order: number = 0;
    public readonly plugin: BasePlugin;
    public readonly file: string = "";

    constructor(plugin: BasePlugin) {
        this.plugin = plugin;
    }

    // This function will return true/false depending on whether this migration should be performed.
    validate() : boolean {
        return false;
    }

    run() {
        let db = this.plugin.app.db;

    }

}

const mig_table: string = "CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "plugin TEXT, mig_id INTEGER, mig_date INTEGER)";

export class DbManager {
    private db: DB;
    private app: Application;

    constructor(app: Application) {
        this.app = app;
        this.db = new DB(app.config.config.database.name);
        this.run(mig_table);
    }

    run(query: string) {
        this.db.query(query);
    }
}