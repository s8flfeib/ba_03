// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Vollmacht {

    mapping(address => Authorization) authorizations;
    
    enum Authorizationtype{
        KEINE,ALLGEMEIN,BEIDES
    }


    struct Authorization {
        Authorizationtype ty;
    }

    // constructor() {
    // }

    ///Getter
    function getVollmacht(address addr) public view returns (Authorizationtype) {
        return authorizations[addr].ty;
    }

    //Allgemeine Vollmacht
    function setAllg() public {
        authorizations[msg.sender].ty = Authorizationtype.ALLGEMEIN;
    }

    //Empfangsvollmacht
    function createEmpf() public {
        require(authorizations[msg.sender].ty == Authorizationtype.ALLGEMEIN, "Allgemeine Vollmacht fehlt!");
        authorizations[msg.sender].ty = Authorizationtype.BEIDES;
    }

    //Widerruf allgemeiner Vollmacht
    function cancelAllg() public {
        require(authorizations[msg.sender].ty == Authorizationtype.ALLGEMEIN, "Es liegt keine allgemaine Vollmacht vor");
        authorizations[msg.sender].ty = Authorizationtype.KEINE;
        
    }



    // //Widerruf empfangs Vollmacht
    // function cancelEmpf() public {
        
    // }

}