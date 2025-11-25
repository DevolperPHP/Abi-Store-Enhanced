const path = window.location.pathname
const home = document.getElementById('home')
const categories = document.getElementById('categories')
const brands = document.getElementById('brands')
const fav = document.getElementById('fav')
const cart = document.getElementById('cart')

if(path.includes("/home")){
    home.style.borderStyle = "solid"
    home.style.borderTop = "none"
    home.style.borderLeft = "none"
    home.style.borderRight = "none"
    home.style.borderColor = "#665CC4"
    home.style.transform = "scale(1.1)"
    home.style.color = "#fff"
}

if(path.includes("/categories")){
    categories.style.borderStyle = "solid"
    categories.style.borderTop = "none"
    categories.style.borderLeft = "none"
    categories.style.borderRight = "none"
    categories.style.borderColor = "#665CC4"
    categories.style.transform = "scale(1.1)"
    categories.style.color = "#fff"
}

if(path.includes("/brands")){
    brands.style.borderStyle = "solid"
    brands.style.borderTop = "none"
    brands.style.borderLeft = "none"
    brands.style.borderRight = "none"
    brands.style.borderColor = "#665CC4"
    brands.style.transform = "scale(1.1)"
    brands.style.color = "#fff"
}

if(path.includes("/fav")){
    fav.style.borderStyle = "solid"
    fav.style.borderTop = "none"
    fav.style.borderLeft = "none"
    fav.style.borderRight = "none"
    fav.style.borderColor = "#665CC4"
    fav.style.transform = "scale(1.1)"
    fav.style.color = "#fff"
}

if(path.includes("/cart")){
    cart.style.borderStyle = "solid"
    cart.style.borderTop = "none"
    cart.style.borderLeft = "none"
    cart.style.borderRight = "none"
    cart.style.borderColor = "#665CC4"
    cart.style.transform = "scale(1.1)"
    cart.style.color = "#fff"
}