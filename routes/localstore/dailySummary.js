const express = require('express')
const router = express.Router()
const middleWare = require('../../middleware/LocalStoreAccess')
const Sell = require('../../models/Sell')
const DailyMoney = require('../../models/DailyMoney');
const Product = require('../../models/Product')
const moment = require('moment-timezone');

router.use(middleWare)

router.get('/', async (req, res) => {
    try {
        const selectedDate = req.query.date || moment().tz('Asia/Baghdad').format('YYYY-MM-DD');

        // Get orders for the selected date using sortDate
        // The sample data shows sortDate field with ISO timestamp
        const startOfDay = moment.tz(selectedDate, 'YYYY-MM-DD', 'Asia/Baghdad').startOf('day');
        const endOfDay = moment.tz(selectedDate, 'YYYY-MM-DD', 'Asia/Baghdad').endOf('day');

        const orders = await Sell.find({
            isCashier: true,
            sortDate: {
                $gte: startOfDay.toDate(),
                $lte: endOfDay.toDate()
            }
        }).sort({ sortDate: -1 });

        // Get daily money transactions for the selected date
        // DailyMoney stores date as: "12/14/2025"
        const formattedDate = moment(selectedDate).locale("ar-kw").format("l");

        const dailyTransactions = await DailyMoney.find({
            isCashier: true,
            Date: formattedDate
        }).sort({ createdAt: -1 });

        // Calculate totals
        const ordersTotal = orders.reduce((sum, order) => sum + Number(order.total), 0);
        const expensesTotal = dailyTransactions.reduce((sum, trans) => sum + Number(trans.total || 0), 0);
        const netProfit = ordersTotal - expensesTotal;

        // Get summary statistics
        const summaryStats = {
            totalOrders: orders.length,
            totalSales: ordersTotal,
            totalExpenses: expensesTotal,
            netProfit: netProfit,
            avgOrderValue: orders.length > 0 ? ordersTotal / orders.length : 0
        };

        // Get top selling products
        const productSales = {};
        orders.forEach(order => {
            order.products.forEach(product => {
                const key = product.name;
                if (!productSales[key]) {
                    productSales[key] = {
                        name: product.name,
                        qty: 0,
                        total: 0
                    };
                }
                productSales[key].qty += product.qty;
                productSales[key].total += product.total;
            });
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

        res.render('localstore/dailysummary/dailysummary', {
            user: req.user,
            selectedDate,
            orders,
            dailyTransactions,
            summaryStats,
            topProducts,
            err: req.flash('daily-err'),
        })
    } catch (err) {
        console.log(err);
        res.redirect('/localstore/sell');
    }
})

module.exports = router
