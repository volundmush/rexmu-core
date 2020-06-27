import {PluginBase} from "../../app.ts";
import {TelnetProtocol} from "./telnet.ts";

export class Plugin extends PluginBase {
    async load() {

        this.app.net.register_protocol('core/telnet', TelnetProtocol);
    }
}