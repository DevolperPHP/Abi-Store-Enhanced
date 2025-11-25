const express = require('express')
const router = express.Router()
const User = require('../../models/User')
const Product = require('../../models/Product')
const Sell = require('../../models/Sell')

router.get("/", async (req, res) => {
    const id = req.cookies.id
    const user = await User.findOne({ _id: id })

    const count = await Product.countDocuments();
    const randomIndex = Math.floor(Math.random() * count)
    const product = await Product.findOne().skip(randomIndex)
    
    if (user && user.isAdmin == true) { 
        // Get recent orders
        const orders = await Sell.find({}).sort({ Date: -1 }).limit(4)
        
        // Get low stock products
        const products = await Product.find({}).sort({ qty: 1 }).limit(5)

        // Calculate total revenue from completed sales
        const completedSales = await Sell.find({ status: 'done' }).lean();
        const totalRevenue = completedSales.reduce((acc, sale) => {
            const saleTotal = sale.products?.reduce((pAcc, p) => pAcc + (parseFloat(p.total) || 0), 0) || 0;
            return acc + saleTotal;
        }, 0);

        // Calculate customer satisfaction from product ratings
        const allProducts = await Product.find({ score: { $exists: true, $ne: [] } }).lean();
        let totalRatings = 0;
        let totalReviews = 0;
        
        allProducts.forEach(prod => {
            prod.score.forEach(rating => {
                totalRatings += parseInt(rating.num) || 0;
                totalReviews += 1;
            });
        });
        
        const customerSatisfaction = totalReviews > 0 ? Math.round((totalRatings / (totalReviews * 5)) * 100) : 0;

        // Get system status (low stock count, recent activity, etc.)
        const lowStockCount = await Product.countDocuments({ qty: { $lt: 10 } });
        const recentOrdersToday = await Sell.countDocuments({ 
            Date: { $regex: new Date().toLocaleDateString('en-GB') }
        });

        if (product) {
            const score = product.score.map(x => parseInt(x.num)).slice(-10)
            const scoreDate = product.score.map(x => x.Date).slice(-10)

            res.render("index/index", {
                user: user,
                err: req.flash("permission-error"),
                product: product,
                score: score,
                scoreDate: scoreDate,
                sell: orders,
                products: products,
                totalRevenue: totalRevenue,
                customerSatisfaction: customerSatisfaction,
                lowStockCount: lowStockCount,
                recentOrdersToday: recentOrdersToday
            })
        } else {
            res.render("index/index", {
                user: user,
                err: req.flash("permission-error"),
                product: null,
                score: [],
                scoreDate: [],
                sell: orders,
                products: products,
                totalRevenue: totalRevenue,
                customerSatisfaction: customerSatisfaction,
                lowStockCount: lowStockCount,
                recentOrdersToday: recentOrdersToday
            })
        }
    } else {
        res.redirect("/passport/sign-up")
    }
})

module.exports = router