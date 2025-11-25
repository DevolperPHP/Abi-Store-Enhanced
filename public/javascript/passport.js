var circle = document.getElementById("circle")
var sign_up = document.getElementById("sign-up")
var sign_in_panel = document.getElementById("sign-in-panel")

function sign_in() {
    circle.style.transform = "scale(12.5)"
    circle.style.zIndex = "10"
    setTimeout(() => {
        sign_up.style.display = "none"
        circle.style.transform = "scale(1)"
        circle.style.zIndex = "10"
        sign_in_panel.style.display = "block"

    }, 1000)
}

function sign_up_panel(){
    circle.style.transform = "scale(12.5)"
    circle.style.zIndex = "10"
    setTimeout(() => {
        sign_in_panel.style.display = "none"
        circle.style.transform = "scale(1)"
        circle.style.zIndex = "10"
        sign_up.style.setProperty("display", "block", "important");

    }, 1000)
}

document.addEventListener('touchmove', function(event) {
    event.preventDefault();
  }, { passive: false });