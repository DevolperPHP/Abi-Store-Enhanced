const express = require('express')
const router = express.Router()
const isAdminMiddleWare = require('../../middleware/isAdmin')
const isUserMiddleWare = require('../../middleware/isUser')
const Product = require('../../models/Product')
const User = require('../../models/User')
const mongoose = require('mongoose')

router.use(isAdminMiddleWare)
router.use(isUserMiddleWare)

// Transfer from Main Storage to Local Store
router.get('/', async (req, res) => {
    try {
        const productsItems = await Product.find({})
        const data = productsItems.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]

        const transferItems = req.user.transfer;
        if (transferItems.length > 0) {

            const qtyMap = req.user.transfer.reduce((map, item) => {
                map[item.id.toString()] = { qty: Number(item.qty) || 0, addedAt: item.addedAt };
                return map;
            }, {});

            const products = await Product.find({ _id: { $in: transferItems.map(item => item.id) } });
            const formattedProducts = products.map(product => {
                const productIdStr = product._id.toString();
                const qtyData = qtyMap[productIdStr];
                return {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    colorName: product.colorName,
                    size: product.size,
                    stock: product.stock,  // Available in Local Store
                    mainQty: product.qty,  // Available in Main Storage
                    transferQty: Number(qtyData?.qty) || 0,  // Transfer quantity
                    addedAt: qtyData?.addedAt || Date.now()
                };
            }).sort((a, b) => b.addedAt - a.addedAt);


            res.render('transfer/index', {
                user: req.user,
                products: formattedProducts,
                data: uniqueArray,
                err: req.flash('err'),
                direction: 'to-store'
            })

        } else {
            res.render('transfer/index', {
                user: req.user,
                products: [],
                data: uniqueArray,
                err: req.flash('err'),
                direction: 'to-store'
            })
        }
    } catch (err) {
        console.log(err);
    }
})

