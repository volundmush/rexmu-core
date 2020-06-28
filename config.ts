import {Application} from "./app.ts";
import {toml_parse, fs} from "./deps.ts";

export class ConfigManager {
    private app: Application;
    public readonly config: any;

    constructor(app: Application) {
        this.app = app;
        let decoder = new TextDecoder();
        this.config = toml_parse(decoder.decode(Deno.readFileSync("./data/config.toml")));
    }
}