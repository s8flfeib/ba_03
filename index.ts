import { FireFly, FireFlyListener, FireFlyData, FireFlyMessage, FireFlyDataSend, FireFlyDataIdentifier } from "./firefly";
import express, {Request, Response, NextFunction} from 'express';
const bcrypt = require('bcrypt');
const { pool} = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");


const initializePassport = require("./passportConfig");

initializePassport(passport);

const PORT = process.env.PORT || 2000

//import { pool } from "./dbConfig";


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

//set middleware
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

    app.get("/send_text", checkNotAuthenticated, (req: Request, res:Response) => {
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
        res.redirect("/users/dashboard")
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

        res.redirect("/users/dashboard");
        
    })

    //check authentication before moving on to the rest
    app.get("/users/dashboard", checkNotAuthenticated, (req: any, res:any) => {
        //console.log(req.user);
        res.render('dashboard', {user: req.user.name});
    })

    //check authentication before moving on to the rest
    app.get("/users/register", checkAuthenticated, (req: Request, res:Response) => {
        res.render('register');
    })
    app.post("/users/register", async (req:Request, res:Response) => {
        
        let { name, password, password2 } = req.body;
        let errors:any = [];

        // console.log({
        //     name,
        //     password,
        //     password2
        // })

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
    app.get("/users/login", checkAuthenticated, (req: Request, res:Response) => {
        res.render('login');
    })

    app.post("/users/login", passport.authenticate('local', {
            successRedirect: "/users/dashboard",
            failureRedirect: "/users/login",
            failureFlash: true
        })
    );

    app.get('/users/logout', (req:any,res:any) => {
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


    
    
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    })

}

main()