// Transfer from Local Store to Main Storage
router.get('/to-main', async (req, res) => {
    try {
        const productsItems = await Product.find({})
        const data = productsItems.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]

        const transferItems = req.user.transfer;
        if (transferItems.length > 0) {

            const qtyMap = req.user.transfer.reduce((map, item) => {
                map[item.id.toString()] = { qty: Number(item.qty) || 0, addedAt: item.addedAt };
                return map;
            }, {});

            const products = await Product.find({ _id: { $in: transferItems.map(item => item.id) } });
            const formattedProducts = products.map(product => {
                const productIdStr = product._id.toString();
                const qtyData = qtyMap[productIdStr];
                return {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    colorName: product.colorName,
                    size: product.size,
                    stock: product.stock,  // Available in Local Store
                    mainQty: product.qty,  // Available in Main Storage
                    transferQty: Number(qtyData?.qty) || 0,  // Transfer quantity
                    addedAt: qtyData?.addedAt || Date.now()
                };
            }).sort((a, b) => b.addedAt - a.addedAt);


            res.render('transfer/index', {
                user: req.user,
                products: formattedProducts,
                data: uniqueArray,
                err: req.flash('err'),
                direction: 'to-main'  // Pass direction flag
            })

        } else {
            res.render('transfer/index', {
                user: req.user,
                products: [],
                data: uniqueArray,
                err: req.flash('err'),
                direction: 'to-main'  // Pass direction flag
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/add-by-code/:code', async (req, res) => {
    try {
        const data = await Product.findOne({ barcode: req.params.code })
        const products = req.user.transfer
        const direction = req.query.direction || 'to-store'
        if (data) {
            const filter = products.find(item => item.id == data.id)
            if (filter) {
                const qty = filter.qty
                await User.updateOne({ _id: req.user.id, 'transfer.id': data._id }, {
                    $set: {
                        'transfer.$.qty': qty + 1
                    }
                })
            } else {
                await User.updateOne({ _id: req.user.id }, {
                    $push: {
                        transfer: {
                            id: data._id,
                            qty: 1,
                            addedAt: Date.now(),
                        }
                    }
                })
            }
        } else {
            req.flash('err', 'Product not found')
        }

        // Redirect to the correct transfer page based on direction
        if (direction === 'to-main') {
            res.redirect('/transfer/to-main')
        } else {
            res.redirect('/transfer')
        }
    } catch (err) {
        console.log(err);
    }
})


router.put('/return/:id', async (req, res) => {
    try {
        const id = mongoose.Types.ObjectId(req.params.id)
        const direction = req.query.direction || 'to-store'

        await User.updateOne({ _id: req.user.id }, {
            $pull: {
                transfer: {
                    id: id
                }
            }
        })

        // Redirect to the correct transfer page based on direction
        if (direction === 'to-main') {
            res.redirect('/transfer/to-main')
        } else {
            res.redirect('/transfer')
        }
    } catch (err) {
        console.log(err);

    }
})

router.get('/edit-qty/:id', async (req, res) => {
    try {
        const data = await Product.findOne({ _id: req.params.id })

        // Get current quantity from user's transfer array
        const transferItem = req.user.transfer.find(item => item.id.toString() === req.params.id);
        const currentQty = transferItem ? transferItem.qty : 1;

        // Determine direction from current URL or default to 'to-store'
        const direction = req.url.includes('/transfer/to-main') ? 'to-main' : 'to-store';

        res.render('transfer/edit-qty', {
            data,
            user: req.user,
            currentQty,
            direction
        })
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit-qty/:id', async (req, res) => {
    try {
        const id = mongoose.Types.ObjectId(req.params.id);
        const { direction } = req.body;

        await User.updateOne(
            { _id: req.user.id, 'transfer.id': id },
            { $set: { 'transfer.$.qty': req.body.qty } }
        );

        // Redirect to the correct transfer page based on direction
        if (direction === 'to-main') {
            res.redirect('/transfer/to-main');
        } else {
            res.redirect('/transfer');
        }
    } catch (err) {
        console.log(err);
    }
});

router.put('/confirm', async (req, res) => {
    try {
        const { min, add } = req.body
        const transferItems = req.user.transfer
        const ids = transferItems.map(item => mongoose.Types.ObjectId(item.id))
        const products = await Product.find({ _id: { $in: ids } })

        if (add == min) {
            req.flash('err', "You can't transfer items to the same storage")
            res.redirect('/transfer')
            return
        }

        if (min == "Main Storage" && add == "Local Store") {
            // Transfer FROM Main Storage TO Local Store
            for (let product of products) {
                const item = transferItems.find(item => item.id == product._id.toString())
                if (item) {
                    product.qty -= Number(item.qty)
                    product.stock += Number(item.qty)
                    await product.save();
                }
            }
            req.user.transfer = []
            await req.user.save()
        } else if (min == "Local Store" && add == "Main Storage") {
            // Transfer FROM Local Store TO Main Storage
            for (let product of products) {
                const item = transferItems.find(item => item.id == product._id.toString())
                if (item) {
                    product.stock -= Number(item.qty)
                    product.qty += Number(item.qty)
                    await product.save();
                }
            }
            req.user.transfer = []
            await req.user.save()
        }

        res.redirect('/transfer')
    } catch (err) {
        console.log(err);
    }
})


router.get('/search/:name', async (req, res) => {
    try {
        const searchValue = req.params.name;
        const [name, size] = searchValue.split(' - ');
        const direction = req.query.direction || 'to-store';  // Get direction from query param

        const products = await Product.find({ name, size });

        if (!req.user) return res.redirect("/passport/sign-up");

        res.render('transfer/search', {
            user: req.user,
            products: products,
            direction: direction
        });

    } catch (err) {
        console.error('Error during transfer search:', err);
        res.redirect('/transfer');
    }
});

router.get('/search/get-qty/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const data = await Product.findOne({ _id: id });
        const direction = req.query.direction || 'to-store';

        if (!req.user) return res.redirect("/passport/sign-up");

        res.render('transfer/search-qty', {
            user: req.user,
            data: data,
            direction: direction
        });

    } catch (err) {
        console.error('Error during transfer search:', err);
        res.redirect('/transfer');
    }
});

router.put('/add/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const productId = mongoose.Types.ObjectId(req.params.id); // 🔧 ensure ObjectId
    const { qty, direction } = req.body;

    const [product, user] = await Promise.all([
      Product.findOne({ _id: productId }),
      User.findOne({ _id: userId })
    ]);

    if (!product) {
      req.flash('err', 'Product not found');
      return res.redirect('/transfer');
    }

    const alreadyInTransfer = user.transfer.find(item =>
      String(item.id) === String(productId) // compare as strings to avoid mismatch
    );

    if (alreadyInTransfer) {
      req.flash('transfer-duplicate', 'Item already in transfer list');
    } else {
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            transfer: {
              id: productId, // ✅ ObjectId stored here now
              qty: Number(qty),
              addedAt: Date.now()
            }
          }
        }
      );
    }

    // Redirect back to the correct transfer page based on direction
    if (direction === 'to-main') {
      res.redirect('/transfer/to-main');
    } else {
      res.redirect('/transfer');
    }

  } catch (err) {
    console.error('Error adding to transfer:', err);
    res.redirect('/transfer');
  }
});

module.exports = router