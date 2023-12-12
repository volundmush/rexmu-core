export class WebsocketStream {
    public readonly ws: WebSocket;
    private controller?: ReadableStreamDefaultController<MessageEvent>;
    public readonly rs: ReadableStream<MessageEvent>;

    constructor(ws: WebSocket) {
        this.ws = ws;

        this.rs = new ReadableStream<MessageEvent>({
            start: (controller) => {
                this.controller = controller;
            },
        });
        this.ws.onmessage = (event) => {
            this.controller?.enqueue(event);
        };
        this.ws.onerror = (event) => {
            this.controller?.error(event);
        }
        this.ws.onclose = (event) => {
            this.controller?.close();
        }
    }

    public close() {
        this.ws.close();
        if(this.controller) {
            this.controller.close();
        }
    }
}

export class Awaitable {
    private resolve: Function | null = null;
    private reject: Function | null = null;
    private promise: Promise<any>;

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    trigger(data?: any) {
        if (this.resolve) {
            this.resolve(data);
        }
    }

    fail(error?: any) {
        if (this.reject) {
            this.reject(error);
        }
    }

    getPromise(): Promise<any> {
        return this.promise;
    }
}