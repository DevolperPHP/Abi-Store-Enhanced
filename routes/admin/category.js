const express = require('express')
const User = require('../../models/User')
const Category = require('../../models/Category')
const router = express.Router()
const moment = require('moment');
const Product = require('../../models/Product');


router.get('/categories', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const category = await Category.find({})

        if (user.isAdmin == true) {
            res.render('category/categories', {
                user: user,
                category: category
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.post('/add', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })

        if (user.isAdmin == true) {
            new Category({
                name: req.body.name,
                Date: moment().locale("ar-kw").format("l"),
                des: req.body.des
            }).save()

            res.redirect('/category/categories')
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
            await Category.deleteOne({ _id: req.params.id })
            res.redirect('/category/categories')
        }
    } catch (err) {
        console.log(err);
    }
})

router.get('/edit/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id })
        const data = await Category.findOne({ _id: req.params.id })

        if (user.isAdmin == true) {
            res.render('category/edit',{
                user: user,
                data: data
            })
        }
    } catch (err) {
        console.log(err);
    }
})

router.put('/edit/:id', async (req, res) => {
    try {
        const id = req.cookies.id
        const user = await User.findOne({ _id: id})
        const category = await Category.findOne({ _id: req.params.id })

        if(user.isAdmin == true){
            await Product.updateMany({ category: category.name }, {
                $set:{
                    category: req.body.name,
                }
            })

            await Category.updateOne({ _id: req.params.id }, {
                $set: {
                    name: req.body.name,
                    des: req.body.des,
                }
            })

            res.redirect("/category/categories")
        }
    } catch (err) {
        console.log(err);
    }
})
module.exports = router