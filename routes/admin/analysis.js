const express = require('express')
const User = require('../../models/User')
const Sell = require('../../models/Sell')
const Purchase = require('../../models/Purchase')
const DailyMoney = require('../../models/DailyMoney')
const router = express.Router()

router.get('/', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            res.render("analysis/dashboard", {
                user: user
            })
        } else {
            req.flash("permission-error", "error")
            res.redirect("/")
        }
    } catch (err) {
        console.log(err);
    }
})

function parseDate(dateStr) {
    const parts = dateStr.split('-'); // expecting yyyy-mm-dd
    return new Date(`${parts[2]}/${parts[1]}/${parts[0]}`);
}

router.get('/get/:start/:end', async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findById(id);

        const startDate = new Date(req.params.start.replaceAll('-', '/'));
        const endDate = new Date(req.params.end.replaceAll('-', '/'));

        // Filtered Sales (only "done")
        const sells = await Sell.find({
            status: 'done'
        }).lean();

        const filteredSells = sells.filter(sell => {
            const [day, month, year] = sell.Date?.split('/') || [];
            const date = new Date(`${year}/${month}/${day}`);
            return date >= startDate && date <= endDate;
        });

        // Filtered Purchases
        const allPurchases = await Purchase.find().lean();
        const filteredPurchases = allPurchases.filter(p => {
            const [day, month, year] = p.Date?.split('/') || [];
            const date = new Date(`${year}/${month}/${day}`);
            return date >= startDate && date <= endDate;
        });

        // Filtered DailyMoney
        const allDailyMoney = await DailyMoney.find().lean();
        const filteredDailyMoney = allDailyMoney.filter(d => {
            const [day, month, year] = d.Date?.split('/') || [];
            const date = new Date(`${year}/${month}/${day}`);
            return date >= startDate && date <= endDate;
        });

        // Totals
        const sellTotal = filteredSells.reduce((acc, s) => {
            const sum = s.products?.reduce((pAcc, p) => pAcc + (p.total || 0), 0) || 0;
            return acc + sum;
        }, 0);

        const purchaseTotal = filteredPurchases.reduce((acc, p) => {
            const purchaseSum = p.purchase?.reduce((s, item) => s + (item.total || 0), 0) || 0;
            return acc + purchaseSum + (p.cost || 0);
        }, 0);

        const dailyMoneyTotal = filteredDailyMoney.reduce((acc, d) => acc + (d.total || 0), 0);

        if (user?.isAdmin) {
            res.render("analysis/result", {
                user,
                sell: filteredSells,
                purchases: filteredPurchases,
                purchaseTotal,
                sellTotal,
                dailyMoneyTotal,
                dailyMoney: filteredDailyMoney,
                start: req.params.start,
                end: req.params.end
            });
        } else {
            req.flash("permission-error", "You do not have permission to view this page.");
            res.redirect("/");
        }
    } catch (err) {
        console.error("Error in analysis route:", err);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router