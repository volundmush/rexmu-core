import {ServerManager} from "./telnet/server.ts";
import {log} from "../../deps.ts";
import {Foras} from "../../deps.ts";
Foras.initBundledOnce();

async function main() {
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

    const configs = [
            {port: 4000}
        ]
    ;

    const manager = new ServerManager(configs);
    manager.registerSignalHandlers();
    await manager.run();
    log.critical("Shutting down...");
}


if (import.meta.main) await main()