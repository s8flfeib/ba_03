import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';

export interface FireFlyDataSend {
    value: string;
}

export interface PDF_Data {
    blob: {
        name:string,
        public:string,
        size: number
    },
    value:{
        filename:string,
        mimetype:string
    }

}

// export interface FireFlyDataSend1 {
//     value: {
//         filename:string;
//         size: number;
//     }
// }

export interface FireFlyDataSend1 {
    blob: {
        hash:string;
        name:string;
        public:string;
        size:number;
    }
    datatype: {
        name:string;
        version:string;
    }
    hash:string;
    id:string;
    validator:string;
    value:string;
}

export interface FireFlyD {
    filename: string;
    size: string;
}

export interface FireFlyBlob {
    hash: string;
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
    
    //Funktionierende Funktionen

    //Send Braodcast
    async sendBroadcast(data: FireFlyDataSend[]) {
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
    //Get All Messages Ohne types bekommt man nur 10 Messages
    async getAllMessages(): Promise<FireFlyMessage[]> {
        const response = await this.rest.get<FireFlyMessage[]>(
          `/namespaces/${this.ns}/messages?type=private&type=broadcast`
        );
        return response.data;
    }
    retrieveData(data: FireFlyDataIdentifier[]) {
        return Promise.all(data.map(d =>
        this.rest.get<FireFlyData>(`/namespaces/${this.ns}/data/${d.id}`)
        .then(response => response.data)));
    }
    ///
    async postData(data: PDF_Data) {

       try {
           await this.rest.post(`/namespaces/${this.ns}/data`, data,

        );
        }
        catch(error){
            console.log(error)
        }
    }

    async fdPost(data: any) {

        try {
            await this.rest.post(`/namespaces/${this.ns}/data`, data,
            {headers: data.getHeaders()}
 
         );
         }
         catch(error){
             console.log(error)
         }
     }


    async getData(hash:string): Promise<FireFlyMessage[]> {
        const response = await this.rest.get<FireFlyMessage[]>(
          `/namespaces/${this.ns}/data${hash}`)
        return response.data;
    }

    // retrieveData(data: FireFlyDataIdentifier[]) {
    //     return Promise.all(data.map(d =>
    //     this.rest.get<FireFlyData>(`/namespaces/${this.ns}/data/${d.id}`)
    //     .then(response => response.data)));
    // }






    //Tryout





    //Will send data to the ff node but will not proadcast or send
    async sendFile(files: FireFlyDataSend[]) {
        await this.rest.post(`/namespaces/${this.ns}/data`,);
    }


    //gets the data from the node 
    // async getData(id: string): Promise<FireFlyMessage[]> {
    //     const response = await this.rest.get<FireFlyMessage[]>(
    //         `/namespaces/${this.ns}/data/${ id }`
    //     );
    //     return response.data;
    // }

    //broadcasts data
    // async BroadcastData(data: FireFlyDataSend1[]){
    //     await this.rest.post(`/namespaces/${this.ns}/broadcast/message`, { data });
    // }
    async broadcastData(data: FireFlyDataSend[]) {
        await this.rest.post(`/namespaces/${this.ns}/broadcast/message`, { data });
    }

    //data: FireFlyDataSend1[]
    async uploadData(data: any) {
        await this.rest.post(`/namespaces/${this.ns}/data`, data );
    }
    //



    

    async getData1(): Promise<FireFlyMessage[]> {
        const response = await this.rest.get<FireFlyMessage[]>(
          `/namespaces/${this.ns}/data?limit=1`
        );
        return response.data;
    }



}
      
