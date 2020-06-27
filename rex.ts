import { NetworkManager } from "./net.ts";
import {TelnetProtocol, TelnetHandler} from "./telnet.ts";

async function main() {
    let manager = new NetworkManager();
    manager.register_protocol("telnet", TelnetProtocol);
    manager.register_handler("telnet", TelnetHandler);
    await manager.start_server("test", "10.0.0.226", 4200, "telnet", "telnet", false);
}

await main();
