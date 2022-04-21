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
    //identities
    //http://127.0.0.1:5000/api/v1/namespaces/ff_system/identities
    async getIDs(): Promise<any> {
        const response = await this.rest.get(
            `/namespaces/ff_system/identities`
        );
        return response.data
    }
    //http://127.0.0.1:5000/api/v1/namespaces/ff_system/identities/97daac5f-8049-4f1b-9d04-7cccdfcee646/verifiers
    async getHex(id: number): Promise<any> {
        const response = await this.rest.get(
            `/namespaces/ff_system/identities/${id}/verifiers`
        );
        return response.data
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
    // MANDANT
    async MANDANT() {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/MANDANT`, {
            input: {}
        }
        );
        // console.log(response.data)
        return response.data;
    }
    // FINANZBEAMTER
    async FINANZBEAMTER() {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/FINANZBEAMTER`, {
            input: {}
        }
        );
        // console.log(response.data)
        return response.data;
    }
    //Set STEUERBERATER
    async STEUERBERATER() {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/STEUERBERATER`, {
            input: {}
        }
        );
        // console.log(response.data)
        return response.data;
    }
    //Set grantRole
    async grantRole(address: string, role: string) {
        console.log("Set SB in SC")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/grantRole`, {
            input: {
                account: address,
                role: role

            }
        }
        );
        // console.log(response.data)
        return response.data;
    }
    //Set SB
    async setSB(address: string, sender_address: string) {
        console.log("Set SB in SC")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/setSB`, {
            input: {
                addr: address,
                sender: sender_address

            }
        }
        );
        // console.log(response.data)
        return response.data;
    }
    //Get SB
    async getSB(sender: string): Promise<string> {
        //console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/getSB`, {
            input: {
                sender: sender
            }
        });
        return response.data.output;
    }
    //SetFA
    async SetFA(f_addr: any, m_addr: any): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/setFA`, { input: { addr: f_addr, sender: m_addr } });
        return response.data;
    }
    //init_Mandant
    async init_M(address: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/init_Mandant`, { input: { addr: address } });
        return response.data;
    }
    //files_send
    async files_send(address: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/files_send`, { input: { addr: address } });
        return response.data;
    }
    //files_received
    async files_received(address: string, sender: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/files_received`, { input: { addr: address, sender: sender } });
        return response.data;
    }
    //taxdec_send
    async taxdec_send(address: string, sender: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/taxdec_send`, { input: { addr: address, sender: sender } });
        return response.data;
    }
    //taxdec_received
    async taxdec_received(address: string, sender: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/taxdec_received`, { input: { addr: address, sender: sender } });
        console.log(response.data)
        return response.data;
    }
    //taxnote_send
    async taxnote_send(address: string, sender: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/taxnote_send`, { input: { addr: address, sender: sender } });
        console.log(response.data)
        return response.data;
    }
    //taxnote_send
    async taxnote_received(address: string, sender: string): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/taxnote_received`, { input: { addr: address, sender: sender } });
        console.log(response.data)
        return response.data;
    }
    async filesSend(): Promise<any> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/files_send`, {});
        return response.data;
    }
    //Get State
    async getState(address: string): Promise<number> {
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/getState`, {
            input: {
                addr: address
            }

        });
        return response.data.output;
    }
    //Get Vollmächte
    async getVollmacht(address: string): Promise<string> {
        // console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/query/getVollmacht`, { input: { addr: address } }
        );
        // console.log("Vollmacht: " + response.data)
        return response.data.output;
    }
    //Set Allgemeine Vollmacht
    async setAllg(addr: string) {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/setAllg`, { input: { sender: addr } }
        );
        return response.data;
    }
    //Set Empfangsvollmacht
    async setEmpf(addr: string) {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/setEmpf`, { input: { sender: addr } }
        );
        return response.data;
    }
    //Set Empfangsvollmacht
    async cancelAllg(addr: string) {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/cancelAllg`, { input: { sender: addr } }
        );
        return response.data
    }
    //Set Empfangsvollmacht
    async cancelEmpf(addr: string) {
        console.log("we get here")
        const response = await this.rest.post(
            `/namespaces/default/apis/mycontract/invoke/cancelEmpf`, { input: { sender: addr } }
        );
        return response.data
    }
    //Send Braodcast
    async sendBroadcast(data: FireFlyMessageSend[]) {
        await this.rest.post(`/namespaces/${this.ns}/messages/broadcast`, { data });
    }
    //Send private Message
    async sendPrivate(privateMessage: FireFlyMessageInput): Promise<void> {
        console.log(privateMessage)
        console.log(privateMessage.group.members[0])
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



    //----------------FireFly send Message---------------//
    //Send a private message
    async privateMessage(privateMessage: any): Promise<void> {
        await this.rest.post(`/namespaces/${this.ns}/messages/private`, privateMessage);
    }
    //Upload data local FireFly node
    async uploadData(data: any) {
        const response = await this.rest.post(`/namespaces/${this.ns}/data`, data,
            {
                headers: data.getHeaders()
            });
        return response.data.id
    }
    //Broadcast a message
    async broadcastMessage(data: any) {
        console.log(data)
        await this.rest.post(`/namespaces/${this.ns}/messages/broadcast`, data);
    }



}

