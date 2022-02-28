import { FireFlyDataSend1, FireFlyD, FireFlyBlob, FireFly, FireFlyListener, FireFlyData, FireFlyMessage, FireFlyDataSend, FireFlyDataIdentifier, FireFlyMemberInput, FireFlyMessageInput, PDF_Data } from "./firefly";

//import express, {Request, Response, NextFunction, response} from 'express';
const express = require('express');
const bcrypt = require('bcrypt');
const { pool} = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const fetch = require("fetch");
const socket = require("socket.io");
const pdf2base64 = require("pdf-to-base64");
const initializePassport = require("./passportConfig");
const FormData = require('form-data');
const fs = require('fs');
const multiparty = require('multiparty')


//file upload
const fileUpload = require('express-fileupload');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');
import fetch1 from 'node-fetch';
import http from 'node:http';


initializePassport(passport);

const PORT = process.env.PORT || 2000

const app = express();


//Socket.io => change to Webstocket
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

const io = socket(server);


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
import * as path from 'path'
import { convertToObject, ExitStatus, isNamedExportBindings, setConstantValue } from "typescript";
import axios from "axios";
//var path = require('path')
//app.use(express.static('public'))
app.use(express.static(path.join(__dirname, '../public')));

//enable file upload
app.use(fileUpload({createParentPath:true}))

//add other middleware
app.use(cors());
app.use(morgan('dev'));

//set middleware ==> changed to "true" from flase
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
//app.ust(express.json({ limit: '1mb })); helps to protect server from huge data

app.set('view engine', 'ejs');
//register post route allows to send data from frontend to server
app.use(express.urlencoded({ extended: false }));
app.use(
    session({
        secret: 'secret',

        resave: false,

        saveUninitialized: false
    })
);
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

