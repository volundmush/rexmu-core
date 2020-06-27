import { Application } from "./app.ts";

async function main() {
    let app = new Application();
    await app.setup();
    await app.run();
}

await main();
