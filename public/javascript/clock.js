
function updateClock() {
    var clock = document.getElementById("clock");
    var now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    var seconds = now.getSeconds();
    var ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    var time = hours + ":" + minutes + ":" + seconds + " " + ampm;

    var day = now.getDate();
    var month = now.getMonth() + 1; // Month index starts from 0
    var year = now.getFullYear();

    var date = day + "/" + month + "/" + year;

    clock.textContent = time + " " + date;
}

// Update the clock every second
setInterval(updateClock, 500);
