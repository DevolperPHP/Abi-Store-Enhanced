var btn = document.getElementById("add")
var catForm = document.getElementById("cat-form")
var removeBtn = document.getElementById("remove")

function add() {
    catForm.style.display = 'contents'
    removeBtn.style.display = 'block'
    removeBtn.style.backgroundColor = '#d9534f'
    btn.style.display = 'none'
}

function remove() {
    catForm.style.display = 'none'
    removeBtn.style.display = 'none'
    btn.style.display = 'block'
}