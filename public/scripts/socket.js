var socket = io.connect('http://localhost:2000');

socket.on('chat message received', async function (infos) {
    console.log("Handel infos received from server")
    console.log(infos)

    const role = infos.client.role;
    console.log(role);

    switch (role) {
        case "M":
            console.log("M")
            displaySteuerberater(infos.mandanten_steuerberater);
            break;
        case "S":
            console.log("S")
            console.log(infos.mandanten_steuerberater)
            displayMandanten(infos.mandanten_steuerberater)
            break;
        case "F":
            console.log("F")
            finanzamt(infos)
            displayMandanten(infos.mandanten_steuerberater)
            break;
    }

});

socket.on('send informations from F', async function (infos) {
    console.log("WE are receiving the infos")
    console.log(infos)
    const md = infos.md;
    const messages = infos.rows;
    const files = infos.file
    //Number 0,1 oder 2 für Keine, Allg, Empf
    const vollmacht = infos.voll.vollmacht;
    //Status as it is 
    const status = infos.state.state;
    console.log(vollmacht + " : " + status)
    displayVollmacht(vollmacht);
    displayStatus(status);
    displayMandanten(md);
    displayMessages(messages, infos.user.did);
    displayDocuments(files);
    var name = document.getElementById('M-Name1');
    var name1 = document.getElementById('M-Name2');
    name.innerHTML = '';
    name1.innerHTML = '';
    var h = document.createElement('h2');
    var h1 = document.createElement('h2');
    h.innerHTML = infos.client.name;
    h1.innerHTML = infos.client.name;
    name.appendChild(h);
    name1.appendChild(h1);
    displayNextStep(infos.next_step)
});

socket.on('send informations from SB', async function (infos) {
    console.log("WE are receiving the infos")
    console.log(infos)
    const md = infos.md;
    const messages = infos.rows;
    const files = infos.file
    //Number 0,1 oder 2 für Keine, Allg, Empf
    const vollmacht = infos.voll.vollmacht;
    //Status as it is 
    const status = infos.state.state;
    displayVollmacht(vollmacht);
    displayStatus(status);
    console.log(md)
    displayMandanten(md);
    displayMessages(messages, infos.user.did);
    displayDocuments(files);
    var name = document.getElementById('M-Name1');
    var name1 = document.getElementById('M-Name2');
    name.innerHTML = '';
    name1.innerHTML = '';
    var h = document.createElement('h2');
    var h1 = document.createElement('h2');
    h.innerHTML = infos.client.name;
    h1.innerHTML = infos.client.name;
    name.appendChild(h);
    name1.appendChild(h1);
    displayNextStep(infos.next_step)
});

socket.on('display infos without selected sb', async function (infos) {
    console.log("Display Infos now!")
    console.log(infos)
    displayMessages(infos.rows, infos.user.did)
    displayDocuments(infos.file)
    displayStatus(infos.state.state)
});

socket.on('send alert', async function (infos) {
    console.log("Handel infos received from server")
    console.log(infos)

    alert(infos)
});

socket.on('display mandant', async function (infos) {
    console.log("Now display everything")
    console.log(infos)
    displayCurrentSb(infos.sb[0].current_sb);
    displaySteuerberater(infos.mandanten_steuerberater);
    displayMessages(infos.rows, infos.user.did)
    displayDocuments(infos.file)
    displayStatus(infos.state.state);
    displayVollmacht(infos.voll.vollmacht)
    displayNextStep(infos.next_step)
})


function finanzamt(informations) {
    console.log("F-Funktion")
    console.log(informations)
}



function displayMandanten(mandanten) {
    console.log("display Mandanten 3 times")
    var m = document.getElementById('md');
    var m2 = document.getElementById('md2');
    var m3 = document.getElementById('md3');
    m.innerHTML = '';
    m2.innerHTML = '';
    m3.innerHTML = '';

    for (var i in mandanten) {
        console.log(mandanten[i].name)
        var opt = document.createElement('option');
        opt.value = mandanten[i].name;
        opt.innerHTML = mandanten[i].name;
        var opt2 = document.createElement('option');
        opt2.value = mandanten[i].name;
        opt2.innerHTML = mandanten[i].name;
        var opt3 = document.createElement('option');
        opt3.value = mandanten[i].name;
        opt3.innerHTML = mandanten[i].name;
        m.appendChild(opt);
        m2.appendChild(opt2);
        m3.appendChild(opt3);
    }
}

