const express = require('express')
const router = express.Router()
const middleware = require('../../middleware/LocalStoreAccess')
const Product = require('../../models/Product')
const Size = require('../../models/Size')

router.use(middleware)

router.get('/', async (req, res) => {
    try {
        const items = await Product.find({ stock: { $ne: null } });
        const size = await Size.find({})
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/storage', {
            user: req.user,
            items,
            size,
            data: uniqueArray,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/search-by-name/:name', async (req, res) => {
    try {
        const searchValue = req.params.name
        const [name, _size] = searchValue.split(' - ');
        const items = await Product.find({ name: name, size: _size })
        const size = await Size.find({})
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/storage', {
            user: req.user,
            items,
            size,
            data: uniqueArray,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/filter/:filter', async (req, res) => {
    try {
        const size = await Size.find({})
        const filter = req.params.filter
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        switch (filter) {
            case 'most':
                const itemsMost = await Product.find({ stock: { $ne: null } }).sort({ stock: -1 });
                res.render('localstore/storage/storage', {
                    user: req.user,
                    items: itemsMost,
                    size,
                    data: uniqueArray,
                })
                break;

            case 'less':
                const itemsLess = await Product.find({ stock: { $ne: null } }).sort({ stock: 1 });
                res.render('localstore/storage/storage', {
                    user: req.user,
                    items: itemsLess,
                    size,
                    data: uniqueArray,
                })
                break;
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/size/:size', async (req, res) => {
    try {
        const items = await Product.find({ stock: { $ne: null }, size: req.params.size });
        const size = await Size.find({})
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/storage', {
            user: req.user,
            items,
            size,
            data: uniqueArray,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/search/:barcode', async (req, res) => {
    try {
        const item = await Product.findOne({ barcode: req.params.barcode })
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/search', {
            user: req.user,
            item,
            suc: req.flash('qty-suc'),
            err: req.flash('qty-err'),
            data: uniqueArray
        })
    } catch (err) {
        console.log(err);

    }
})

router.put('/add/:id', async (req, res) => {
    try {
        const value = Number(req.body.qty)
        const data = await Product.findOne({ _id: req.params.id })

        if ((value > data.qty) || (value < 0)) {
            req.flash('qty-err', 'Not enough quantity in main storage')
        } else {
            await Product.updateOne({ _id: req.params.id }, {
                $set: {
                    qty: data.qty - value,
                    stock: data.stock + value
                }
            })
            req.flash('qty-suc', 'Items added successfully')
        }

        res.redirect(`/localstore/storage/search/${data.barcode}`)

    } catch (err) {
        console.log(err);

    }
})

router.put('/return/:id', async (req, res) => {
    try {
        const value = Number(req.body.qty)
        const data = await Product.findOne({ _id: req.params.id })

        if ((value > data.stock) || (value < 0)) {
            req.flash('qty-err', 'Invaild value')
        } else {
            await Product.updateOne({ _id: req.params.id }, {
                $set: {
                    qty: data.qty + value,
                    stock: data.stock - value
                }
            })
            req.flash('qty-suc', 'Item returned to main storage')
        }

        res.redirect(`/localstore/storage/search/${data.barcode}`)

    } catch (err) {
        console.log(err);

    }
})

router.get('/main-storage', async (req, res) => {
    try {
        const items = await Product.find({})
        const size = await Size.find({})
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/main-storage', {
            user: req.user,
            items,
            size,
            data: uniqueArray
        })
    } catch (err) {
        console.log(err);

    }
})

router.get('/main-storage/search-by-name/:name', async (req, res) => {
    try {
        const searchValue = req.params.name
        const [name, _size] = searchValue.split(' - ');
        const items = await Product.find({ name: name, size: _size })
        const size = await Size.find({})
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/main-storage', {
            user: req.user,
            items,
            size,
            data: uniqueArray,
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/main-storage/filter/:filter', async (req, res) => {
    try {
        const size = await Size.find({})
        const filter = req.params.filter
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        switch (filter) {
            case 'most':
                const itemsMost = await Product.find({}).sort({ qty: -1 });
                res.render('localstore/storage/main-storage', {
                    user: req.user,
                    items: itemsMost,
                    size,
                    data: uniqueArray
                })
                break;

            case 'less':
                const itemsLess = await Product.find({}).sort({ qty: 1 });
                res.render('localstore/storage/main-storage', {
                    user: req.user,
                    items: itemsLess,
                    size,
                    data: uniqueArray
                })
                break;
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/main-storage/size/:size', async (req, res) => {
    try {
        const items = await Product.find({ size: req.params.size });
        const size = await Size.find({})
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/main-storage', {
            user: req.user,
            items,
            size,
            data: uniqueArray
        })
    } catch (err) {
        console.log(err);
    }
})

router.get('/main-storage/search/:barcode', async (req, res) => {
    try {
        const item = await Product.findOne({ barcode: req.params.barcode })
        const products = await Product.find({})
        const data = products.map((item) => `${item.name} - ${item.size}`)
        const uniqueArray = [... new Set(data)]
        res.render('localstore/storage/search', {
            user: req.user,
            item,
            data: uniqueArray,
            suc: req.flash('qty-suc'),
            err: req.flash('qty-err'),
        })
    } catch (err) {
        console.log(err);

    }
})
module.exports = router