async function main() {
    //Create FireFly and FireFlyListener Objects
    //A FireFly Object allows to send and receive Data
    //The FireFlyListener create socket connection to the api
    const firefly1 = new FireFly(5000);
    const ws1 = new FireFlyListener(5000);
    const firefly2 = new FireFly(5001);
    const ws2 = new FireFlyListener(5001);
    const firefly3 = new FireFly(5002);
    const ws3 = new FireFlyListener(5002);
      
    await ws1.ready();
    await ws2.ready();
    await ws3.ready();


    app.post('/upload-file', async(req:any,res:any) => {
        //console.log(req.files.file)
        var data = req.files.file

        console.log(data.data)

        var fd = new FormData();
        fd.append("name", data.name)
        fd.append("size", data.size)
        fd.append("autometa", true)
        fd.append("data", data.data)

        var formData = new FormData();
        //formData.append('file', fs.createReadStream('./sample.pdf'))
        //formData.append('file', data.data)
        formData.append('file', data.data, { filename : 'document.pdf' });
        console.log(formData)
        var file = formData
        console.log(typeof(file))

        const respo = await axios.post('http://localhost:5000/api/v1/namespaces/default/data', formData
        
        , {
            headers: formData.getHeaders()
        })
        .catch(err => console.log(err))

        res.redirect('/')
    })

    //Start Index allows user to login or register:
    app.get("/", (req: any, res:any) => {
        res.render('test')
        //res.render('index', {user: "User"});
    })

    //Send private Message and Broadcast between all Members!
    app.post("/send_text", (req:any, res:any) => {
        const message = JSON.stringify(req.body.message);
        const sendData: FireFlyDataSend[] = [
            {value: message}
        ]
        var recipient = req.body.recipient;
        const recipients: FireFlyMemberInput[] = [];

        switch(recipient) {
            case "Broadcast":
                console.log("Broadcast")
                switch(req.user.name) {
                    case "Mandant":
                        console.log("Send from M");
                        firefly1.sendBroadcast(sendData); 
                        break;
                    case "Steuerberater":
                        console.log("Send from S");
                        firefly2.sendBroadcast(sendData); 
                        break;
                    case "Finanzamt":
                        console.log("Send from F");
                        firefly3.sendBroadcast(sendData); 
                        break;
                }
                break;
            case "Mandant":
                recipients.push({identity: "org_0"});
                switch(req.user.name){
                    case "Mandant":
                        firefly1.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                    case "Steuerberater":
                        firefly2.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                    case "Finanzamt":
                        firefly3.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                }  
                break;
            case "Berater":
                recipients.push({identity: "org_1"});
                switch(req.user.name){
                    case "Mandant":
                        firefly1.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                    case "Steuerberater":
                        firefly2.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                    case "Finanzamt":
                        firefly3.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                }
                break;
            case "Finanzamt":
                recipients.push({identity: "org_2"});
                switch(req.user.name){
                    case "Mandant":
                        firefly1.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                    case "Steuerberater":
                        firefly2.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                    case "Finanzamt":
                        firefly3.sendPrivate({
                            data: [{value: message,},],
                                group: {members: recipients,},
                        });
                        break;
                }
                break;
        }

        res.redirect("/users/dashboard");
    });

            // const data:FireFlyDataSend1 = {
        //     blob:{
        //         hash:"",
        //         name:"",
        //         public:"",
        //         size: 0
        //     },
        //     datatype: {
        //         name:"",
        //         version:""
        //     },
        //     hash:"",
        //     id:"",
        //     validator:"",
        //     value: pdf_base64
        // }; 

    app.get("/send_file",  (req: any, res:any) => { 
        res.redirect("/users/dashboard")
    });
    app.post("/send_file", (req:any, res:any) => {
        console.log("We are here");
        //const pdf_binary = req.body.base64;
        console.log(req)

        // const data:PDF_Data = {
        //     blob:{
        //         name : "Blob Name",
        //         public: pdf_binary,
        //         size : pdf_binary.fileSize
        //     },
        //     value:{
        //         filename:"-",
        //         mimetype:"form-data; name=\"file\"; filename=\"-\""
        //     }
        // }


        // const data = new FormData();
        // data.append('autometa', "true");
        // data.append('file', pdf_binary);
        // formData.append('filename.ext', fs.createReadStream("sample.pdf"));


//        firefly1.postData(data);



        res.redirect("/users/dashboard");
    });

    app.get("/users/dashboard", checkNotAuthenticated, (req:any, res:any) => {
        res.render("dashboard", {user: req.user.name});
    });

    //Set up Socket.io connection to send to the client
    //Auf jeden einzelnen Client zuschneiden !!
    io.on('connection', newConnection);

    async function newConnection(socket:any){
        //Load last 25 Messages
        //Get id and Hash of the Messages 
        // !!!!!!!ONLY FIREFLY1 /////////////
        var allMessages = await firefly1.getAllMessages();
        //console.log(response);
        const rows: MessageRow[] = [];
        //push all 25 messages to MessageRow{message: FireFlyMessage, data:FireFlyData[]}
        for(const message of allMessages) {
            var message_data = await firefly1.retrieveData(message.data)
            // console.log(message.data)
            rows.push({message: message, data: message_data})
        }
        //access massages and time
        // console.log(rows[20].data[0].value);
        // console.log(rows[20].message.header.created);
        console.log("New Socket Connection: " + socket.id);
        console.log("send rows to client");
        io.emit('chat message received', rows);

        socket.on('disconnect', () => {
            //triggers when closing browser or logout
            console.log('user disconnected');
        })
    }

    app.get("/users/dashboard_01", checkNotAuthenticated, async (req: any, res:any) => {

        res.redirect('dashboard');
    })

    //check authentication before moving on to the rest
    app.get("/users/register", checkAuthenticated, (req: any, res:any) => {
        res.render('register');
    })

    app.post("/users/register", async (req:any, res:any) => {
        let { name, password, password2 } = req.body;
        let errors:any = [];

        //validation check
        if (!name || !password || !password2){
            errors.push({ message: "Bitte füllen Sie alle Felder aus"});
        }
        if (password!=password2){
            errors.push({ message: "Passwörter stimmen nicht überein!"});
        }
        // if (password.length < 6) {
        //     errors.push({ message: "Passwort muss bestimmte Länge haben"})
        // }
        if(errors.length > 0){
            res.render('register', {errors});
        } else {
            //Form Validation ok

            let hashedPassword = await bcrypt.hash(password, 10);
            //console.log(hashedPassword);

            //check if user allready exists für mich irrelevant
            pool.query(
                'SELECT * FROM users WHERE name = $1', [name], (err:String,results:any) =>{
                    if(err){
                        throw err
                    }
                    //console.log(results.rows);

                    if(results.rows.length > 0){
                        errors.push({ message: "Name bereits vergeben"});
                        res.render('register', {errors});
                    }else{
                        //register the user
                        pool.query(
                            `INSERT INTO users(name, password)
                            VALUES($1, $2)
                            RETURNING id, password`, [name, hashedPassword], (err:any, results:any) => {
                                if (err){
                                    throw err
                                }
                                console.log(results.rows);
                                // req.flash('success_msg', 'Die Registrierung war erfolgreich, logge dich jetzt ein!');
                                // console.log(req.flash);
                                req.flash('success_msg', "Die Registrierung war erfolgreich!");
                                req.flash('success_msg1', "Bitte loggen Sie sich ein");
                                res.redirect('/users/login');
                            }

                        )
                    }
                }
            )
        }

    })

    //check authentication before moving on to the rest
    app.get("/users/login", checkAuthenticated, (req: any, res:any) => {
        res.render('login');
    })

    app.post("/users/login", passport.authenticate('local', {
            successRedirect: "/users/dashboard_01",
            failureRedirect: "/users/login",
            failureFlash: true
        })
    );

    app.get('/users/logout', (req:any,res:any) => {
        console.log("socket closed!")
        req.logOut();
        req.flash('success_msg', "Sie sind abgemeldet");
        res.redirect("/users/login");
    })


    //Wenn der Nutzer nicht Authenticated ist und er auf das Dashboard will wird er zur login zurück geleitet
    //Wenn er es ist kann er direkt darauf zugreifen und wenn er auf login/register will wird er zum dashboard geleitet
    function checkAuthenticated(req:any, res:any, next:any) {
        if (req.isAuthenticated()) {
            return res.redirect("/users/dashboard");
        }
        next();
    }
    
    function checkNotAuthenticated(req:any, res:any, next:any) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/users/login");
    }

    function paginatedResults(model:any) {
        return (req:any, res:any, next:any) => {
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);
        
            const startIndex = (page -1) * limit;
            const endINdex = page * limit;
        
            const results = {} as any
        
            if(endINdex < model.length) {
                results.next = {
                    page: page + 1, 
                    limit: limit
                }
            }
        
        
            if(startIndex > 0){
                results.previous = {
                    page: page - 1, 
                    limit: limit
                }
                    
            }
        
            results.RESULTS = model.slice(startIndex, endINdex);
    
            //pass it to the results
            res.paginatedResults = results;
            next()
        }
    }

    
    
    

}

main()