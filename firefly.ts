import axios, { AxiosInstance } from 'axios';
import WebSocket, { prototype } from 'ws';

export interface FireFlyMessageSend {
    value: string;
}
export interface FireFlyDataSend {
    id: string;
}

export interface FireFlyDataInput {
    data: FireFlyDataSend[];
    group: {
        name?: string;
        members: FireFlyMemberInput[];
    };
}


export interface FireFlyD {
    filename: string;
    size: string;
}

export interface FireFlyBlob {
    hash: string;
}

export interface FireFlyData extends FireFlyMessageSend {
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
    // value:string;
    local: boolean;
    data: FireFlyDataIdentifier[];
}

export interface FireFlyFiles {
    id: string;
    validator: string;
    hash: string;
    created: string;
    value: string;
    blob: {
        hash: string;
        size: number;
        name: string;
    }
}


export interface FireFlyMessageInput {
    data: FireFlyMessageSend[];
    group: {
        name?: string;
        members: FireFlyMemberInput[];
    };
}

export interface FireFlyMemberInput {
    identity: string;
}

export interface FireFlyOrga {
    id: string;
    message: string;
    identity: string;
    name: string;
}

export interface FireFlyContract {
    vollmacht: number;
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
    private ws: WebSocket;
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
    private port: number;

    constructor(port: number) {
        this.rest = axios.create({ baseURL: `http://localhost:${port}/api/v1` });
        this.port = port;
    }

    //Funktionierende Funktionen
    public getfirefly() {
        return this.port
    }

    //Get organizations
    async getOrga(): Promise<FireFlyOrga[]> {
        const response = await this.rest.get<FireFlyOrga[]>(
            `/network/organizations`
        );
        return response.data
    }
    //Get Output from Operation_id
    async getOutput(id: string) {
        console.log("we get here")
        const response = await this.rest.get(
            `/namespaces/${this.ns}/operations/${id}`
        );
        return response.data;
    }
    //Get Vollmächte
    async getVollmacht(): Promise<FireFlyContract[]> {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/getVollmacht`, { input: { addr: "0xcb5bb153c00211bf8d14d10c78ff3532b1316976" } }
        );
        console.log("Vollmacht: " + response.data)
        return response.data;
    }
    //Set Allgemeine Vollmacht
    async setAllg() {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/setAllg`, {}
        );
        return response.data;
    }
    //Set Empfangsvollmacht
    async setEmpf() {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/setEmpf`, {}
        );
        return response.data;
    }
    //Set Empfangsvollmacht
    async cancelAllg() {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/cancelAllg`, {}
        );
    }
    //Set Empfangsvollmacht
    async cancelEmpf() {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/cancelEmpf`, {}
        );
    }
    //Send Braodcast
    async sendBroadcast(data: FireFlyMessageSend[]) {
        await this.rest.post(`/namespaces/${this.ns}/messages/broadcast`, { data });
    }
    //Send private Message
    async sendPrivate(privateMessage: FireFlyMessageInput): Promise<void> {
        await this.rest.post(`/namespaces/${this.ns}/messages/private`, privateMessage);
    }
    //Get Messages Limit Broadcast & Private
    async getMessages(limit: number): Promise<FireFlyMessage[]> {
        const response = await this.rest.get<FireFlyMessage[]>(
            `/namespaces/${this.ns}/messages?limit=${limit}&type=private&type=broadcast`
        );
        return response.data;
    }
    //Get All Messages Ohne types bekommt man nur 10 Messages???
    async getAllMessages(): Promise<FireFlyMessage[]> {
        const response = await this.rest.get<FireFlyMessage[]>(
            `/namespaces/${this.ns}/messages?type=private&type=broadcast`
        );
        return response.data;
    }
    //Retrives the actuall Message value (data)
    retrieveData(data: FireFlyDataIdentifier[]) {
        return Promise.all(data.map(d =>
            this.rest.get<FireFlyData>(`/namespaces/${this.ns}/data/${d.id}`)
                .then(response => response.data)));
    }
    //Upload data to own FireFly node
    async uploadData(data: any) {
        const response = await this.rest.post(`/namespaces/${this.ns}/data`, data,
            {
                headers: data.getHeaders()
            });
        return response.data.id
    }
    //Broadcast Data(PDF) to all 
    async broadcastData(data: FireFlyDataSend[]) {
        await this.rest.post(`/namespaces/${this.ns}/messages/broadcast`, { data });
    }
    //Privately send Data(PDF) to selected members of the network
    async privateData(privateMessage: FireFlyDataInput): Promise<void> {
        await this.rest.post(`/namespaces/${this.ns}/messages/private`, privateMessage);
    }
    //Get All Messages Ohne types bekommt man nur 10 Messages???
    async getAllData(): Promise<FireFlyFiles[]> {
        const response = await this.rest.get<FireFlyFiles[]>(
            `/namespaces/${this.ns}/data`
        );
        return response.data;
    }
    //Retireves Data Bloob from Data id 
    retrieveDataBlob(data: FireFlyDataIdentifier[]) {
        return Promise.all(data.map(d =>
            this.rest.get<FireFlyData>(`/namespaces/${this.ns}/data/${d.id}/blob`)
                .then(response => response.data)));
    }





}

