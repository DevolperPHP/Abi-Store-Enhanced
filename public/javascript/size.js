var inputs = document.getElementById("size-input")
var hideBtn = document.getElementById("hide")
var showBtn = document.getElementById("show")

function show(){
    inputs.style.display = "contents";
    hideBtn.style.display = "block";
    showBtn.style.display = "none"
}

function hide(){
    inputs.style.display = "none";
    hideBtn.style.display = "none";
    showBtn.style.display = "block"
}