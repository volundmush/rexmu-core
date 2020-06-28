import {BasePlugin} from "../../app.ts";
import {TelnetProtocol} from "./telnet.ts";
import {BaseMigration} from "../../db.ts";

class InitialMigration extends BaseMigration {
    public readonly run_order: number = 0;
    public readonly file: string = "initial.sql";
}


// This Plugin should always load first.
export class Plugin extends BasePlugin {
    public readonly load_order: number = -1000;
    public readonly name: string = "core";
    public readonly migrations: typeof BaseMigration[] = [InitialMigration];

    async load() {
        this.app.net.register_protocol('telnet', TelnetProtocol);
    }
}