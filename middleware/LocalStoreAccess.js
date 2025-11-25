const User = require('../models/User');

const isLoggedIn = async (req, res, next) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id})

        if(user.isAdmin == true || user.permissions.includes("Cashier")){
            req.user = user
            next()
        } else {
            req.flash('login-err', 'err')
            res.redirect("back")
        }
    } catch (err) {
        console.log(err);
    }
}

module.exports = isLoggedIn