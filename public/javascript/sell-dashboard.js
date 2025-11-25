var startDate = document.getElementById("startDate");
var endDate = document.getElementById("endDate");
var phone = document.getElementById("phone");

function searchByDate(){
    if(startDate.value == ""){
        Swal.fire({
            icon: 'error',
            title: 'Start date required',
            text: 'You did not enter a start date'
        })
    } else if(endDate.value == ""){
        Swal.fire({
            icon: 'error',
            title: 'End date required',
            text: 'You did not enter a end date'
        })
    } else {
        window.location.href = `/sell/search-by-date/${startDate.value}/${endDate.value}`
    }
}

function searchByPhone(){
    if(phone.value == ""){
        Swal.fire({
            icon: 'error',
            title: 'Missed phone number',
            text: 'You did not enter a phone number'
        })
    } else {
        window.location.href = `/sell/search-by-phone/${phone.value}`
    }
}

function redirectToPage(selectElement) {
    const selectedOption = selectElement.value;
    if (selectedOption) {
      window.location.href = selectedOption;
    }
  }