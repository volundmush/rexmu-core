import {Connection, Server} from "../../net.ts";

enum TC {
    NUL = 0,
    BEL = 7,
    CR = 13,
    LF = 10,
    SGA = 3,
    NAWS = 31,
    SE = 240,
    NOP = 241,
    GA = 249,
    SB = 250,
    WILL = 251,
    WONT = 252,
    DO = 253,
    DONT = 254,
    IAC = 255,

    MXP = 91,
    MSSP = 70,
    MCCP2 = 86,
    MCCP3 = 87,
    GMCP = 201,
    MSDP = 69,
    TTYPE = 24
}

enum TelnetState {
    Data,
    Escaped,
    NewLine,
    Command,
    SubNegotiation,
    InSubNegotiation,
    SubEscaped
}

class TelnetOption {
    public readonly code: number = 0;
    protected readonly protocol: TelnetProtocol;
    protected received_start: TC = 0;
    protected received_stop: TC = 0;
    public enabled = false;

    constructor(prot: TelnetProtocol) {
        this.protocol = prot;
    }
}



class MXPOption extends TelnetOption {
    code = TC.MXP;
}

class MCCP2Option extends TelnetOption {
    code = TC.MCCP2;
}

class MCCP3Option extends TelnetOption {
    code = TC.MCCP3;
}

class GMCPOption extends TelnetOption {
    code = TC.GMCP;
}

class MSDPOption extends TelnetOption {
    code = TC.MSDP;
}

class TTYPEOption extends TelnetOption {
    code = TC.TTYPE;
}

class SGAOption extends TelnetOption {
    code = TC.SGA;
}

const OPTIONS: typeof TelnetOption[] = [MXPOption, MCCP2Option, MCCP3Option, GMCPOption, MSDPOption, TTYPEOption,
    SGAOption];

export class TelnetProtocol extends Connection {
    private telnet_state: TelnetState = TelnetState.Data;
    private command_buffer: number[] = [];
    private iac_command: number = 0;
    private sub_command: number = 0;
    private sub_buffer: number[] = [];
    private mccp2: boolean = false;
    private mccp3: boolean = false;
    private options: Map<number, TelnetOption> = new Map<number, TelnetOption>();

    constructor(conn: Deno.Conn, id: number, srv: Server) {
        super(conn, id, srv);
        for (const op of OPTIONS) {
            let tel_op = new op(this);
            this.options.set(tel_op.code, tel_op);
        }
    }

    async send_data(buffer: Uint8Array) {
        if(this.mccp2) {
            // Simple wrapper around data_out for handling mccp2 compression. Implement it here
        }
        else {
            this.data_out(buffer);
        }
    }

    async data_in(buffer: Uint8Array) {
        if(this.mccp3) {
            // Implement decompression here and call receive_data.
        }
        else {
            this.receive_data(buffer);
        }
    }

    async receive_data(buffer: Uint8Array) {
        for (const b of buffer) {

            switch(this.telnet_state) {
                case TelnetState.Data: {
                    switch(b) {
                        case TC.IAC: {
                            this.telnet_state = TelnetState.Escaped;
                            break;
                        }
                        case TC.CR: {
                            this.telnet_state = TelnetState.NewLine;
                            break;
                        }
                        default:
                            this.command_buffer.push(b);
                            break;
                    }
                    break;
                }
                case TelnetState.Escaped: {
                    switch(b) {
                        case TC.WILL:
                        {
                            this.iac_command = b;
                            this.telnet_state = TelnetState.Command;
                            break;
                        }
                        case TC.WONT: {
                            this.iac_command = b;
                            this.telnet_state = TelnetState.Command;
                            break;
                        }
                        case TC.DO: {
                            this.iac_command = b;
                            this.telnet_state = TelnetState.Command;
                            break;
                        }
                        case TC.DONT: {
                            this.iac_command = b;
                            this.telnet_state = TelnetState.Command;
                            break;
                        }
                        case TC.SB: {
                            this.iac_command = 0;
                            this.sub_command = 0;
                            this.telnet_state = TelnetState.SubNegotiation;
                            break;
                        }
                        case TC.IAC: {
                            this.command_buffer.push(b);
                            this.telnet_state = TelnetState.Data;
                        }

                    }
                    break;
                }
                case TelnetState.Command: {
                    this.parse_iac_command(this.iac_command, b);
                    this.iac_command = 0;
                    this.telnet_state = TelnetState.Data;
                    break;
                }
                case TelnetState.NewLine: {
                    switch(b) {
                        case TC.LF: {
                            this.parse_command(this.command_buffer);
                            this.command_buffer = [];
                            this.telnet_state = TelnetState.Data;
                            break;
                        }
                        // Not sure what else to do here... if we don't get an LF, return to normal mode.
                        default: {
                            this.parse_command(this.command_buffer);
                            this.command_buffer = [b];
                            this.telnet_state = TelnetState.Data;
                            break;
                        }
                    }
                    break;
                }
                case TelnetState.SubNegotiation: {
                    this.sub_command = b;
                    this.telnet_state = TelnetState.InSubNegotiation;
                    break;
                }
                case TelnetState.InSubNegotiation: {
                    switch(b) {
                        case TC.IAC: {
                            this.telnet_state = TelnetState.SubEscaped;
                            break;
                        }
                        default: {
                            this.sub_buffer.push(b);
                            break;
                        }
                    }
                    break;
                }
                case TelnetState.SubEscaped: {
                    switch(b) {
                        case TC.SE: {
                            this.parse_subnegotiation(this.sub_command, this.sub_buffer);
                            this.sub_command = 0;
                            this.sub_buffer = [];
                        }
                    }
                    break;
                }

            }

        }
    }

    async parse_command(command: number[]) {
        console.log(`RECEIVED BYTES: ${command}`);
        let text = String.fromCharCode.apply(null, command);
        console.log(`DECODED TELNET COMMAND: ${text} - ${text.length}`);
        this.send_data(this.encoder.encode(`TELNET ECHO COMMAND: ${text}\n`));
    }

    async parse_iac_command(command: number, option: number) {

    }

    async parse_subnegotiation(option: number, data: number[]) {

    }

}