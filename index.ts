import { FireFlyFiles, FireFlyMessageSend, FireFlyD, FireFlyBlob, FireFly, FireFlyListener, FireFlyData, FireFlyMessage, FireFlyDataSend, FireFlyDataIdentifier, FireFlyMemberInput, FireFlyMessageInput } from "./firefly";

//import express, {Request, Response, NextFunction, response} from 'express';
const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require("./dbConfig");
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");
// const fetch = require("fetch");
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
// import fetch1 from 'node-fetch';
// import http from 'node:http';


initializePassport(passport);

const PORT = process.env.PORT || 2000

const app = express();


//Socket.io => change to Webstocket
const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})

const io = socket(server);
app.set('socketio', io)

//import { newMessage } from "./public/scripts/script01";
const MAX_MESSAGES = 25;
const TIMEOUT = 15 * 1000;
const dataValues = (data: FireFlyData[]) => data.map(d => d.value);


interface MessageRow {
    message: FireFlyMessage;
    data: FireFlyData[];
}

enum Process_State {
    NONE,
    INIT,
    UNTERLAGEN_UEBERMITTELN,
    UNTERLAGEN_UEBERMITTELT,
    STEUERERKLAERUNG_GESENDET,
    STEUERERKLAERUNG_ERHALTEN,
    STEUERBESCHEID_GESENDET,
    STEUERBESCHEID_ERHALTEN
}

enum Authorizationtype {
    KEINE,
    ALLGEMEIN,
    BEIDES
}

interface Informations {
    client: {
        name: string;
        role: string
    },
    rows: MessageRow[],
    file: FireFlyData[][],
    sb: object[],
    voll: object,
    state: object,
    md: object[],
    user: object
}

interface Client_Informations {
    client: {
        name: string;
        role: string
    },
    mandanten_steuerberater: object[]
}


//const dataValues = (data: FireFlyData[]) => data.map( d => d.value);
//const express = require( "express" );
import * as path from 'path'
import { convertToObject, ExitStatus, isEmptyBindingElement, isNamedExportBindings, parseConfigFileTextToJson, setConstantValue, unescapeLeadingUnderscores } from "typescript";
import axios from "axios";
import { response } from "express";
import { info } from "console";
//var path = require('path')
//app.use(express.static('public'))
app.use(express.static(path.join(__dirname, 'public')));

