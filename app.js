const express = require('express');
const app = express();
const session = require('express-session')
const flash = require('express-flash')
const cookieParser = require('cookie-parser')
const methodOverride = require("method-override")
const db = require('./config/database')
const mongoose = require('mongoose')
const passport = require('./routes/passport');
const bodyParser = require('body-parser')
const index = require("./routes/admin/index")
const permissions = require('./routes/admin/permissions')
const items = require('./routes/admin/items')
const colors = require('./routes/admin/colors')
const size = require('./routes/admin/size')
const purchase = require('./routes/admin/purchase')
const sell = require('./routes/admin/sell')
const storage = require('./routes/admin/storage')
const analysis = require('./routes/admin/analysis')
const dailyMoney = require('./routes/admin/dailyMoney')
const shop = require('./routes/shop/index')
const category = require('./routes/admin/category')
const brand = require('./routes/admin/brand')
const fav = require('./routes/shop/fav')
const cart = require('./routes/shop/cart')
const profile = require('./routes/shop/profile')
const passportShop = require('./routes/shop/passport')
const localstoreStorage = require('./routes/localstore/storage')
const localstoreSell = require('./routes/localstore/sell')
const localstoreOrders = require('./routes/localstore/orders')
const localstoreDailyMoney = require('./routes/localstore/dailyMoney')
const localstoreDailySummary = require('./routes/localstore/dailySummary')
const transfer = require('./routes/admin/transfer')


let PORT = 3000


app.set('view engine', 'ejs')
app.use(express.static("public"))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.json())
app.use(session({
    secret: 'secret',
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
}))
app.use(flash());
app.use(cookieParser());
app.use(methodOverride("_method"))

app.use('/passport', passport)
app.use("/", index)
app.use('/permissions', permissions)
app.use("/items", items)
app.use("/colors", colors)
app.use("/size", size)
app.use("/purchase", purchase)
app.use("/sell", sell)
app.use("/storage", storage)
app.use("/analysis", analysis)
app.use("/dailymoney", dailyMoney)
app.use('/shop', shop)
app.use('/category', category)
app.use('/brand', brand)
app.use('/shop', fav)
app.use('/shop/cart', cart)
app.use('/shop/profile', profile)
app.use('/shop/passport', passportShop)
app.use('/localstore/storage', localstoreStorage)
app.use('/localstore/sell', localstoreSell)
app.use('/localstore/orders', localstoreOrders)
app.use('/localstore/dailymoney', localstoreDailyMoney)
app.use('/localstore/dailysummary', localstoreDailySummary)
app.use('/transfer', transfer)

app.listen(PORT, (err) => {
    if(err) throw err
    console.log(`Server is running on port ${PORT}`);
})