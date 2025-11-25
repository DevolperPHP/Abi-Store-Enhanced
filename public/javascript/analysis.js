function search() {
    var startDate = document.getElementById("startDate");
    var endDate = document.getElementById("endDate");

    if(startDate.value == "" || endDate.value == ""){
        Swal.fire({
            icon: 'error',
            title: 'Missed info',
            text: 'You did not enter the date'
        })
    } else {
        window.location.href = `/analysis/get/${startDate.value}/${endDate.value}`;
    }
}