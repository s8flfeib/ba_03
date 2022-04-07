//selecting all required elements

const dropArea = document.querySelector(".drag-area");

let file; //this is a global variable and we'll use it inside multiple functions

// If user Drag File Over DragArea
dropArea.addEventListener("dragover", (event) => {
    event.preventDefault(); //prevents default
    dropArea.classList.add("active");
});

// If user leave dragged File from DragArea
dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("active");
});

// If user drop dragged File on DragArea
dropArea.addEventListener("drop", (event) => {
    event.preventDefault(); //prevents default
    //getting user select file and [0] this means if user selects multiple file then we'll select only the first one
    file = event.dataTransfer.files[0];
    let fileType = file.type;
    console.log(file)

    //Valid file options
    let validExtensions = ["application/pdf"];
    if (validExtensions.includes(fileType)) {
        let fileReader = new FileReader();
        //creat new Filereader object
        fileReader.onload = () => {
            let fileURL = fileReader.result; //passing user file source in fileURL variable
            console.log(fileURL)
            let fileName = file.name
            dropArea.innerHTML = fileName

            postData("/upload-file", fileURL);




        }
        fileReader.readAsDataURL(file);
    } else {
        alert("Nur PDFs erlaubt")
        dropArea.classList.remove("active");
    }
});


async function postData(url, data) {
    console.log("Send Data")
    console.log(url + " : " + data)
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return response.json();
}