function displayMessages(messages, client) {
    var chat = document.getElementById("chat")
    chat.innerHTML = "";
    const org_0 = { id: "did:firefly:org/org_0", name: "Finanzamt" };
    const org_1 = { id: "did:firefly:org/org_1", name: "Steuerberater" };
    const org_2 = { id: "did:firefly:org/org_2", name: "Mandant" };
    for (var i = messages.length - 1; i >= 0; i--) {
        //Suche die Zeit der Nachricht
        var date = messages[i].message.header.created
        var time = date.split("T")[1].split(".")[0].slice(0, -3)
        //Nehme den tatsächlichen Wert der Nachricht
        var value = messages[i].data[0].value
        //Suche den Absender der Nachricht
        var sender_did = messages[i].message.header.author;
        var sender = messages[i].message.header.author.split("/")[1]
        //Erzeuge für jede Nachricht ein neues div element
        var message = document.createElement('div')
        //Jump to next message if message is not a chat message
        var message_tag = messages[i].message.header.tag;
        if (message_tag != "chat_message") {
            continue;
        }
        //Name des senders herausfinden
        var name = ""
        if (sender_did == org_0.id) {
            name = org_0.name;
        } else if (sender_did == org_1.id) {
            name = org_1.name;
        } else {
            name = org_2.name;
        }


        if (sender_did == client) {
            message.textContent = time + " " + value;
            message.className = "my-chat"
            chat.appendChild(message);
        } else {
            message.textContent = time + " " + name + "\n" + value;
            message.className = "client-chat"
            chat.appendChild(message);
        }
    }
}

function displayDocuments(pdfs) {
    var count = 0;
    var file_element = document.getElementById("display_files");
    for (var i of pdfs) {
        var pdf = new Blob(i, { type: 'application/pdf' });
        var url = URL.createObjectURL(pdf);
        var a = document.createElement('a');
        //FIND OUT NAME OF THE PDF
        var linkText = document.createTextNode("File_0" + count);
        count += 1;
        a.appendChild(linkText);
        // a.target = "_blank";
        // a.title = "title";
        // a.download = "newFilename";
        a.title = "title";
        a.href = url;
        file_element.appendChild(a);
    }
}

function displayVollmacht(vollmacht) {
    var voll = document.getElementById('vollmacht');
    var label = document.createElement('h2');
    var current_vollmacht = document.createElement('h4');
    label.innerHTML = "Vollmächte: ";
    switch (vollmacht) {
        case "KEINE":
            current_vollmacht.innerHTML = "Es liegen keine Vollmächte vor!";
            break;
        case "ALLGEMEIN":
            current_vollmacht.innerHTML = "Es liegt eine allgemeine Vollmacht vor!";
            break;
        case "BEIDES":
            current_vollmacht.innerHTML = "Es liegen eine Empfangsvollmacht vor!";
            break;

    }
    voll.innerHTML = '';
    voll.appendChild(label);
    voll.appendChild(current_vollmacht);
}

function displayStatus(status) {
    var stat = document.getElementById('status');
    var label = document.createElement('h2');
    var current_status = document.createElement('h2');
    label.innerHTML = "Status: ";
    current_status.innerHTML = status;
    stat.innerHTML = '';
    stat.appendChild(label);
    stat.appendChild(current_status);
}

function displaySteuerberater(steuerberater) {
    var sb = document.getElementById('sb');
    sb.innerHTML = '';

    for (i in steuerberater) {
        var opt = document.createElement('option')
        opt.value = steuerberater[i].name;
        opt.innerHTML = steuerberater[i].name;
        sb.appendChild(opt);
    }
}

function displayCurrentSb(sb) {
    var sb1 = document.getElementById('h_sb');
    var sb2 = document.getElementById('h_sb2');
    sb1.innerHTML = '';
    sb2.innerHTML = '';
    var c_sb1 = document.createElement('h2');
    var c_sb2 = document.createElement('h2');
    c_sb1.innerHTML = sb;
    c_sb2.innerHTML = sb;
    c_sb1.value = sb;
    c_sb2.value = sb;
    sb1.appendChild(c_sb1);
    sb2.appendChild(c_sb2);
}

function displayNextStep(next_step) {
    console.log(next_step)
    var next = document.getElementById('next_step');
    next.innerHTML = '';
    var n = document.createElement('p');
    n.innerHTML = next_step;
    n.value = next_step;
    next.appendChild(n);
}