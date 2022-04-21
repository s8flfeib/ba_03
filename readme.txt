1. Github respository cloneen:
    https://github.com/s8flfeib/ba_03.git

2. FireFly Stack mit 3 Membern erzeugen
    siehe: https://hyperledger.github.io/firefly/gettingstarted/gettingstarted.html

3. Stack starten

4. Smart Contrac deployen

    a) clone openzeppelin 
        https://github.com/OpenZeppelin/openzeppelin-contracts.git
    Anweisung sieht: https://hyperledger.github.io/firefly/tutorials/custom_contracts.html
    b) solc --combined-json abi,bin Vollmacht.sol > Vollmacht.json
    c) ff deploy stackname Vollmacht.json => wähle Vollmacht.sol
    
    Mit Hilfe von Postman oder Änlichem folgende API calls ausführen
    d) POST Request mit {"input": {
        "abi": #Hier kommt die ABI aus dem Vollmacht.json file hin 
    }} an http://localhost:5000/api/v1/namespaces/default/contracts/interfaces/generate
    e) Copy der Response des letzten calls und POST an http://localhost:5000/api/v1/namespaces/default/contracts/interfaces
        ! Name = mycontract, version=v1.0.0
    f) POST http://localhost:5000/api/v1/namespaces/default/apis
    Folgenden Request senden
    {
        "name": "mycontract",
        "interface": {
            "id": #ID aus der letzten Response
        },
        "location": {
            "address": #Address des Smart Contracts, im output des ff deploys zu sehen
        }
    }
    !! Name unbedingt auf mycontract setzen, wird für die api calls an den Smart Contract benötigt

5. lokale PostgreSQL Datenbank starten und mit dem folgenden Relation erstellen

    create table users(
        id serial primary key,
        name varchar(100),
        password varchar(100),
        steuerberater_id varchar(50),
        finanzamt_id varchar(50),
        eth_addr varchar(200),
        role varchar(10),
        did varchar(100));

6. node version: v17.7.2

7. npm start 


Beim Testen der Anwendung ist unbedingt folgende Reihenfolge zu beachten:

1. Registriere einen Finanzbeamten
1a. Einmaliges einloggen des Beamten

2. Registriere einen Steuerberater
2a. Einmaliges einloggen des Beraters

3. Registriere einen Mandanten

Nach diesen Schritten kann der Mandant den Prozess anstossen!
