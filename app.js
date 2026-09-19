const express = require('express');
const path = require('path');
const session = require('express-session');

require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const barberRoutes = require('./routes/barberRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, 'public')
    )
);

app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

app.set(
    'view engine',
    'ejs'
);

app.set(
    'views',
    path.join(__dirname, 'views')
);


app.use(authRoutes);
app.use(adminRoutes);
app.use(barberRoutes);
app.use(reportRoutes);


app.get('/', (req, res) => {

    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    if (req.session.user.role === 'Admin') {
        return res.redirect('/admin');
    }

    if (req.session.user.role === 'Barber') {
        return res.redirect('/barber');
    }

    return res.status(403).send(
        'Access denied'
    );
});


app.listen(PORT, () => {

    console.log('');
    console.log('================================');
    console.log('     GROOM ROOM NODE.JS');
    console.log('================================');
    console.log('');

    console.log(
        `Server running on http://localhost:${PORT}`
    );

    console.log('');
});