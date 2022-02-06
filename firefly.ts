import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

export interface FireFlyDataSend {
    value: string;
}

export interface FireFlyData extends FireFlyDataSend {
id: string;
}

  
export interface FireFlyDataIdentifier {
    id: string;
    hash: string;
}

export interface FireFlyMessage {
    header: {
      id: string;
      author: string;
      created: string;
    };
    local: boolean;
    data: FireFlyDataIdentifier[];
}

export interface FireFlyMessageInput {
    data: FireFlyDataSend[];
    group: {
      name?: string;
      members: FireFlyMemberInput[];
    };
}

export interface FireFlyMemberInput {
    identity: string;
}


// export interface FireFlyMessage {
//     id: string;
//     type: string;
//     message: {
//         data: FireFlyDataIdentifier[];
//     }
// }

//Websocket class that creates a Connection 
export class FireFlyListener {
    private ws:  WebSocket;
    private connected: Promise<void>;
    private messages: FireFlyMessage[] = [];

    constructor(port: number, ns = 'default') {
        this.ws = new WebSocket(`ws://localhost:${port}/ws?namespace=${ns}&ephemeral&autoack`);
        this.connected = new Promise<void>(resolve => {
            this.ws.on('open', resolve);
            this.ws.on('message', (data: string) => {
                this.messages.push(JSON.parse(data));
            })
        })
    }

    ready() {
        return this.connected;
    }

    close() {
        this.ws.close();
    }

}

export class FireFly {
    private rest: AxiosInstance;
    private ns = 'default';
    
    constructor(port: number) {
        this.rest = axios.create({ baseURL: `http://localhost:${port}/api/v1` });
    }
    
    async sendBroadcast(data: FireFlyDataSend[]) {
        await this.rest.post(`/namespaces/${this.ns}/broadcast/message`, { data });
    }

    async sendPrivate(privateMessage: FireFlyMessageInput): Promise<void> {
        await this.rest.post(`/namespaces/${this.ns}/send/message`, privateMessage);
    }
    
    async getMessages(limit: number): Promise<FireFlyMessage[]> {
        const response = await this.rest.get<FireFlyMessage[]>(
          `/namespaces/${this.ns}/messages?limit=${limit}&type=private&type=broadcast`
        );
        return response.data;
    }


    retrieveData(data: FireFlyDataIdentifier[]) {
        return Promise.all(data.map(d =>
        this.rest.get<FireFlyData>(`/namespaces/${this.ns}/data/${d.id}`)
        .then(response => response.data)));
    }
}
      