//enable file upload
app.use(fileUpload({ createParentPath: true }))

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
    //Org_0 = Finanzamt = Admin
    const firefly1 = new FireFly(5000);
    const ws1 = new FireFlyListener(5000);
    //Org_1 = Steuerberater
    const firefly2 = new FireFly(5001);
    const ws2 = new FireFlyListener(5001);
    //Org_2 = Mandant
    const firefly3 = new FireFly(5002);
    const ws3 = new FireFlyListener(5002);

    await ws1.ready();
    await ws2.ready();
    await ws3.ready();

    //Startseite erlaub es Nutzern sich entweder zu registrieren oder sich einzuloggen!
    app.get("/", async (req: any, res: any) => {
        // const user_name = "Finanzamt"
        // const client_information: Client_Informations = {} as any;

        // client_information.client = { name: user_name, role: "F" };
        // client_information.mandanten_steuerberater = [
        //     { name: "Mandant", vollmacht: "1", state_value: "1", sb: "0x2cc89789aa61ea47d737516b1796ff20082dabb2" },
        //     { name: "M", vollmacht: "0", state_value: "0", sb: "0x00" }]


        // sendInfos(user_name, client_information);
        // res.render('basis', { user: "Herzlich Wilkommen!" });
        res.render('index', { user: "Herzlich Wilkommen!" });
    })
    //Das Dashboard leitet einen Nutzer je nach zugehörigkeit zu einer Grupp an das ensprechende Interface weiter!
    app.get("/users/dashboard", checkNotAuthenticated, async (req: any, res: any) => {
        //Speichert Nutzernamen in Variablen
        const user_name = req.user.name;
        //Nimm Rolle für Nutzer mit Name aus lokaler Datenbank => returns(M,S oder F)
        const role = await getRolebyName(user_name);
        //Leitet den Nutzer zum entsprechenden Dashboard um!
        switch (role) {
            case "M":
                res.redirect("/users/mandant")
                break;
            case "S":
                res.redirect("/users/steuerberater")
                break;
            case "F":
                res.redirect("/users/finanzamt")
                break;
        }

    });
    //-----------------------------------------------------------------------//
    //-------------------------------Finanzamt-------------------------------//
    //-----------------------------------------------------------------------//
    app.get("/users/finanzamt", checkNotAuthenticated, async (req: any, res: any) => {
        const user_name = req.user.name;
        const user_id = req.user.id;
        const user_role = "F";
        const firefly = firefly1;
        const f_key = await getEthIdByName(user_name);
        let client_information: Client_Informations = {} as any;
        //Speicher Client Informationen
        client_information.client = { name: user_name, role: user_role };
        //Speicher alle Mandanten des FA
        const mandanten = await getMyMandantsF(user_id);
        client_information.mandanten_steuerberater = mandanten;
        //Sendet Infos an "f_login"
        sendInfos(user_name, client_information);

        res.render("finanzamt")
    })

    app.post("/select_mandant_finanzamt", async (req: any, res: any) => {
        //Setzte Firefly auf M um infos von ausgewähltem Mandanten zu bekommen
        const firefly = firefly1;
        console.log(req.user)
        console.log("Mandant select => get Informations");
        const m_name = req.body.mandant;
        const user_did = await getDIDByName(req.user.name)
        console.log(user_did)
        //Public key bzw. eth_addr des Mandanten aus DB
        const my_key = await getEthIdByName(m_name)
        const my_did = await getDIDByName(m_name)
        const my_sb = await firefly.getSB(my_key);
        const sb_did = await getDIDByAddr(my_sb)
        const fa_key = await getEthIdByName(req.user.name);
        //Sammel alle Messages des Finanzamts
        const allmessages = await getMessages(firefly);
        const pdfs = await getFiles(firefly)
        const voll = await firefly.getVollmacht(my_key);
        const voll_value = Authorizationtype[parseInt(voll)]
        console.log(voll_value)
        const state = await firefly.getState(my_key);
        console.log("STATE: " + state)
        console.log("M_KEY: " + my_key);
        console.log("F_KEY: " + fa_key);
        if (state == 4) {
            firefly.taxdec_received(my_key, fa_key)
        }
        const new_state = await firefly.getState(my_key);
        const state_value = Process_State[new_state];
        //Speicher Infos und sende zurück zum Client
        const informations: Informations = {} as any;

        informations.client = { name: m_name, role: "M" };
        informations.rows = allmessages;
        informations.file = pdfs;
        informations.sb = sb_did;
        informations.voll = { vollmacht: voll_value };
        informations.state = { state: state_value };
        informations.user = { name: req.user.name, id: req.user.id, did: user_did }

        //Alle Mandante die zum Finanzbeamter gehören
        const mandanten = await getUserbyRole("M");
        informations.md = mandanten;

        sendInfosBack(informations);
        res.redirect("users/finanzamt")
        //res.render("finanzamt")
    })

    app.post("/send_text_finanzamt", (req: any, res: any) => {
        console.log("Send from Finanzamt")
        const message = JSON.stringify(req.body.message);
        const sendData: FireFlyMessageSend[] = [
            { value: message }
        ]
        var recipient = req.body.recipient;
        send_chat_message(sendData, recipient, firefly1);
        res.redirect("/users/finanzamt");
    })

    app.post("/upload-file-finanzamt", async (req: any, res: any) => {
        //Setze firefly auf FA
        const firefly = firefly1;
        const fa_key = await getEthIdByName(req.user.name);
        const m_key = await getEthIdByName(req.body.mandant);
        //Speicher Dokument, Empfänger und Mandant Infos des Requests
        const data = req.files.file
        //ausgewählter Mandant
        const mandant = req.body.mandant;
        const recipient = req.body.recipient;
        console.log("Mandant")
        //Get Ethereum Adresse des Mandanten aus der lokalen DB
        const eth_addr_mandant = await getEthIdByName(mandant);
        //Speicher Vollmacht des Mandanten aus SC
        const vollmacht = await firefly.getVollmacht(eth_addr_mandant);
        //Sende als FormData
        var formData = new FormData();
        //Add file to FormData Object
        formData.append('file', data.data, { filename: 'steuerbescheid.pdf' });
        //Upload Data to own FireFly Node returns id
        console.log(recipient)
        //Empfänger nur relevant um Vollmächte abzufragen
        //Daten werden on-chain über broadcast versand
        if (recipient == "Mandant") {
            if (vollmacht != "2") {
                console.log("Keine Empfangsvollmacht!")
                //change state
                await firefly.taxnote_send(m_key, fa_key)
                //Sende SB als private DataTransfere an Mandanten
                await private_data_steuerbescheid(formData, firefly, recipient);
                //Steuerbescheid wurd private an den Mandanten gesendet (Off-Chain)
            } else {
                //send back error
                sendAlert("Es liegt eine Empfangsvollmacht vor, bitte senden Sie den Steuerbescheid an den zuständigen Steuerberater!")
            }
        } else if (recipient == "Steuerberater") {
            if (vollmacht == "2") {
                //change state
                await firefly.taxnote_send(m_key, fa_key)
                console.log("Keine Empfangsvollmacht!")
                //Sende SB als private DataTransfere an Mandanten
                await private_data_steuerbescheid(formData, firefly, recipient);
                //Steuerbescheid wurd private an den Mandanten gesendet (Off-Chain)
            } else {
                sendAlert("Es liegt keine Empfangsvollmacht vor, bitte senden Sie den Steuerbescheid direkt an den Mandanten!")
            }
        }
        res.redirect('/users/dashboard')
    })
    //-----------------------------------------------------------------------//
    //-------------------------------Mandant---------------------------------//
    //-----------------------------------------------------------------------//
    app.get("/users/mandant", checkNotAuthenticated, async (req: any, res: any) => {
        const user_name = req.user.name;
        const user_id = req.user.id;
        const user_role = "M";
        const firefly = firefly3
        //key des mandanten
        const m_key = await getEthIdByName(req.user.name);
        //key des Mandanten zugehörigen Steuerberaters
        const s_key = await firefly.getSB(m_key);
        let client_information: Client_Informations = {} as any;
        //Speicher Client Informationen
        client_information.client = { name: user_name, role: user_role };
        //Lade alle möglichen Steuberater aus DB um in der Liste anzuzeigen => [{},{},{}] => {id,name,password,eth_addr,role}
        const steuerberaterliste = await getUserbyRole("S")
        client_information.mandanten_steuerberater = steuerberaterliste;
        console.log(s_key)
        //If kein Steuerberater exists getSB
        if (s_key == "0x0000000000000000000000000000000000000000") {
            //Sammel daten um Kommunikation zwischen F,M anzuzeigen
            const informations: Informations = {} as any;
            const client_did = await getDIDByName(req.user.name)
            const allmessages = await getMessages(firefly);
            const clinet_state = await firefly.getState(m_key);
            if (clinet_state == 6) {
                firefly.taxnote_received(m_key, m_key)
            }
            const new_state = await firefly.getState(m_key);
            const state_value = Process_State[new_state];
            const pdfs = await getFiles(firefly)
            informations.user = { name: req.user.name, id: req.user.id, did: client_did }
            informations.rows = allmessages;
            informations.file = pdfs;
            informations.state = { state: state_value }
            displayCommunicationFAMA(informations)
            sendInfos(user_name, client_information);
        } else {
            //Zeige zugewiesener SB an als überschriften der boxen
            const current_sb = await firefly.getSB(m_key);
            const sb_name = await getNameByEthaddr(current_sb);
            console.log("current sb: " + sb_name)
            const informations: Informations = {} as any;
            const client_did = await getDIDByName(req.user.name);
            const allmessages = await getMessages(firefly);
            const clinet_state = await firefly.getState(m_key);
            if (clinet_state == 6) {
                firefly.taxnote_received(m_key, m_key)
            }
            const new_state = await firefly.getState(m_key);
            const state_value = Process_State[new_state];

            const pdfs = await getFiles(firefly);
            const voll = await firefly.getVollmacht(m_key);
            const voll_value = Authorizationtype[parseInt(voll)]
            informations.user = { name: req.user.name, id: req.user.id, did: client_did }
            informations.rows = allmessages;
            informations.file = pdfs;
            informations.state = { state: state_value }
            informations.voll = { vollmacht: voll_value }
            informations.sb = [{ current_sb: sb_name }]
            displayCommunication(informations);
            sendInfos(user_name, client_information);
        }
        res.render("mandant")
    })
    app.post("/select_steuerberater_mandant", async (req: any, res: any) => {
        console.log("Choose Mandant")
        console.log(req.body)
        const user_role = "M";
        const user_name = req.user.name;
        const firefly = firefly3;
        //Update lokale DB set steuerberater_id auf id des ausgewählten SB
        const sb_id = await getIdByName(req.body.steuerberater)
        await setSbIdByName(req.user.name, sb_id)
        //Update Contract set mandant[Mandant]=sb
        const m_key = await getEthIdByName(req.user.name);
        const s_key = await getEthIdByName(req.body.steuerberater);
        console.log(m_key + "  :  " + s_key)
        await firefly.setSB(s_key, m_key);
        //Set State from NONE to INIT
        firefly.init_M(m_key);
        ////////////////////////////////////////////////////
        let client_information: Client_Informations = {} as any;
        //Speicher Client Informationen
        client_information.client = { name: user_name, role: user_role };
        //Lade alle möglichen Steuberater aus DB um in der Liste anzuzeigen => [{},{},{}] => {id,name,password,eth_addr,role}
        const steuerberaterliste = await getUserbyRole("S")
        client_information.mandanten_steuerberater = steuerberaterliste;
        //Zeige zugewiesener SB an als überschriften der boxen
        const current_sb = await firefly.getSB(m_key);
        const sb_name = await getNameByEthaddr(current_sb);
        console.log("current sb: " + sb_name)
        const informations: Informations = {} as any;
        const client_did = await getDIDByName(req.user.name);
        const allmessages = await getMessages(firefly);
        const clinet_state = await firefly.getState(m_key);
        const state_value = Process_State[clinet_state];
        const pdfs = await getFiles(firefly);
        const voll = await firefly.getVollmacht(m_key);
        const voll_value = Authorizationtype[parseInt(voll)]
        informations.user = { name: req.user.name, id: req.user.id, did: client_did }
        informations.rows = allmessages;
        informations.file = pdfs;
        informations.state = { state: state_value }
        informations.voll = { vollmacht: voll_value }
        informations.sb = [{ current_sb: sb_name }]
        displayCommunication(informations);
        sendInfos(user_name, client_information);
        //////////////////////////////////////////////////
        res.render("mandant")
    })
    //Send Chat message, immer private also Off-Chain
    app.post("/send_text_mandant", (req: any, res: any) => {
        console.log("Send from Mandant")
        console.log(req.body)
        const message = JSON.stringify(req.body.message);
        const sendData: FireFlyMessageSend[] = [
            { value: message }
        ]
        var recipient = req.body.recipient;
        send_chat_message(sendData, recipient, firefly3);
        res.redirect("/users/dashboard");
    })
    //Handle Vollmächte
    app.post("/vollmacht", async (req: any, res: any) => {
        const firefly = firefly3;
        const m_key = await getEthIdByName(req.user.name);
        // Check ob überhaupt schon ein SB zugeordnet wurde
        const sb = await firefly.getSB(m_key);
        console.log("Current SB: " + sb)
        if (sb == "0x0000000000000000000000000000000000000000") {
            sendAlert("Sie müssen erst einen SB auswählen um Vollmächte auszustellen!")
            res.redirect("/users/mandant")
        } else {
            console.log("WHY DO I GET HERE?")
            //INIT_MANDANT
            const m_addr = await getEthIdByName(req.user.name);

            firefly.init_M(m_addr);
            //const hex_id = await getFFHex(firefly);
            const m_key = await getEthIdByName(req.user.name);
            const s = await firefly.getState(m_key)
            console.log("Handel Vollmacht")
            const vollmacht = parseInt(JSON.stringify(req.body.todo))
            switch (vollmacht) {
                case 1:
                    const response_1 = await firefly.setAllg(m_addr)
                    const id_1 = response_1.id
                    const output_1 = await firefly.getOutput(id_1)
                    var sc = await firefly.getVollmacht(m_key)
                    console.log(sc)
                    var result = {
                        out: output_1,
                        voll: sc,
                        state: Process_State[s]
                    }
                    console.log("Vollmacht: " + JSON.stringify(sc))
                    res.json(result)
                    break;
                case 2:
                    const response_2 = await firefly.setEmpf(m_addr)
                    const id_2 = response_2.id
                    const output_2 = await firefly.getOutput(id_2)
                    console.log(output_2)
                    var sc = await firefly.getVollmacht(m_key)
                    var result2 = {
                        out: output_2,
                        voll: sc,
                        state: Process_State[s]
                    }
                    res.json(result2)
                    break;
                case 3:
                    const response_3 = await firefly.cancelAllg(m_addr)
                    const id_3 = response_3.id
                    const output_3 = await firefly.getOutput(id_3)
                    var sc3 = await firefly.getVollmacht(m_key)
                    var result3 = {
                        out: output_3,
                        voll: sc3,
                        state: Process_State[s]
                    }
                    res.json(result3)
                    break;
                case 4:
                    const response_4 = await firefly.cancelEmpf(m_addr)
                    const id_4 = response_4.id
                    const output_4 = await firefly.getOutput(id_4)
                    var sc4 = await firefly.getVollmacht(m_key)
                    var result4 = {
                        out: output_4,
                        voll: sc4,
                        state: Process_State[s]
                    }
                    res.json(result4)
                    break;

            }
        }

        //res.redirect("/users/mandant")
    })
    app.post("/upload-file-mandant", async (req: any, res: any) => {
        console.log("UPLOAD THAT FILE")
        console.log(req.body)
        const firefly = firefly3;
        const doc_type = req.body.document_type;
        const m_key = await getEthIdByName(req.user.name);
        const current_sb = await firefly3.getSB(m_key)
        const current_voll = await firefly3.getVollmacht(m_key);
        const recipient = req.body.recipient;
        const data = req.files.file
        //Upload Data zu privatem Firefly node
        //Sende als FormData
        var formData = new FormData();
        //Add file to FormData Object
        formData.append('file', data.data, { filename: 'unterlagen.pdf' });
        const data_id: string = await firefly.uploadData(formData);
        //Verbietet das senden einer SE an einen SB
        console.log("Type: " + doc_type)
        console.log("Res: " + recipient)
        if (doc_type == "Steuererklärung" && recipient == "Steuerberater") {
            //Send alter over socket => Sie können keine SE an ihren SB senden!
            sendAlert("Sie dürfen keine Steuererklärung an den Steuerberater senden!")
        }
        //Senden einer SE an FA
        // => Es darf keine SB existieren oder er hat keine Vollmacht
        // => Sonst muss sich der Mandant an den SB wenden
        if (doc_type == "Steuererklärung" && recipient == "Finanzamt") {
            if (current_sb == "0x0000000000000000000000000000000000000000" || current_voll == "0") {
                //Send private Message with Doc_id to FA
                await private_unterlagen_FA(data_id, firefly, recipient);
            } else {
                //Send alert over socket => Kommunikation über SB oder widerrufen Sie die Vollmacht
                sendAlert("Bitte wenden Sie sich an Ihren Steuerberater oder widerrufen Sie dessen Vollmacht!")
            }
        }
        //Senden von U an SB
        // => Geht immer auch als Broadcast
        // => check if SB exists
        if (doc_type == "Unterlagen" && recipient == "Steuerberater") {
            if (current_sb == "0x0000000000000000000000000000000000000000") {
                //Alert bitte wählen Sie zuerst einen SB
                sendAlert("Bitte wählen Sie zuerst einen Steuerberater aus!")
            } else {
                //Broadcast Data current_sb && current_fa
                //set new State
                await firefly.files_send(m_key)
                await broadcast_data_id(data_id, firefly)
            }

        }
        //Senden von U an FA
        //=> Geht nur, wenn kein SB oder keine VM
        //=>Sonst Bitte an SB wenden oder VM widerrufen
        if (doc_type == "Unterlagen" && recipient == "Finanzamt") {
            //Wenn keine SB für M existiert oder dieser keine Vollmacht hat
            if (current_sb == "0x0000000000000000000000000000000000000000" || current_voll == "0") {
                //Send private Data to FA
                //Set State from NONE to Unterlagen_gesendet
                await firefly.init_M(m_key);
                await firefly.files_send(m_key)
                await private_unterlagen_FA(data_id, firefly, recipient);
            } else {
                //=> Alert => Wenden Sie sich bitte an Ihren SB oder widerrufen Sie dessen Vollmacht!
                sendAlert("Bitte wenden Sie sich an Ihren Steuerberater oder widerrufen Sie dessen Vollmacht!")
            }

        }
        res.redirect('/users/dashboard')
    })
    //-----------------------------------------------------------------------//
    //-------------------------------Steuerberater---------------------------//
    //-----------------------------------------------------------------------//
    app.get("/users/steuerberater", checkNotAuthenticated, async (req: any, res: any) => {
        const user_name = req.user.name;
        const user_id = req.user.id;
        const user_role = "S";
        const firefly = firefly2;
        const f_key = await getEthIdByName(user_name);
        let client_information: Client_Informations = {} as any;
        //Speicher Client Informationen
        client_information.client = { name: user_name, role: user_role };
        //Speicher alle Mandanten des FA
        const mandanten = await getMyMandants(user_id);
        client_information.mandanten_steuerberater = mandanten;
        //Sendet Infos an "f_login"
        sendInfos(user_name, client_information);
        res.render("steuerberater")
    })
    app.post("/select_mandant_steuerberater", async (req: any, res: any) => {
        //Setzte Firefly auf M um infos von ausgewähltem Mandanten zu bekommen
        const firefly = firefly2;
        const user_id = req.user.id
        console.log(req.user)
        console.log("Mandant select => get Informations");
        const m_name = req.body.mandant;
        const user_did = await getDIDByName(req.user.name)
        console.log(user_did)
        //Public key bzw. eth_addr des Mandanten aus DB
        const my_key = await getEthIdByName(m_name)
        const s_key = await getEthIdByName(req.user.name)
        const my_did = await getDIDByName(m_name)
        const my_sb = await firefly.getSB(my_key);
        const sb_did = await getDIDByAddr(my_sb)
        //Sammel alle Messages des Finanzamts
        const allmessages = await getMessages(firefly);
        const pdfs = await getFiles(firefly)
        const voll = await firefly.getVollmacht(my_key);
        const voll_value = Authorizationtype[parseInt(voll)]
        console.log(voll_value)
        const state = await firefly.getState(my_key);
        if (state == 2) {
            console.log("change state!")
            firefly.files_received(my_key, s_key);
        }
        const new_state = await firefly.getState(my_key)
        const state_value = Process_State[new_state];
        //Speicher Infos und sende zurück zum Client
        const informations: Informations = {} as any;

        informations.client = { name: m_name, role: "M" };
        informations.rows = allmessages;
        informations.file = pdfs;
        informations.sb = sb_did;
        informations.voll = { vollmacht: voll_value };
        informations.state = { state: state_value };
        informations.user = { name: req.user.name, id: req.user.id, did: user_did }

        //Alle Mandante die zum Finanzbeamter gehören
        //const mandanten = await getUserbyRole("M");
        const mandanten = await getMyMandants(user_id);
        informations.md = mandanten;

        sendInfosBackSB(informations);
        res.redirect("users/steuerberater")
        //res.render("finanzamt")
    })
    app.post("/send_text_steuerberater", (req: any, res: any) => {
        //Hole die Nachricht und füge sie in ein FFMS Datentyp
        console.log("WE get here")
        const message = JSON.stringify(req.body.message);
        const sendData: FireFlyMessageSend[] = [
            { value: message }
        ]
        //Empfänger speicher, muss Broadcast, Mandant, Steuerberater oder Finanzverwaltung sein
        var recipient = req.body.recipient;
        //Sende die Nachricht 
        send_chat_message(sendData, recipient, firefly2);
        //Lade die Seite neu
        res.redirect("/users/dashboard");
    })
    app.post("/upload-file-steuerberater", async (req: any, res: any) => {
        //Setze firefly auf SB
        const firefly: FireFly = firefly2;
        //Speicher Dokument, Empfänger und Mandant Infos des Requests
        const data = req.files.file
        const mandant = req.body.mandant
        const document_type = req.body.document_type
        //Get Ethereum Adresse des Mandanten aus der lokalen DB
        const m_key = await getEthIdByName(mandant);
        console.log(m_key)
        //Speicher Vollmacht des Mandanten aus SC
        const vollmacht = await firefly.getVollmacht(m_key);
        //Speicher Finanzbeamter des Mandanten aus SC

        //const finanzbeamter = await firefly.getFa(eth_addr_mandant);

        if (document_type == "Steuererklärung") {
            console.log("SE")
            //Check for Vollmacht
            const voll = await firefly.getVollmacht(m_key);
            if (voll == "0") {
                sendAlert("Sie haben keine Vollmacht, bitte wenden Sie sich an den Mandanten!")
            } else {
                //change state
                const s_key = await getEthIdByName(req.user.name);
                await firefly.taxdec_send(m_key, s_key)
                var formData = new FormData();
                //Add file to FormData Object
                formData.append('file', data.data, { filename: 'steuererklärung.pdf' });
                await broadcast_data_steuererklärung(formData, firefly);
            }
        } else {
            //Sende SB als Broadcast an alles drei parteien
            console.log("SB")
            var formData = new FormData();
            formData.append('file', data.data, { filename: 'steuerbescheid.pdf' });
            await broadcast_data_steuerbescheid(formData, firefly);
        }
        res.redirect('/users/dashboard')
    })



    app.post('/upload-file', async (req: any, res: any) => {
        //Ändert Status des Mandanten
        await firefly1.filesSend();
        //Speicher Dokument des Requests
        const data = req.files.file
        //Speicher Empfänger und Dokumenten Infos
        const recipient = req.body.recipient
        const document_type = req.body.document_type
        //Get Ethereum Adresse aus der lokalen DB
        const eth_addr_mandant = await getEthIdByName(recipient);
        // const eth_addr_finanzbeamter = await firefly1.getFA(eth_addr_mandant);
        // if (recipient == "Finanzamt") {
        //     const voll = await firefly1.getVollmacht(eth_addr_mandant)
        //     if (voll != "KEINE") {
        //         res.send() => Sie haben keine Vollmacht und damit keine Erlaubnis mit dem FA von M in verbindung zu treten
        //     }
        // }
        /////////// Vollmacht liegt vor => SB darf Doc auch an F senden

        //create FFMI object to push recipients on
        //Used for FF so that it know who the members are
        const recipients: FireFlyMemberInput[] = [];
        //Create new FormData object to upload file to node
        var formData = new FormData();
        //Add file to FormData Object
        formData.append('file', data.data, { filename: 'document.pdf' });
        //Upload Data to own FireFly Node
        const data_id: string = await firefly1.uploadData(formData);
        console.log("Data id to send to other members: " + data_id)
        //create data object with the id of the data posts
        const distribute_data: FireFlyDataSend[] = [
            { id: data_id }
        ]
        //Broadcast or send Data privately to other members depending on the recipient input
        switch (recipient) {
            case "Broadcast":
                console.log("Broadcast")
                switch (req.user.name) {
                    case "Mandant":
                        console.log("Send from M");
                        await firefly1.broadcastData(distribute_data);
                        break;
                    case "Steuerberater":
                        console.log("Send from S");
                        await firefly2.broadcastData(distribute_data);
                        break;
                    case "Finanzamt":
                        console.log("Send from F");
                        await firefly3.broadcastData(distribute_data);
                        break;
                }
                break;
            case "Mandant":
                recipients.push({ identity: "org_0" });
                switch (req.user.name) {
                    case "Mandant":
                        firefly1.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                    case "Steuerberater":
                        firefly2.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                    case "Finanzamt":
                        firefly3.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                }
                break;
            case "Berater":
                recipients.push({ identity: "org_1" });
                switch (req.user.name) {
                    case "Mandant":
                        firefly1.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                    case "Steuerberater":
                        firefly2.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                    case "Finanzamt":
                        firefly3.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                }
                break;
            case "Finanzamt":
                recipients.push({ identity: "org_2" });
                switch (req.user.name) {
                    case "Mandant":
                        firefly1.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                    case "Steuerberater":
                        firefly2.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                    case "Finanzamt":
                        firefly3.privateData({
                            data: distribute_data,
                            group: { members: recipients },
                        });
                        break;
                }
                break;
        }
        res.redirect('/users/dashboard')
    })










    //check authentication before moving on to the rest
    app.get("/users/register", checkAuthenticated, (req: any, res: any) => {
        res.render('register');
    })

    app.post("/users/register", async (req: any, res: any) => {
        let { name, password, password2 } = req.body;
        let errors: any = [];

        //validation check
        if (!name || !password || !password2) {
            errors.push({ message: "Bitte füllen Sie alle Felder aus" });
        }
        if (password != password2) {
            errors.push({ message: "Passwörter stimmen nicht überein!" });
        }
        // if (password.length < 6) {
        //     errors.push({ message: "Passwort muss bestimmte Länge haben"})
        // }
        if (errors.length > 0) {
            res.render('register', { errors });
        } else {
            //Form Validation ok

            let hashedPassword = await bcrypt.hash(password, 10);
            //console.log(hashedPassword);

            //check if user allready exists für mich irrelevant
            pool.query(
                'SELECT * FROM users WHERE name = $1', [name], (err: String, results: any) => {
                    if (err) {
                        throw err
                    }
                    //console.log(results.rows);

                    if (results.rows.length > 0) {
                        errors.push({ message: "Name bereits vergeben" });
                        res.render('register', { errors });
                    } else {
                        //register the user
                        pool.query(
                            `INSERT INTO users(name, password)
                            VALUES($1, $2)
                            RETURNING id, password`, [name, hashedPassword], (err: any, results: any) => {
                            if (err) {
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
    app.get("/users/login", checkAuthenticated, (req: any, res: any) => {
        res.render('login');
    })

    app.post("/users/login", passport.authenticate('local', {
        successRedirect: "/users/dashboard",
        failureRedirect: "/users/login",
        failureFlash: true
    })
    );

    app.get('/users/logout', (req: any, res: any) => {
        console.log("socket closed!")
        req.logOut();
        req.flash('success_msg', "Sie sind abgemeldet");
        res.redirect("/users/login");
    })


    //Wenn der Nutzer nicht Authenticated ist und er auf das Dashboard will wird er zur login zurück geleitet
    //Wenn er es ist kann er direkt darauf zugreifen und wenn er auf login/register will wird er zum dashboard geleitet
    function checkAuthenticated(req: any, res: any, next: any) {
        if (req.isAuthenticated()) {
            return res.redirect("/users/dashboard");
        }
        next();
    }

    function checkNotAuthenticated(req: any, res: any, next: any) {
        if (req.isAuthenticated()) {
            return next();
        }
        res.redirect("/users/login");
    }
    //Pagination probably better on client side !?
    function paginatedResults(model: any) {
        return (req: any, res: any, next: any) => {
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);

            const startIndex = (page - 1) * limit;
            const endINdex = page * limit;

            const results = {} as any

            if (endINdex < model.length) {
                results.next = {
                    page: page + 1,
                    limit: limit
                }
            }


            if (startIndex > 0) {
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

    async function getFiles(firefly: FireFly) {
        //Get all PDF Files 
        const data = await firefly.getAllData();
        //console.log(data)
        const files = [];
        //get all the PDF
        for (const p of data) {
            if (p.value == null) {
                files.push(p)
            }
        }
        //console.log(files)
        //get the actuall data value 
        const pdfs = [];
        for (const i of files) {
            var pdf = await firefly.retrieveDataBlob([{ id: i.id, hash: i.hash }])
            pdfs.push(pdf)
        }
        //console.log(pdfs)
        return pdfs;
    }

    async function getMessages(firefly: FireFly) {
        //Get all Text Messages
        //Get FireFly Messages(id, hash) from which we need to retrieve the data
        var allMessages = await firefly.getAllMessages();
        // console.log(allMessages[0].data)
        //Rows will be send to the client
        const rows: MessageRow[] = [];
        //push the Data of the Messages onto rows which then will be send to the Client
        for (const message of allMessages) {
            //get Data from Message_id
            var message_data = await firefly.retrieveData(message.data)
            //push message_data to rows
            rows.push({ message: message, data: message_data })
        }
        return rows;
    }

    function sendInfos(user: any, informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection: " + user + " : " + socket.id);
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('chat message received', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }

    function sendFlogin(user: any, informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection: " + user + " : " + socket.id);
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('f login', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }

    function sendInfosBack(informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection:" + " + socket.id");
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('send informations from F', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }

    function sendInfosBackSB(informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection:" + " + socket.id");
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('send informations from SB', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }


    async function getorgas(firefly: FireFly) {
        const orga = await firefly.getOrga();
    }

    async function getUserbyRole(role: string) {
        //console.log("IM here")
        // var role = "S";
        try {
            var res = await pool.query('SELECT name, eth_addr from users where role=$1', [role]);
            //console.log(res.rows[0])
            return res.rows;
        } catch (err) {
            throw err
        }
    }

    //Gibt die Rolle aus der lokalen DB für einen passenden Nutzernamen zurück
    async function getRolebyName(name: string) {
        try {
            var res = await pool.query('SELECT * from users where name=$1', [name]);
            return res.rows[0].role;
        } catch (err) {
            throw err
        }
    }

    async function getMyMandants(id: number) {
        try {
            var res = await pool.query('SELECT eth_addr, name from users where steuerberater_id=$1', [id]);
            return res.rows;
        } catch (err) {
            throw err
        }
    }

    async function getMyMandantsF(id: number) {
        try {
            var res = await pool.query('SELECT eth_addr, name, steuerberater_id from users where finanzamt_id=$1', [id]);
            return res.rows;
        } catch (err) {
            throw err
        }
    }


    async function getEthId() {
        //onsole.log("IM here")
        var role = "M";
        try {
            var res = await pool.query('SELECT eth_addr from users where role=$1', [role]);
            //console.log(res.rows[0])
            return res.rows;
        } catch (err) {
            throw err
        }
    }


    async function getDIDByName(name: string) {
        var n = name;
        try {
            var res = await pool.query('SELECT did from users where name=$1', [n]);
            //console.log(res.rows[0])
            return res.rows[0].did;
        } catch (err) {
            throw err
        }
    }
    async function getDIDByAddr(addr: string) {
        var a = addr;
        try {
            var res = await pool.query('SELECT did from users where eth_addr=$1', [a]);
            //console.log(res.rows[0])
            return res.rows[0].did;
        } catch (err) {
            throw err
        }
    }
    async function getFFHex(firefly: FireFly) {
        const identities = await firefly.getIDs();
        const parent = identities[4].parent
        const org = await firefly.getHex(parent)
        const hex_id = org[0].value
        return hex_id;
    }

    async function send_Message(sendData: any, recipient: any, firefly: any) {
        const recipients: FireFlyMemberInput[] = [];
        var data = {
            header: {
                txtype: "unpinned",
            },
            data: sendData,
            group: { members: recipients },
        }
        switch (recipient) {
            case "Broadcast":
                recipients.push({ identity: "org_0" }, { identity: "org_1" }, { identity: "org_2" });
                data.group.members = recipients
                firefly.sendPrivate(data);
                break;
            case "Mandant":
                recipients.push({ identity: "org_0" })
                firefly.sendPrivate(data);
                break;
            case "Berater":
                recipients.push({ identity: "org_1" })
                firefly.sendPrivate(data);
                break;
            case "Finanzamt":
                recipients.push({ identity: "org_2" })
                firefly.sendPrivate(data);
                break;
        }
    }
    //----------------Datenbank Abfragen----------------//
    async function getIdByName(name: string) {
        try {
            var res = await pool.query('SELECT id FROM users WHERE name=$1', [name]);
            return res.rows[0].id;
        } catch (err) {
            throw err
        }
    }
    async function setSbIdByName(name: string, identification: number) {
        try {
            var res = await pool.query('UPDATE users SET steuerberater_id=$1 where name=$2', [identification, name]);
            return res.rows;
        } catch (err) {
            throw err
        }
    }
    async function getEthIdByName(name: string) {
        var n = name;
        try {
            var res = await pool.query('SELECT eth_addr from users where name=$1', [n]);
            //console.log(res.rows[0])
            return res.rows[0].eth_addr;
        } catch (err) {
            throw err
        }
    }

    async function getNameByEthaddr(address: string) {
        try {
            var res = await pool.query('SELECT name from users where eth_addr=$1', [address]);
            return res.rows[0].name;
        } catch (err) {
            throw err
        }
    }




    //----------------FireFly send Message----------------//
    //Chat Message: unpinned => Off-Chain, send_private,
    // taged as chat_message uses Data Exchange to directly send Message
    //Can have Broadcast, Mandant, Steuerberater oder Finanzamt as recipientS
    async function send_chat_message(message: any, recipient: any, firefly: any) {
        const recipients: FireFlyMemberInput[] = [];
        var data = {
            header: {
                txtype: "unpinned",
                tag: "chat_message"
            },
            data: message,
            group: { members: recipients },
        }
        console.log("Why is the message a broadcast")
        console.log(data)
        console.log(recipient)
        switch (recipient) {
            case "Broadcast":
                recipients.push({ identity: "org_0" }, { identity: "org_1" }, { identity: "org_2" });
                data.group.members = recipients
                firefly.privateMessage(data);
                break;
            case "Mandant":
                recipients.push({ identity: "org_2" })
                firefly.privateMessage(data);
                break;
            case "Berater":
                recipients.push({ identity: "org_1" })
                firefly.privateMessage(data);
                break;
            case "Finanzamt":
                recipients.push({ identity: "org_0" })
                firefly.privateMessage(data);
                break;
        }
    }
    //Send Dokuments: pinned => On-Chain, broadcast 
    //=> safes Data to IPFS so anyone of the network can acces the data
    // Sends Data Taged as Steuerbescheid
    async function private_data_steuerbescheid(data: FormData, firefly: FireFly, recipient: any) {
        //Upload Data to local FireFly node returns id that can be send 
        //as a message to give others access to that Data 
        const data_id: string = await firefly.uploadData(data);
        //
        const recipients: FireFlyMemberInput[] = [];
        var data_to_send = {
            header: {
                txtype: "unpinned",
                tag: "steuerbescheid"
            },
            data: [
                { id: data_id }
            ],
            group: { members: recipients }
        }
        //
        console.log(recipient)
        if (recipient == "Mandant") {
            console.log("Do we get here?")
            recipients.push({ identity: "org_2" })
            firefly.privateMessage(data_to_send);
        } else if (recipient == "Steuerberater") {
            recipients.push({ identity: "org_1" })
            firefly.privateMessage(data_to_send);
        }
    }
    // Sends Data Taged as Steuererklärung
    async function broadcast_data_steuerbescheid(data: FormData, firefly: FireFly) {
        //Upload Data to local FireFly node returns id that can be send 
        //as a message to give others access to that Data 
        const data_id: string = await firefly.uploadData(data);
        //
        var data_to_send = {
            header: {
                txtype: "batch-pin",
                tag: "steuerbescheid"
            },
            data: [
                { id: data_id }
            ],
        }
        //Broadcast Message with Data_Id 
        await firefly.broadcastMessage(data_to_send);
    }
    // Sends Data Taged as Steuererklärung
    async function broadcast_data_steuererklärung(data: FormData, firefly: FireFly) {
        //Upload Data to local FireFly node returns id that can be send 
        //as a message to give others access to that Data 
        const data_id: string = await firefly.uploadData(data);
        //
        var data_to_send = {
            header: {
                txtype: "batch-pin",
                tag: "steuererklaerung"
            },
            data: [
                { id: data_id }
            ],
        }
        //Broadcast Message with Data_Id 
        await firefly.broadcastMessage(data_to_send);
    }
    // Sends Data Taged as Dokumente
    async function broadcast_data(data: FormData, firefly: FireFly) {
        //Upload Data to local FireFly node returns id that can be send 
        //as a message to give others access to that Data 
        const data_id: string = await firefly.uploadData(data);
        //
        var data_to_send = {
            header: {
                txtype: "batch-pin",
                tag: "dokumente"
            },
            data: [
                { id: data_id }
            ],
        }
        //Broadcast Message with Data_Id 
        await firefly.broadcastMessage(data_to_send);
    }
    // Broadcast Data-ID
    async function broadcast_data_id(data_id: string, firefly: FireFly) {
        var data_to_send = {
            header: {
                txtype: "batch-pin",
                tag: "dokumente"
            },
            data: [
                { id: data_id }
            ],
        }
        //Broadcast Message with Data_Id 
        await firefly.broadcastMessage(data_to_send);
    }
    //Sends private U an FA
    async function private_unterlagen_FA(data_id: string, firefly: FireFly, recipient: any) {
        //Upload Data to local FireFly node returns id that can be send 
        const recipients: FireFlyMemberInput[] = [];
        var data_to_send = {
            header: {
                txtype: "unpinned",
                tag: "unterlagen"
            },
            data: [
                { id: data_id }
            ],
            group: { members: recipients }
        }
        //
        console.log(recipient)
        if (recipient == "Finanzamt") {
            console.log("Do we get here?")
            recipients.push({ identity: "org_0" })
            firefly.privateMessage(data_to_send);
        } else if (recipient == "Steuerberater") {
            recipients.push({ identity: "org_1" })
            firefly.privateMessage(data_to_send);
        }
    }



    //----------------Send Infos über Socketconnection to clinet----------------//
    //Send Errors die als Alert angezeigt werden
    function sendAlert(informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection:" + " + socket.id");
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('send alert', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }

    //Send Errors die als Alert angezeigt werden
    function displayCommunicationFAMA(informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection:" + " + socket.id");
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('display infos without selected sb', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }

    function displayCommunication(informations: any) {
        //Socket Connection zur Übermittlung von Informationen von dem Server zum Client
        io.on('connection', newConnection);
        let socket_id: any = [];
        async function newConnection(socket: any) {
            console.log("New Socket Connection:" + " + socket.id");
            socket_id.push(socket.id);
            //Entfernt all bereits existierenden Socket Verbindungen
            if (socket_id[0] === socket.id) {
                //Entfernt alle Listener einer Subfrequenz Verbindung mit der selben ID
                io.removeAllListeners('connection');
            }
            //Sende Informationen (orgas,user,rows,file,sb,voll,state) an den Client
            io.emit('display mandant', informations);
            //Triggert sobald ein User disconnected
            socket.on('disconnect', () => {
                //Triggert, wenn der Tab gschloosen oder ein User sich abmeldet
                console.log('Socket connection closed!');
            })
        }
    }
}

main()