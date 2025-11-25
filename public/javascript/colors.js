var inputs = document.getElementById("colors-input")
var showBtn = document.getElementById("show-btn")
var hideBtn = document.getElementById("hide-btn")
var tableText = document.getElementById("table-text")

function show(){
    inputs.style.display = "contents"
    showBtn.style.display = "none"
    hideBtn.style.display = "block"
    tableText.innerText = "Add"
    
}

function hide(){
    inputs.style.display = "none"
    showBtn.style.display = "block"
    hideBtn.style.display = "none"
    tableText.innerText = "Delete"
}