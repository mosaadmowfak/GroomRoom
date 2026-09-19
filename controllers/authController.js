const bcrypt = require('bcryptjs');
const db = require('../config/db');

function showLogin(req, res) {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'Admin') {
            return res.redirect('/admin');
        }

        return res.redirect('/barber');
    }

    res.render('auth/login', {
        error: null
    });
}

async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.render('auth/login', {
                error: 'من فضلك اكتب اسم المستخدم والباسورد'
            });
        }

        const [users] = await db.query(
            `
            SELECT
                u.Id,
                u.FullName,
                u.UserName,
                u.PasswordHash,
                r.Name AS RoleName
            FROM AspNetUsers u
            INNER JOIN AspNetUserRoles ur
                ON ur.UserId = u.Id
            INNER JOIN AspNetRoles r
                ON r.Id = ur.RoleId
            WHERE LOWER(u.UserName) = LOWER(?)
            LIMIT 1
            `,
            [username.trim()]
        );

        if (users.length === 0) {
            return res.render('auth/login', {
                error: 'اسم المستخدم أو الباسورد غير صحيح'
            });
        }

        const user = users[0];

        const passwordValid = await bcrypt.compare(
            password,
            user.PasswordHash
        );

        if (!passwordValid) {
            return res.render('auth/login', {
                error: 'اسم المستخدم أو الباسورد غير صحيح'
            });
        }

        req.session.user = {
            id: user.Id,
            fullName: user.FullName,
            userName: user.UserName,
            role: user.RoleName
        };

        if (user.RoleName === 'Admin') {
            return res.redirect('/admin');
        }

        if (user.RoleName === 'Barber') {
            return res.redirect('/barber');
        }

        return res.status(403).send('Invalid user role');

    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).send('حدث خطأ أثناء تسجيل الدخول');
    }
}

function logout(req, res) {
    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error);
        }

        res.redirect('/login');
    });
}

module.exports = {
    showLogin,
    login,
    logout
};