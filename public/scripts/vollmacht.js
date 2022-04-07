async function sicherheitsabfrage(obj, abc) {
    const clear = document.getElementById("div_error");
    const v = document.getElementById('vollmacht');
    const s = document.getElementById('status')
    v.innerHTML = '';
    clear.innerHTML = '';
    s.innerHTML = '';
    var h3_e = document.createElement('h3');
    h3_e.innerHTML = "Vollmächte: "
    var h4_e = document.createElement('h4');
    var h3_s = document.createElement('h3');
    h3_s.innerHTML = "Status: "
    var h4_s = document.createElement('h4');

    //abc = className
    const voll = {
        todo: Number
    };
    switch (abc) {
        case "setAllg":
            console.log("setAllg")
            let conf = confirm("Sind Sie sicher, dass Sie eine allgemeine Vollmacht ausstellen wollen?");
            if (conf) {
                //send vollmacht request to server
                voll.todo = 1;
                console.log("Send the Vollmacht request to the server")
                let result = await sendVoll(voll);
                console.log(result)
                const state = result.state
                const return_status = result.out.status
                h4_s.innerHTML = state
                //console.log("No result ??")
                if (return_status != "Failed") {
                    h4_e.innerHTML = "Es liegt eine allgemeine Vollmacht vor!"
                    v.append(h3_e);
                    v.append(h4_e);
                    s.append(h3_s);
                    s.append(h4_s);
                    alert("Ihre Vollmacht wurde ausgestellt!")
                }
                else {
                    const err = result.out.error
                    v.append(h3_e);
                    s.append(h3_s);
                    let e = err.split(":")[2]
                    displayerror(e)
                    alert(e)
                }

            }
            break;
        case "setEmpf":
            let conf1 = confirm("Sind Sie sicher, dass Sie eine Empfangsvollmacht ausstellen wollen?");
            if (conf1) {
                //send vollmacht request to server
                voll.todo = 2;
                let result = await sendVoll(voll)
                const state = result.state
                const return_status = result.out.status
                h4_s.innerHTML = state
                console.log(result)
                if (return_status != "Failed") {
                    h4_e.innerHTML = "Es liegt eine Empfangsvollmacht vor!"
                    v.append(h3_e);
                    v.append(h4_e);
                    s.append(h3_s);
                    s.append(h4_s);
                    alert("Ihre Empfangsvollmacht wurde ausgestellt!")
                }
                else {
                    const err = result.out.error
                    v.append(h3_e);
                    s.append(h3_s);
                    let e = err.split(":")[2]
                    displayerror(e)
                    alert(e)
                }
            }
            break;
        case "cancelAllg":
            let conf2 = confirm("Sind Sie sicher, dass Sie ihre allgemeine Vollmacht widerrufen wollen?");
            if (conf2) {
                //send vollmacht request to server
                voll.todo = 3;
                let result = await sendVoll(voll)
                const state = result.state
                const return_status = result.out.status
                h4_s.innerHTML = state
                console.log(return_status)
                if (return_status != "Failed") {
                    h4_e.innerHTML = "Es liegt keine Vollmacht vor!"
                    v.append(h3_e);
                    v.append(h4_e);
                    s.append(h3_s);
                    s.append(h4_s);
                    alert("Ihre Vollmacht wurde widerrufen!")
                }
                else {
                    const err = result.out.error
                    v.append(h3_e);
                    s.append(h3_s);
                    let e = err.split(":")[2]
                    displayerror(e)
                    alert(e)
                }
            }
            break;
        case "cancelEmpf":
            let conf3 = confirm("Sind Sie sicher, dass Sie ihre Empfangsvollmacht widerrufen wollen?");
            if (conf3) {
                //send vollmacht request to server
                voll.todo = 4;
                let result = await sendVoll(voll)
                const state = result.state
                const return_status = result.out.status
                h4_s.innerHTML = state
                if (return_status != "Failed") {
                    h4_e.innerHTML = "Es liegt eine allgemeine Vollmacht vor!"
                    v.append(h3_e);
                    v.append(h4_e);
                    s.append(h3_s);
                    s.append(h4_s);
                    alert("Ihre Empfangsvollmacht wurde widerrufen!")
                }
                else {
                    const err = result.out.error
                    v.append(h3_e);
                    s.append(h3_s);
                    let e = err.split(":")[2]
                    displayerror(e)
                    alert(e)
                }
            }
            break;
    }
}

async function sendVoll(voll) {
    const response = await fetch('/vollmacht', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(voll),
    })
    //console.log(response)
    const json = await response.json();
    console.log(json)
    if (json.out.status != "Failed") {
        return json;
    } else {
        console.log("Request failed!")
        return json;
    }

    //Selbe wie oben
    // fetch('/vollmacht', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(voll),
    // })
    //     .then(response => {
    //         response.json().then(data => {
    //             console.log(data.output)
    //         })
    //     })
}

function displayerror(e) {
    const para = document.createElement("p");
    const node = document.createTextNode(e);
    para.appendChild(node);
    const element = document.getElementById("div_error");
    element.appendChild(para)

}
