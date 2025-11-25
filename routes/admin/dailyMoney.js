const express = require('express');
const User = require('../../models/User');
const DailyMoney = require('../../models/DailyMoney');
const router = express.Router();
const moment = require('moment');

router.get('/', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const dailyMoney = await DailyMoney.find({}).sort({ sortDate: -1 })

        if (user) {
            if (user.isAdmin == true) {
                res.render('dailyMoney/dashboard', {
                    user: user,
                    dailyMoney: dailyMoney,
                    err: req.flash('daily-error'),
                })
            } else {
                req.flash('permission-error', 'error')
                res.redirect('/')
            }
        } else {
            res.redirect('/passport/sign-up')
        }
    } catch (err) {
        console.log(err);
    }
})

router.post('/new', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const currentDate = moment().locale("ar-kw").format("l")
            const filter = await DailyMoney.findOne({ Date: currentDate })
            if (filter) {
                req.flash('daily-error', 'error')
                res.redirect("back")
            } else {
                const newDailyMoney = [
                    new DailyMoney({
                        Date: currentDate,
                    })
                ]

                newDailyMoney.forEach((data) => {
                    data.save()
                })

                res.redirect("/dailymoney/pending")
            }
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/pending", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            res.render("dailymoney/pending", { user: user })
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/get/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await DailyMoney.findOne({ _id: req.params.id })
        const totalArray = data.purchase.map(x => Number(x.cost))
        if (totalArray.length > 0) {
            const total = totalArray.reduce((a, b) => a + b)
            if (user.isAdmin == true) {
                res.render("dailyMoney/get-data", {
                    user: user,
                    data: data,
                    total: total
                })
            } else {
                res.redirect("/")
            }
        } else {
            if (user.isAdmin == true) {
                res.render("dailyMoney/get-data", {
                    user: user,
                    data: data,
                    total: 0
                })
            } else {
                res.redirect("/")
            }
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/add/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const { title, cost } = req.body
            const data = await DailyMoney.findOne({ _id: req.params.id })
            await DailyMoney.updateOne({ _id: req.params.id }, {
                $push: {
                    purchase: {
                        title: title,
                        cost: cost,
                    }
                },

                $set: {
                    total: Number(data.total) + Number(cost)
                }
            })

            res.redirect("back")
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/remove/:Eid/:title/:cost', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const { Eid, title, cost } = req.params
            const data = await DailyMoney.findOne({ _id: Eid })

            await DailyMoney.updateOne({ _id: Eid }, {
                $pull: {
                    purchase: {
                        title: title,
                        cost: cost,
                    }
                },

                $set: {
                    total: Number(data.total) - Number(cost)
                }
            })

            res.redirect("back")
        } else {
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

module.exports = router