const express = require('express')
const router = express.Router()
const middleWare = require('../../middleware/LocalStoreAccess')
const DailyMoney = require('../../models/DailyMoney');
const moment = require('moment');


router.use(middleWare)

router.get('/dashboard', async (req, res) => {
    try {
        const dailyMoney = await DailyMoney.find({ isCashier: true }).sort({ sortDate: -1 })
        res.render('localstore/dailymoney/dashboard', {
            user: req.user,
            dailyMoney,
            err: req.flash('daily-err'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.post('/new', async (req, res) => {
    try {
        const currentDate = moment().locale("ar-kw").format("l")
        const filter = await DailyMoney.findOne({ Date: currentDate, isCashier: true })
        if (filter) {
            req.flash('daily-err', 'File already exist')
            res.redirect('/localstore/dailymoney/dashboard')
        } else {
            new DailyMoney({
                Date: currentDate,
                isCashier: true
            }).save()

            res.redirect('/localstore/dailymoney/pending')
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/pending', async (req, res) => {
    try {
        res.render('localstore/dailymoney/pending', {
            user: req.user
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/get/:id', async (req, res) => {
    try {
        const data = await DailyMoney.findOne({ _id: req.params.id })
        var total = 0;
        if (data.purchase.length > 0) {
            total = data.purchase.map((x) => x.cost).reduce((a, b) => Number(a) + Number(b))
        }
        res.render('localstore/dailymoney/get-data', {
            user: req.user,
            data,
            total
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/add/:id', async (req, res) => {
    try {
        const { title, cost } = req.body
        const data = await DailyMoney.findOne({ _id: req.params.id })
        await DailyMoney.updateOne({ _id: req.params.id }, {
            $push: {
                purchase: {
                    title,
                    cost,
                }
            },

            $set: {
                total: Number(data.total) + Number(cost)
            }
        })

        res.redirect(`/localstore/dailymoney/get/${data.id}`)
    } catch (err) {
        console.log(err);
    }
})

router.put('/remove/:Eid/:title/:cost', async (req, res) => {
    try {
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

        res.redirect(`/localstore/dailymoney/get/${data.id}`)
    } catch (err) {
        console.log(err);
    }
})

module.exports = router