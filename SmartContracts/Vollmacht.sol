import "openzeppelin-contracts/contracts/access/AccessControl.sol";

contract Vollmacht is AccessControl {
    bytes32 public constant MANDANT = keccak256("MANDANT");
    bytes32 public constant STEUERBERATER = keccak256("STEUERBERATER");
    bytes32 public constant FINANZBEAMTER = keccak256("FINANZBEAMTER");

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    enum Authorizationtype {
        KEINE,
        ALLGEMEIN,
        BEIDES
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

    mapping(address => Mandant) mandanten;

    struct Mandant {
        Process_State state;
        Authorizationtype ty;
        address sb;
        address fa;
    }

    mapping(address => Steuerberater) steuerberater;

    // Setze auf True wenn steuerberater registriert
    struct Steuerberater {
        bool valid;
    }

    mapping(address => Finanzverwaltung) finanzbeamte;

    struct Finanzverwaltung {
        bool valid;
    }

    //////////////////// Role Control ////////////////////

    //////////////////// Prozess_Status ////////////////////
    function setState(Process_State input) public {
        mandanten[msg.sender].state = input;
    }

    function setSB(address addr, address sender) public onlyRole(MANDANT) {
        mandanten[sender].sb = addr;
    }

    function getSB(address sender) public view returns (address) {
        return mandanten[sender].sb;
    }

    function setFA(address addr, address sender) public onlyRole(MANDANT) {
        mandanten[sender].fa = addr;
    }

    function getFA(address sender) public view returns (address) {
        return mandanten[sender].fa;
    }

    function resetState(address addr) public {
        mandanten[addr].state = Process_State.NONE;
    }

    //Gibt Status für einen Mandanten x zurück!
    function getState(address addr) public view returns (Process_State) {
        return mandanten[addr].state;
    }

    function getValidSB(address addr) public view returns (bool) {
        return steuerberater[addr].valid;
    }

    function getValidFA(address addr) public view returns (bool) {
        return finanzbeamte[addr].valid;
    }

    //Triggert durch: Ausstellen einer Vollmacht, Unterlagen senden überspringt diesen Schritt
    function init_Mandant(address addr) public onlyRole(MANDANT) {
        //Nur der Mandant
        require(
            mandanten[addr].state == Process_State.NONE,
            "Nur ein Mandant kann den Prozess initieren"
        );
        require(!steuerberater[addr].valid && !finanzbeamte[addr].valid);
        mandanten[addr].state = Process_State.INIT;
        //mandanten[msg.sender].rolle.add(msg.sender);
    }

    function init_Steuerberater(address addr) public onlyRole(STEUERBERATER) {
        //Nur der Mandant
        require(
            mandanten[addr].state == Process_State.NONE,
            "Mandant kann kein Steuerberater sein"
        );
        require(!finanzbeamte[addr].valid, "User ist bereits Finanzbeamter");
        steuerberater[addr].valid = true;
        //mandanten[msg.sender].rolle.add(msg.sender);
    }

    function init_Finanzamt(address addr) public onlyRole(FINANZBEAMTER) {
        //Nur Steuerberater
        require(mandanten[addr].state == Process_State.NONE, "state incorrect");
        require(!steuerberater[addr].valid, "User ist allready part of FA");
        finanzbeamte[addr].valid = true;
    }

    function files_send(address addr) public onlyRole(MANDANT) {
        //Nur der Mandant gegeben da PrcessState INIT
        require(
            mandanten[addr].state == Process_State.INIT,
            "incorrect process state"
        );
        mandanten[addr].state = Process_State.UNTERLAGEN_UEBERMITTELN;
        //Steuerberater Unterlagen erhalten!
    }

    //FKt des Steuerberaters braucht als Argument addresse des Mandanten
    function files_received(address addr, address sender)
        public
        onlyRole(STEUERBERATER)
    {
        //Nur der Steuerberater
        require(
            mandanten[addr].state == Process_State.UNTERLAGEN_UEBERMITTELN,
            "Process State stimmmt nicht"
        );
        //was passiert wenn kein sb
        require(
            mandanten[addr].sb == sender,
            "Nur ein SB kann diese Funktion aufrufen"
        );
        //liegt vollmacht vor
        mandanten[addr].state = Process_State.UNTERLAGEN_UEBERMITTELT;
    }

    //Wenn Vollmacht => Steuerberater access
    //addr = M, sender=SB
    function taxdec_send(address addr, address sender) public {
        //Unterlagen müssen nicht übermittelt sein, Mandant kann SE senden ohne SB
        if (mandanten[addr].ty != Authorizationtype.KEINE) {
            //Wenn eine Vollmacht vorliegt, muss es der Steuerberater senden.
            require(mandanten[addr].sb == sender, "muss SB sein");
        } else {
            require(sender == addr, "Muss Mandant sein");
            //Mandant, wenn keine Vollmacht vorliegt
        }
        mandanten[addr].state = Process_State.STEUERERKLAERUNG_GESENDET;
    }

    modifier istFinanzamtvon(address addr, address sender) {
        require(mandanten[addr].fa == sender, "only FA allowed to access Fkt");
        _;
    }

    //addr = M, sender=FA
    function taxdec_received(address addr, address sender)
        public
        istFinanzamtvon(addr, sender)
        onlyRole(FINANZBEAMTER)
    {
        //Bekomm das Finanzamt
        require(
            mandanten[addr].state == Process_State.STEUERERKLAERUNG_GESENDET,
            "Wrong state"
        );
        mandanten[addr].state = Process_State.STEUERERKLAERUNG_ERHALTEN;
    }

    //sender=FA, addr= M
    function taxnote_send(address addr, address sender)
        public
        istFinanzamtvon(addr, sender)
        onlyRole(FINANZBEAMTER)
    {
        // Kann nur das Finanzamt senden
        require(
            mandanten[addr].state == Process_State.STEUERERKLAERUNG_ERHALTEN,
            "wrong state"
        );
        mandanten[addr].state = Process_State.STEUERBESCHEID_GESENDET;
    }

    //aufgerufen von M oder SB mit addr:M
    function taxnote_received(address addr, address sender) public {
        //Bekommt Mandant wenn keine Empfangsvollmacht existiert
        //Bekommt SB wenn eine Empfangsvollmacht existiert
        require(
            mandanten[addr].state == Process_State.STEUERBESCHEID_GESENDET,
            "wrong state"
        );
        if (mandanten[addr].ty == Authorizationtype.BEIDES) {
            require(mandanten[addr].sb == sender, "has to be SB");
        } else {
            require(addr == sender, "has to be M");
        }
        mandanten[sender].state = Process_State.STEUERBESCHEID_ERHALTEN;
    }

    //// Mit Address klar machen, wer die Funktionen aufrufen kann
    //////////////////// Vollmächte ////////////////////
    // => Change to new Struct !!!
    function getVollmacht(address addr)
        public
        view
        returns (Authorizationtype)
    {
        return mandanten[addr].ty;
    }

    //Allgemeine Vollmacht
    function setAllg(address sender) public onlyRole(MANDANT) {
        //require allg doesnt exist allready
        mandanten[sender].ty = Authorizationtype.ALLGEMEIN;
    }

    //Empfangsvollmacht
    function setEmpf(address sender) public onlyRole(MANDANT) {
        //empfangs doesnt exist allready
        require(
            mandanten[sender].ty == Authorizationtype.ALLGEMEIN,
            "Allgemeine Vollmacht fehlt!"
        );
        mandanten[sender].ty = Authorizationtype.BEIDES;
    }

    //Widerruf allgemeiner Vollmacht
    function cancelAllg(address sender) public onlyRole(MANDANT) {
        //require dass eine vorliegt
        require(
            mandanten[sender].ty == Authorizationtype.ALLGEMEIN,
            "Keine Allgemeine Vollmacht vorhanden!"
        );
        mandanten[sender].ty = Authorizationtype.KEINE;
    }

    // //Widerruf empfangs Vollmacht
    function cancelEmpf(address sender) public onlyRole(MANDANT) {
        //require dass eine vorliegt
        require(
            mandanten[sender].ty == Authorizationtype.BEIDES,
            "Keine Empfangsvollmacht vorhanden!"
        );
        mandanten[sender].ty = Authorizationtype.ALLGEMEIN;
    }
}
