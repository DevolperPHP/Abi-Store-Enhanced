const express = require('express')
const router = express.Router()
const middleWare = require('../../middleware/LocalStoreAccess')
const Sell = require('../../models/Sell')
const Product = require('../../models/Product')
const mongoose = require('mongoose')

router.use(middleWare)

router.get('/', async (req, res) => {
    try {
        const orders = await Sell.aggregate([
            {
                $match: { isCashier: true }
            },
            {
                $addFields: {
                    dateObj: { $toDate: "$Date" }  // convert string to Date
                }
            },
            {
                $sort: { dateObj: -1 }  // newest first
            },
            {
                $limit: 150  // limit to 150 results
            }
        ]);

        res.render('localstore/orders/orders', {
            user: req.user,
            orders: orders,
            err: req.flash('err'),
        });
    } catch (err) {
        console.log(err);
    }
});




router.get('/get-data/:id', async (req, res) => {
    try {
        const data = await Sell.findOne({ _id: req.params.id })
        if (data.products.length == 0) {
            await Sell.deleteOne({ _id: data.id })
            res.redirect('/localstore/orders')
        }

        var totalQty
        if (data.products.length > 0) {
            totalQty = data.products.map((x) => x.qty).reduce((a, b) => Number(a) + Number(b))
        } else {
            totalQty = 0
        }

        res.render('localstore/orders/order', {
            user: req.user,
            data,
            totalQty,
            err: req.flash('err'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/getbyid/:id', async (req, res) => {
    try {
        const data = await Sell.findOne({ bid: req.params.id })
        if (!data) {
            req.flash('err', 'Order not found')
            res.redirect('/localstore/orders')
        }
        if (data.products.length == 0) {
            await Sell.deleteOne({ _id: data.id })
            res.redirect('/localstore/orders')
        }

        var totalQty
        if (data.products.length > 0) {
            totalQty = data.products.map((x) => x.qty).reduce((a, b) => Number(a) + Number(b))
        } else {
            totalQty = 0
        }

        res.render('localstore/orders/order', {
            user: req.user,
            data,
            totalQty,
            err: req.flash('err'),
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const data = await Sell.findOne({ _id: req.params.id })
        var totalQty
        if (data.products.length > 0) {
            totalQty = data.products.map((x) => x.qty).reduce((a, b) => Number(a) + Number(b))
        } else {
            totalQty = 0
        }
        res.render('localstore/orders/edit-order', {
            user: req.user,
            data,
            totalQty,
        })
    } catch (err) {
        console.log(err);

    }
})

router.get('/return/:orderId/:itemId', async (req, res) => {
    try {
        const { orderId, itemId } = req.params
        res.render('localstore/orders/return', {
            user: req.user,
            orderId,
            itemId,
        })
    } catch (err) {
        console.log(err);

    }
})

router.put('/return/:orderId/:itemId', async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const itemObjectId = new mongoose.Types.ObjectId(itemId);
        const qtyValue = Number(req.body.qty);

        if (isNaN(qtyValue) || qtyValue <= 0) {
            return res.status(400).send("Invalid quantity");
        }

        // Fetch order and product
        const order = await Sell.findOne({ _id: orderId });
        if (!order) return res.status(404).send("Order not found");

        const product = await Product.findOne({ _id: itemObjectId });
        if (!product) return res.status(404).send("Product not found");

        // Find the product in the order
        const orderItem = order.products.find(p => p._id.toString() === itemId);
        if (!orderItem) return res.status(404).send("Item not found in order");

        const oldQty = orderItem.qty;
        const newQty = oldQty - qtyValue;

        if (newQty < 0) return res.status(400).send("Return quantity exceeds sold quantity");

        // Update or remove product in order
        if (newQty === 0) {
            await Sell.updateOne(
                { _id: orderId },
                { $pull: { products: { _id: itemObjectId } } }
            );
        } else {
            const newTotal = newQty * product.sell_price;

            await Sell.updateOne(
                { _id: orderId, 'products._id': itemObjectId },
                {
                    $set: {
                        'products.$.qty': newQty,
                        'products.$.total': newTotal
                    }
                }
            );
        }

        // Update product stock
        product.stock += qtyValue;
        await product.save();

        // Recalculate order total
        const updatedOrder = await Sell.findOne({ _id: orderId });
        const orderTotal = updatedOrder.products.reduce((sum, p) => sum + p.total, 0);

        await Sell.updateOne(
            { _id: orderId },
            { $set: { total: orderTotal } }  // Assuming order has a 'total' field
        );

        if (updatedOrder.products.length > 0) {
            res.redirect(`/localstore/orders/get-data/${orderId}`);
        } else {
            await Sell.deleteOne({ _id: orderId })
            res.redirect('/localstore/orders')
        }
    } catch (err) {
        console.error("Error in return route:", err);
        res.status(500).send("Internal server error");
    }
});
module.exports = router