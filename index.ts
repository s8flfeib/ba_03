import { FireFly, FireFlyListener, FireFlyData, FireFlyMessage, FireFlyDataSend, FireFlyDataIdentifier, FireFlyMemberInput, FireFlyMessageInput } from "./firefly";
//import express, {Request, Response, NextFunction, response} from 'express';
const express = require('express');
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const { pool} = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
const fetch = require("fetch");
const socket = require("socket.io");
const multer = require("multer");

const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 2000

const app = express();

const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

const io = socket(server);

//multer setup
const fileStorageEngine = multer.diskStorage({
    destination: (req:any, file:any, cb:any) => {
        cb(null, "./uploads");
    },
    filename: (req:any, file:any, cb:any) => {
        cb(null, Date.now() + "--" + file.originalname);
    }
});

const upload = multer({storage: fileStorageEngine});


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
//var path = require('path')
//app.use(express.static('public'))
app.use(express.static(path.join(__dirname, '../public')));

//set middleware
app.use(bodyParser.urlencoded({ extended: false }));
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

    console.log('test')
    const firefly1 = new FireFly(5000);
    const ws1 = new FireFlyListener(5000);
    const firefly2 = new FireFly(5001);
    const ws2 = new FireFlyListener(5001);
    const firefly3 = new FireFly(5002);
    const ws3 = new FireFlyListener(5002);
    
    
    await ws1.ready();
    await ws2.ready();
    await ws3.ready();



    //Start Index:
    app.get("/", (req: any, res:any) => {
        res.render('index', {user: "Flo"});
        //console.log(req.body)

    })

    app.get("/send_text", checkNotAuthenticated, (req:any, res:any) => {
        const message = JSON.stringify(req.query).split('"')[3];
        console.log("MESSAGE: " + message);
        // console.log(x)
        // console.log(req.query);
        //let text = req.query;
        //console.log(typeof(text));
        const sendData: FireFlyDataSend[] = [
            {value: message}
        ]
        
        const recipients: FireFlyMemberInput[] = [];

        console.log(req.body);

        //var isPrivate = 1;
        var isPrivate = 0;

        if(isPrivate) {
            //private message
            //FireFly_ORGS_IDs:
            // -0x1f0ee3b0210f0ce8f818376a001c152bf13a5436
            // -0xa73905518f8f267e598ff920c203663531bb680b
            // -0x891e51c19bc64dc06fd98ae89dfea7603b047b75
            //recipients.push({identity: "0xa73905518f8f267e598ff920c203663531bb680b"});
            //recipients.push({identity: "0x1f0ee3b0210f0ce8f818376a001c152bf13a5436"});

            //org2
            recipients.push({identity: "0x891e51c19bc64dc06fd98ae89dfea7603b047b75"});

            //ff1 is org0
            firefly1.sendPrivate({
                data: [
                    {
                        value: message,
                    },
                    ],
                    group: {
                    members: recipients,
                    },
            });
        }else{
        //broadcast wo ist der unterschied ob ff1, ff2 oder ff3
            switch(req.user.name) {
                case "Mandant":
                    console.log("Send from M");
                    firefly1.sendBroadcast(sendData); 
                case "Steuerberater":
                    console.log("Send from S");
                    firefly2.sendBroadcast(sendData); 
                case "Finanzamt":
                    console.log("Send from F");
                    firefly3.sendBroadcast(sendData); 
            }

        }
        res.redirect("/users/dashboard")
    })

    app.get("/send_file",  (req: any, res:any) => { 

        res.redirect("/users/dashboard")
    });

    //Send and sage pdf from client to server
    //file is the name of the input 
    //uploade.single('file') for single file
    //req.file gives information
    //uploade.array('files', x) => x give number of how many files are allowed
    //req.files gives informations

    app.post("/send_file", upload.array('file'), async (req:any, res:any) => {
        console.log(req.files);
        console.log("File Uploaded")

        
        var data: FireFlyMessage[];

        data = await firefly1.getData();
        var d = JSON.stringify(data);
        console.log("Type: " + typeof(d));
        var datatobroadcast = d.split(":")[1].split(",")[0].slice(1,-1);

        var id: FireFlyDataSend[] = [
            {value: datatobroadcast}
        ]

        console.log("We got the Data: " + datatobroadcast);

        //1 zu 1 broadcast message
        await firefly1.broadcastData(id);

        var p = await firefly2.getData();
        console.log(p)
        console.log("We broadcasted the Data");

        res.send("Single File upload success")
        // res.redirect("/users/dashboard")
    });

    app.get("/users/dashboard", checkNotAuthenticated, (req:any, res:any) => {
        res.render("dashboard", {user: req.user.name});
    });


    app.get("/users/dashboard_01", checkNotAuthenticated, async (req: any, res:any) => {
        //Load last 25 Messages
        //Get id and Hash of the Messages 
        var allMessages = await firefly1.getMessages(2);
        //console.log(response);
        const rows: MessageRow[] = [];
        //push all 25 messages to MessageRow{message: FireFlyMessage, data:FireFlyData[]}
        for(const message of allMessages) {
            var message_data = await firefly1.retrieveData(message.data)
            rows.push({message: message, data: message_data})
        }
        //access massages and time
        // console.log(rows[20].data[0].value);
        // console.log(rows[20].message.header.created);

        //Set up Socket.io connection to send to the client
        io.on('connection', newConnection);

        function newConnection(socket:any){
            console.log("New Socket Connection: " + socket.id);
            console.log("send rows to client");
            io.emit('chat message received', rows);

            socket.on('disconnect', () => {
                //triggers when closing browser or logout
                console.log('user disconnected');
            })
        }
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


    
    
    

}

main()