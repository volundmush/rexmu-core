import {PluginBase} from "../../app.ts";
import {TelnetHandler, TelnetProtocol} from "./telnet.ts";

export class Plugin extends PluginBase {
    async load() {
        this.app.net.register_handler('core/telnet', TelnetHandler);
        this.app.net.register_protocol('core/telnet', TelnetProtocol);
    }
}