import { FireFly, FireFlyListener, FireFlyData, FireFlyMessage, FireFlyDataSend, FireFlyDataIdentifier } from "./firefly";
import express, {Request, Response, NextFunction} from 'express'


//import { newMessage } from "./public/scripts/script01";
const MAX_MESSAGES = 25;
const TIMEOUT = 15 * 1000;
const dataValues = (data: FireFlyData[]) => data.map(d => d.value);


interface MessageRow {
    message: FireFlyMessage;
    data: FireFlyData[];
}
//const dataValues = (data: FireFlyData[]) => data.map( d => d.value);
//const express = require( "express" );
const app = express();

import * as path from 'path'
//var path = require('path')
//app.use(express.static('public'))
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

async function main() {
    console.log('test')
    const firefly1 = new FireFly(5000);
    const ws1 = new FireFlyListener(5000);
    const firefly2 = new FireFly(5000);
    const ws2 = new FireFlyListener(5000);
    const firefly3 = new FireFly(5000);
    const ws3 = new FireFlyListener(5000);
    

    await ws1.ready();
    await ws2.ready();
    await ws3.ready();



    //Collect inputs:
    app.get("/", (req: Request, res:Response, next:NextFunction) => {
        //console.log(res);
        res.render('index', {user: "Flo"});
        //console.log(req.body)

    })
    app.get("/send_text", (req: Request, res:Response) => {
        const message = JSON.stringify(req.query).split('"')[3];
        // console.log(x)
        // console.log(req.query);
        // let text = req.query;
        // console.log(typeof(text));
        const sendData: FireFlyDataSend[] = [
            {value: message}
        ]
        //ohne "async" ??
        firefly1.sendBroadcast(sendData); 
        res.redirect("/")
    })

    app.get("/send_file", (req: Request, res:Response) => { 
        var file = req.query;
        console.log("File send")
        console.log(file)
        res.redirect("/")
    })

    app.get("/read_text", (req: Request, res:Response) => {
        var msg: FireFlyMessage[] = [];
        var ffid: FireFlyDataIdentifier[] = [];
        var message1: string;

        // Gets id and Hash of messages depending which response value 
        var message = firefly1.getMessages(1).then(function(response){
            ffid = response[0].data;
            msg = response

            // Gets message from FFID
            var data1 = firefly1.retrieveData(ffid).then(function(res){
                message1 = res[0].value;
                console.log("The last message was: " + res[0].value);
            })

            // console.log(msg[1].data.map((d) => JSON.stringify(d?.value || '',null, 2)).join(', '))};
        })

        res.redirect("/");
        
    })

    const PORT = process.env.PORT || 2000
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    })

}

main()