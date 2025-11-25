const path = window.location.pathname
var storage = document.getElementById("storage")
var mainStorage = document.getElementById("main-storage")
var sell = document.getElementById("sell")
var orders = document.getElementById("orders")
var dailyMoney = document.getElementById("dailyMoney")

if(path.includes("/storage")){
    storage.style.borderStyle = "solid"
    storage.style.borderTop = "none"
    storage.style.borderLeft = "none"
    storage.style.borderRight = "none"
    storage.style.width = "80%"
    storage.style.borderColor = "#ffdb57"
    storage.style.transform = "scale(1.1)"
    storage.style.color = "#000"
}

if(path.includes("/main-storage")){
    storage.style.borderStyle = "none"
    storage.style.borderTop = "none"
    storage.style.borderLeft = "none"
    storage.style.borderRight = "none"
    storage.style.width = "80%"
    storage.style.borderColor = "none"
    storage.style.transform = "scale(1)"
    storage.style.color = "#00000081"

    mainStorage.style.borderStyle = "solid"
    mainStorage.style.borderTop = "none"
    mainStorage.style.borderLeft = "none"
    mainStorage.style.borderRight = "none"
    mainStorage.style.width = "80%"
    mainStorage.style.borderColor = "#ffdb57"
    mainStorage.style.transform = "scale(1.1)"
    mainStorage.style.color = "#000"
}

if(path.includes("/sell")){
    sell.style.borderStyle = "solid"
    sell.style.borderTop = "none"
    sell.style.borderLeft = "none"
    sell.style.borderRight = "none"
    sell.style.width = "80%"
    sell.style.borderColor = "#ffdb57"
    sell.style.transform = "scale(1.1)"
    sell.style.color = "#000"
}

if(path.includes("/orders")){
    orders.style.borderStyle = "solid"
    orders.style.borderTop = "none"
    orders.style.borderLeft = "none"
    orders.style.borderRight = "none"
    orders.style.width = "80%"
    orders.style.borderColor = "#ffdb57"
    orders.style.transform = "scale(1.1)"
    orders.style.color = "#000"
}

if(path.includes("/dailymoney")){
    dailyMoney.style.borderStyle = "solid"
    dailyMoney.style.borderTop = "none"
    dailyMoney.style.borderLeft = "none"
    dailyMoney.style.borderRight = "none"
    dailyMoney.style.width = "80%"
    dailyMoney.style.borderColor = "#ffdb57"
    dailyMoney.style.transform = "scale(1.1)"
    dailyMoney.style.color = "#000"
}