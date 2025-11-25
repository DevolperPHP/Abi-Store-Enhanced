const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id})

        if(user.isAdmin == true){
            req.user = user
            next()
        } else {
            req.flash('login-err', 'err')
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
}

module.exports = isAdmin