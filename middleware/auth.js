function requireLogin(req, res, next) {

    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    next();
}


function requireRole(role) {

    return (req, res, next) => {

        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }

        if (req.session.user.role !== role) {
            return res.status(403).send('Access denied');
        }

        next();
    };
}


function requireAnyRole(...roles) {

    return (req, res, next) => {

        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }

        if (!roles.includes(req.session.user.role)) {
            return res.status(403).send('Access denied');
        }

        next();
    };
}


module.exports = {
    requireLogin,
    requireRole,
    requireAnyRole
};