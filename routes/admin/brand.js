const express = require('express')
const User = require('../../models/User')
const Brand = require('../../models/Brand')
const router = express.Router()
const multer = require('multer')
const moment = require('moment');
const Product = require('../../models/Product')

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "./public/upload/images");
    },

    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname);
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 1000 * 1000,
    },
});


router.get('/brands', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const brand = await Brand.find({}).sort({ _id: -1 })

        if (user.isAdmin == true) {
            res.render('brand/brands', {
                user: user,
                brand: brand,
                success: req.query.success
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.post('/add', upload.single('image'), async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            new Brand({
                name: req.body.name,
                image: req.file.filename,
                Date: moment().locale("ar-kw").format("l"),
            }).save()

            res.redirect('/brand/brands?success=Brand added successfully!')
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Brand.findOne({ _id: req.params.id })

        if (user.isAdmin == true) {
            res.render('brand/edit', {
                user: user,
                data: data
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Brand.findOne({ _id: req.params.id })

        if (user.isAdmin == true) {
            await Product.updateMany({ brand: data.name }, {
                $set: {
                    brand: req.body.name
                }
            })
            if (typeof req.file === "undefined") {
                await Brand.updateOne({ _id: req.params.id }, {
                    $set: {
                        name: req.body.name
                    }
                })
            } else {
                await Brand.updateOne({ _id: req.params.id }, {
                    $set: {
                        name: req.body.name,
                        image: req.file.filename
                    }
                })
            }

            res.redirect("/brand/brands")
        }
    } catch (err) {
        console.log(err);
    }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            await Brand.deleteOne({ _id: req.params.id })
            res.redirect("/brand/brands")
        }
    } catch (err) {
        console.log(err);
    }
})

module.exports = router