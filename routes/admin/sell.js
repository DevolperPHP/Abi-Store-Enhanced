const express = require('express');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Sell = require('../../models/Sell');
const moment = require('moment');
const router = express.Router()
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
    try {
      const id = req.cookies.id;
      const user = await User.findById(id);
  
      if (!user) return res.redirect('/passport/sign-up');
  
      const hasPermission = user.isAdmin || user.permissions.includes('Sell');
      if (!hasPermission) return res.status(403).send("Access Denied");
  
      const page = 1;
      const limit = 15;
      const skip = (page - 1) * limit;
  
      // Get paginated sales with parsed date
      const sell = await Sell.aggregate([
        {
          $addFields: {
            parsedDate: {
              $dateFromString: {
                dateString: "$Date",
                format: "%d/%m/%Y",
                onError: null,
                onNull: null
              }
            }
          }
        },
        {
          $match: {
            parsedDate: { $ne: null }
          }
        },
        {
          $sort: { parsedDate: -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        }
      ]);
  
      // For autocomplete: just get distinct names
      const uniqueSellNames = await Sell.distinct('name');
      
      res.render("sell/dashboard", {
        user: user,
        sell: sell,
        data: uniqueSellNames
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  router.get('/api', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 15;
      const skip = (page - 1) * limit;
  
      const sell = await Sell.aggregate([
        {
          $addFields: {
            parsedDate: {
              $dateFromString: {
                dateString: "$Date",
                format: "%d/%m/%Y",
                onError: null,
                onNull: null
              }
            }
          }
        },
        {
          $match: {
            parsedDate: { $ne: null }
          }
        },
        { $sort: { parsedDate: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]);
  
      res.json(sell);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server Error" });
    }
  });
  
  

router.get('/new', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]

        const cartItems = user.cart;
        const ids = cartItems.map((item) => mongoose.Types.ObjectId(item.id));
        const CartProducts = await Product.find({ _id: { $in: ids } });

        const productsWithQty = CartProducts.map(product => {
            const cartItem = cartItems.find(item => item.id === product._id.toString());
            return {
                ...product.toObject(),
                qty: cartItem ? cartItem.qty : 0,
                total: (cartItem ? cartItem.qty : 0) * product.sell_price

            };
        });

        var total, totalQty
        if (productsWithQty.length > 0) {
            total = productsWithQty.map((x) => x.total).reduce((a, b) => a + b)
            totalQty = productsWithQty.map((x) => x.qty).reduce((a, b) => Number(a) + Number(b))
        } else {
            total = 0
            totalQty = 0
        }

        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render("sell/new", {
                    user: user,
                    products: productsWithQty,
                    data: uniqueArray,
                    err: req.flash('cart-filter-error'),
                    qty_err: req.flash('qty-error'),
                    total: total,
                    search_err: req.flash('not-found-error'),
                    stock_err: req.flash('stock-err'),
                    totalQty
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/get/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })
        const products = await Product.find({ _id: req.params.id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render("sell/get-item", {
                    user: user,
                    data: data,
                    products: products
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect('/passport/sign-up')
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/add-by-code/:code', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ barcode: req.params.code })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                if (data) {
                    const filter = user.cart.find((item) => item.id === data.id)
                    if (filter) {
                        const oldQty = filter.qty
                        await User.updateOne({ _id: id, 'cart.id': data.id }, {
                            $set: {
                                'cart.$.qty': Number(oldQty) + 1
                            }
                        })

                    } else {
                        if (data.qty > 0) {
                            await User.updateOne({ _id: id }, {
                                $push: {
                                    cart: {
                                        id: data.id,
                                        qty: 1
                                    }
                                }
                            })
                        }
                    }
                } else {
                    req.flash('not-found-error', 'error')
                }

                res.redirect('/sell/new')
            }
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit-qty/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user.isAdmin == true || user.permissions.includes('Sell')) {
            res.render('sell/edit-qty', {
                user: user,
                data: data
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit-qty/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })

        if (user.isAdmin == true || user.permissions.includes('Sell')) {
            const qty = Number(req.body.qty)
            const getItem = user.cart.find(item => item.id === req.params.id)
            const oldQty = getItem.qty
            if (qty > oldQty) {
                if (data.qty + oldQty >= qty) {
                    await User.updateOne({ _id: id, 'cart.id': req.params.id }, {
                        $set: {
                            'cart.$.qty': qty,
                            'cart.$.total': data.sell_price * qty
                        }
                    })
                } else {
                    req.flash('stock-err', 'err')
                }
            } else if (qty < oldQty) {
                const confusing = oldQty - qty
                if (data.qty + oldQty >= qty) {
                    await User.updateOne({ _id: id, 'cart.id': req.params.id }, {
                        $set: {
                            'cart.$.qty': qty,
                            'cart.$.total': data.sell_price * qty
                        }
                    })
                } else {
                    req.flash('stock-err', 'err')

                }
            }

            res.redirect('/sell/new')
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/plus/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const data = await Product.findOne({ _id: req.params.id })
                if (data.qty > 0) {
                    await User.updateOne(
                        {
                            _id: id,
                            'cart.id': req.params.id
                        },
                        {
                            $inc: { 'cart.$.qty': 1 }
                        }
                    );

                    await Product.updateOne({ _id: req.params.id }, {
                        $set: {
                            qty: data.qty - 1
                        }
                    })
                } else {
                    req.flash('stock-err', 'error')
                }
                res.redirect('/sell/new')
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
        const data = await Product.findOne({ _id: req.params.id })
        const { qty } = req.body
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const qtyCheck = Number(data.qty) - Number(qty)
                const filter = user.cart.find((item) => item.id === req.params.id)
                if (filter) {
                    req.flash('cart-filter-error', 'error')
                } else {
                    if (qtyCheck < 0) {
                        req.flash("qty-error", "error")
                        res.redirect("/sell/new")
                    } else {
                        await User.updateOne({ _id: id }, {
                            $push: {
                                cart: {
                                    qty: qty,
                                    id: data.id,
                                }
                            }
                        })
                    }
                }
                res.redirect("/sell/new")
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect('/passport/sign-up')
        }
    } catch (err) {
        console.log(err);
    }
})



router.put('/remove/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                await User.updateOne({ _id: id }, {
                    $pull: {
                        cart: {
                            id: req.params.id
                        }
                    }
                })

                res.redirect("back")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.post("/confirm", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const { phone, adress, note, total, name } = req.body
        let cartItems = user.cart;
        const ids = cartItems.map(item => mongoose.Types.ObjectId(item.id));
        const products = await Product.find({ _id: { $in: ids } });
        for (let product of products) {
            const orderItem = cartItems.find(item => item.id === product._id.toString());
            if (orderItem) {
                product.qty -= orderItem.qty;
                await product.save();
            }
        }

        const data = await Product.find({ _id: { $in: ids } });
        const productsWithQty = data.map(product => {
            const cartItem = cartItems.find(item => item.id === product._id.toString());
            return {
                ...product.toObject(),
                qty: cartItem ? cartItem.qty : 0,
                total: (cartItem ? cartItem.qty : 0) * product.sell_price,
                price: product.sell_price
            };
        });

        user.shop_cart = [];
        await user.save();

        const generateRandomNumber = () => {
            const min = 100000;
            const max = 999999;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const randomNumber = generateRandomNumber();
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const newSell = [
                    new Sell({
                        phone: phone,
                        adress: adress,
                        note: note,
                        status: "pending",
                        products: productsWithQty,
                        Date: moment().locale("ar-kw").format("l"),
                        user: user.name,
                        bid: randomNumber,
                        total: total,
                        name: name,
                    })
                ]

                newSell.forEach((data) => {
                    data.save()
                })

                await User.updateOne({ _id: id }, {
                    $set: {
                        cart: []
                    }
                })

                res.redirect("/sell")
            } else {
                req.flash('permission-error', 'error')
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/search-by-date/:start/:end", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const startDateString = req.params.start.replaceAll('-', '/')
        const endDateString = req.params.end.replaceAll('-', '/')

        const sell = await Sell.aggregate([
            {
                $match: {
                    $expr: {
                        $and: [
                            { $gte: [{ $dateFromString: { dateString: '$Date', format: '%d/%m/%Y' } }, new Date(startDateString)] },
                            { $lte: [{ $dateFromString: { dateString: '$Date', format: '%d/%m/%Y' } }, new Date(endDateString)] }
                        ]
                    }
                }
            }
        ]);


        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render("sell/get-search-by-date", {
                    user: user,
                    sell: sell,
                    filter: `date : ${startDateString} - ${endDateString}`
                })
            } else {
                req.flash('permission-error', 'error')
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/search-by-phone/:phone', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const phone = req.params.phone
        const sell = await Sell.find({ phone: phone }).sort({ Date: -1 })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render("sell/get-search", {
                    user: user,
                    sell: sell,
                    filter: `phone : ${phone}`
                })
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/search-by-filter/:filter", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const filter = req.params.filter

        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                if (filter == "newest") {
                    const sell = await Sell.find({}).sort({ Date: -1 })
                    res.render("sell/get-search", {
                        user: user,
                        sell: sell,
                        filter: `filter : newst`
                    })
                }

                if (filter == "oldest") {
                    const sell = await Sell.find({}).sort({ Date: 1 })
                    res.render("sell/get-search", {
                        user: user,
                        sell: sell,
                        filter: `filter : oldest`
                    })
                }

                if (filter == "pending") {
                    const sell = await Sell.find({ status: 'pending' })
                    res.render("sell/get-search", {
                        user: user,
                        sell: sell,
                        filter: `filter : pending`
                    })
                }
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get("/get-data/:id", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Sell.findOne({ _id: req.params.id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes("Sell")) {
                if (data.products.length > 0) {
                    const totalQty = data.products.map((x) => x.qty).reduce((a, b) => Number(a) + Number(b))
                    if (data.isShop == true) {
                        res.render("sell/get-data", {
                            user: user,
                            data: data,
                            suc: req.flash("status-suc"),
                            totalQty
                        })

                    } else {
                        const total = data.products.map((x) => x.total).reduce((a, b) => Number(a) + Number(b))
                        res.render("sell/get-data", {
                            user: user,
                            data: data,
                            total: total,
                            suc: req.flash("status-suc"),
                            totalQty,
                        })
                    }
                } else {
                    res.redirect("/sell")
                }

            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/return/:orderId/:itemId', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            const { orderId, itemId } = req.params
            const order = await Sell.findOne({ _id: orderId })
            const data = await Product.findOne({ _id: itemId })

            res.render('sell/return', {
                user: user,
                order: order,
                data: data
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/return-qty/:orderId/:itemId', async (req, res) => {
    try {
        const userId = req.cookies.id;
        const user = await User.findOne({ _id: userId });
        if (!user || !user.isAdmin) {
            return res.status(403).send("Unauthorized access.");
        }

        const { orderId, itemId } = req.params;
        const qty = Number(req.body.qty);

        if (isNaN(qty) || qty <= 0) {
            return res.status(400).send("Invalid quantity.");
        }

        const order = await Sell.findOne({ _id: orderId });
        if (!order) {
            return res.status(404).send("Order not found.");
        }
        const getItem = order.products.find(item => item._id.toString() === itemId);
        if (!getItem) {
            return res.status(404).send("Product not found in the order.");
        }

        const productData = await Product.findOne({ _id: itemId });
        if (!productData) {
            return res.status(404).send("Product details not found.");
        }

        const newQty = getItem.qty - qty;

        if (newQty < 0) {
            return res.status(400).send("Insufficient product quantity.");
        }
        const objectIdItemId = mongoose.Types.ObjectId(itemId);

        const updateResult = await Sell.updateOne(
            { _id: orderId, 'products._id': objectIdItemId },
            {
                $set: {
                    'products.$.qty': newQty,
                    'products.$.total': productData.sell_price * newQty,
                },
            }
        );

        const data = await Product.findOne({ _id: itemId })

        await Product.updateOne({ _id: itemId }, {
            $set: {
                qty: data.qty + qty
            }
        })
        if (updateResult.modifiedCount === 0) {
            return res.status(500).send("Failed to update quantity.");
        }
        res.redirect(`/sell/get-data/${orderId}`);
    } catch (err) {
        console.error("Error updating order:", err);
        res.status(500).send("An error occurred while processing your request.");
    }
});


router.put("/return/:orderId/:itemId", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const { orderId, itemId } = req.params
                const data = await Sell.findOne({ _id: orderId })
                const itemData = await Product.findOne({ _id: itemId })
                const item = data.products.find((item) => item._id == itemId)

                await Product.updateOne({ _id: itemId }, {
                    $set: {
                        qty: Number(itemData.qty) + Number(item.qty)
                    },
                })

                await Sell.updateOne({ _id: orderId }, {
                    $pull: {
                        products: {
                            _id: item._id
                        }
                    }
                })
                res.redirect("back")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put("/return-shop/:orderId/:itemId", async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const { orderId, itemId } = req.params;
                const data = await Sell.findOne({ _id: orderId });
                const itemData = await Product.findOne({ _id: itemId });
                const objectId = mongoose.Types.ObjectId(itemId);
                const item = data.products.find((item) => item._id.equals(objectId));

                await Product.updateOne({ _id: itemId }, {
                    $set: {
                        qty: Number(itemData.qty) + Number(item.qty)
                    },

                    $pull: {
                        score: {
                            num: Number(item.qty)
                        }
                    }
                })

                await Sell.updateOne({ _id: orderId }, {
                    $pull: {
                        products: {
                            _id: item._id
                        }
                    }
                })

                res.redirect("back")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/status/confirm/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                await Sell.updateOne({ _id: req.params.id }, {
                    $set: {
                        status: "done"
                    }
                })

                req.flash("status-suc", "success")
                res.redirect("back")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/bill/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user) {
            const data = await Sell.findOne({ _id: req.params.id })
            const total = data.products.map((x) => x.total).reduce((a, b) => a + b)
            res.render("sell/bill", {
                user: user,
                data: data,
                total: total
            })
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Sell.findOne({ _id: req.params.id })
        const products = await Product.find({})
        const productsData = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(productsData)]

        if (data.products.length > 0) {
            const cost = data.products.map(x => x.total)
            const total = cost.reduce((a, b) => a + b)
            if (user.isAdmin == true || user.permissions.includes("Sell")) {
                res.render('sell/edit', {
                    user: user,
                    data: data,
                    total: total,
                    uniqueArray: uniqueArray,
                    err: req.flash("qty-error"),
                    uniqueErr: req.flash('cart-filter-error')
                })
            }
        } else {
            res.redirect("/sell")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/remove/:sellId/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const product = await Product.findOne({ _id: req.params.id })
        const sell = await Sell.findOne({ _id: req.params.sellId })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const data = sell.products.find((item) => item._id == req.params.id)

                await Product.updateOne({ _id: req.params.id }, {
                    $set: {
                        qty: Number(product.qty) + Number(data.qty)
                    },

                    $pull: {
                        score: {
                            num: data.qty,
                            Date: data.Date,
                        }
                    }
                })

                await Sell.updateOne({ _id: req.params.sellId }, {
                    $pull: {
                        products: {
                            id: data.id
                        }
                    }
                })
                res.redirect("back")

            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/remove-shop/:sellId/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const product = await Product.findOne({ _id: req.params.id })
        const sell = await Sell.findOne({ _id: req.params.sellId })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const objectId = mongoose.Types.ObjectId(req.params.id);
                const data = sell.products.find((item) => item._id.equals(objectId));
                await Product.updateOne({ _id: req.params.id }, {
                    $set: {
                        qty: Number(product.qty) + Number(data.qty)
                    },

                    $pull: {
                        score: {
                            num: data.qty,
                            Date: data.Date,
                        }
                    }
                })

                await Sell.updateOne({ _id: req.params.sellId }, {
                    $pull: {
                        products: {
                            _id: data._id
                        }
                    }
                })
                res.redirect("back")

            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/confirm/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        const { name, phone, adress, note } = req.body

        if (user.isAdmin == true || user.permissions.includes("Sell")) {
            await Sell.updateOne({ _id: req.params.id }, {
                $set: {
                    name: name,
                    phone: phone,
                    adress: adress,
                    note: note,
                }
            })

            res.redirect(`/sell/get-data/${req.params.id}`)
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/search/:id/:name', async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findOne({ _id: id })
        const searchValue = req.params.name
        const [name, size] = searchValue.split(' - ');
        const products = await Product.find({ name: name, size: size })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render('sell/edit-search', {
                    user: user,
                    products: products,
                    id: req.params.id
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/get/:id/:productId', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.productId })
        const products = await Product.find({ _id: req.params.id })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render("sell/edit-get-item", {
                    user: user,
                    data: data,
                    products: products,
                    id: req.params.id
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect('/passport/sign-up')
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/add/:orderId/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const orderId = req.params.orderId
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: req.params.id })
        const order = await Sell.findOne({ _id: orderId })
        const { qty, type } = req.body
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                const qtyCheck = Number(data.qty) - Number(qty)
                const filter = order.products.find((item) => item.id === req.params.id)
                if (filter) {
                    req.flash('cart-filter-error', 'error')
                    res.redirect(`/sell/edit/${orderId}`)
                } else {
                    if (qtyCheck < 0) {
                        req.flash("qty-error", "error")
                        res.redirect(`/sell/edit/${orderId}`)
                    } else {
                        await Sell.updateOne({ _id: orderId }, {
                            $push: {
                                products: {
                                    name: data.name,
                                    price: data.sell_price,
                                    image: data.image,
                                    color: data.color,
                                    size: data.size,
                                    qty: qty,
                                    type: type,
                                    id: data.id,
                                    total: qty * data.sell_price,
                                }
                            }
                        })

                        await Product.updateOne({ _id: req.params.id }, {
                            $set: {
                                qty: data.qty - qty
                            },

                            $push: {
                                score: {
                                    num: qty,
                                    Date: moment().locale("ar-kw").format("l")
                                }
                            }
                        })
                    }
                }
                res.redirect(`/sell/edit/${orderId}`)
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect('/passport/sign-up')
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/search-by-name/:name', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const sell = await Sell.find({ name: req.params.name }).sort({ Date: -1 })
        const sellForSearch = await Sell.find({}).sort({ Date: -1 })
        const uniqueSellNames = await Sell.distinct('name');
        const uniqueSell = [];
        const data = sellForSearch.map((item) => `${item.name}`)
        const uniqueArray = [... new Set(data)]
        for (const name of uniqueSellNames) {
            const product = await Sell.findOne({ name });
            if (product) {
                uniqueSell.push(product);
            }
        }
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render("sell/dashboard", {
                    user: user,
                    sell: sell,
                    data: uniqueArray,
                })
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/search/:name', async (req, res) => {
    try {
        const id = req.cookies.id;
        const user = await User.findOne({ _id: id })
        const searchValue = req.params.name
        const [name, size] = searchValue.split(' - ');
        const products = await Product.find({ name: name, size: size })
        if (user) {
            if (user.isAdmin == true || user.permissions.includes('Sell')) {
                res.render('sell/search', {
                    user: user,
                    products: products
                })
            } else {
                req.flash("permission-error", "error")
                res.redirect("/")
            }
        } else {
            res.redirect("/passport/sign-up")
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit-return/:sellId/:itemId', async (req, res) => {
    try {
        const { sellId, itemId } = req.params
        const id = req.cookies.id;
        const user = await User.findOne({ _id: id })
        const data = await Product.findOne({ _id: itemId })
        const sell = await Sell.findOne({ _id: sellId })
        if (user.isAdmin == true || user.permissions.includes('Sell')) {
            res.render('sell/edit-return', {
                sell, data, user
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit-return/:sellId/:itemId', async (req, res) => {
    try {
      const { sellId, itemId } = req.params;
      const newQty = req.body.qty;
      const id = req.cookies.id;
  
      const user = await User.findOne({ _id: id });
      const data = await Product.findOne({ _id: itemId });
      const sell = await Sell.findOne({ _id: sellId });
  
      const getItem = sell.products.find((item) => item._id.toString() === itemId.toString());
      if (!getItem) {
        return res.status(404).send('Item not found in sell');
      }
  
      const oldQty = getItem.qty;
      const updatedQty = Number(oldQty) - Number(newQty);
      const objectItemId = new mongoose.Types.ObjectId(itemId);
  
      if (user.isAdmin === true || user.permissions.includes('Sell')) {
        if (updatedQty <= 0) {
          // Remove the item from the array
          await Sell.updateOne(
            { _id: sellId },
            { $pull: { products: { _id: objectItemId } } }
          );
        } else {
          // Update the quantity
          await Sell.updateOne(
            { _id: sellId, 'products._id': objectItemId },
            {
              $set: {
                'products.$.qty': updatedQty,
              },
            }
          );
        }
  
        // Update Product stock
        await Product.updateOne(
          { _id: itemId },
          {
            $set: {
              qty: Number(data.qty) + Number(newQty),
            },
          }
        );
  
        res.redirect(`/sell/edit/${sell.id}`);
      } else {
        res.status(403).send('Unauthorized');
      }
    } catch (err) {
      console.log(err);
      res.status(500).send('Server Error');
    }
  });  

module.exports = router