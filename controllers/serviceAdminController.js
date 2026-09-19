const db = require('../config/db');

async function index(req, res) {
    try {
        const [services] = await db.query(`
            SELECT
                Id,
                Name,
                Price,
                IsActive,
                Category
            FROM Services
            ORDER BY Id DESC
        `);

        const hairAndBeard = services.filter(
            service => service.Category === 'HairAndBeard'
        );

        const skinCare = services.filter(
            service => service.Category === 'SkinCare'
        );

        const drinks = services.filter(
            service => service.Category === 'Drinks'
        );

        const products = services.filter(
            service => service.Category === 'Products'
        );

        res.render('admin/services', {
            user: req.session.user,
            hairAndBeard,
            skinCare,
            drinks,
            products
        });

    } catch (error) {
        console.error('Services page error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل الخدمات</h2>
            <pre>${error.message}</pre>
        `);
    }
}


function createPage(req, res) {
    res.render('admin/service-form', {
        user: req.session.user,
        service: null,
        error: null
    });
}


async function create(req, res) {
    try {
        const {
            name,
            category,
            price
        } = req.body;

        if (!name || !name.trim()) {
            return res.render('admin/service-form', {
                user: req.session.user,
                service: {
                    Name: name || '',
                    Category: category || 'HairAndBeard',
                    Price: price || ''
                },
                error: 'من فضلك اكتب اسم الخدمة'
            });
        }

        const servicePrice = Number(price);

        if (
            price === undefined ||
            price === '' ||
            Number.isNaN(servicePrice) ||
            servicePrice < 0
        ) {
            return res.render('admin/service-form', {
                user: req.session.user,
                service: {
                    Name: name.trim(),
                    Category: category || 'HairAndBeard',
                    Price: price || ''
                },
                error: 'من فضلك اكتب سعر صحيح'
            });
        }

        await db.query(`
            INSERT INTO Services
            (
                Name,
                Category,
                Price,
                IsActive
            )
            VALUES
            (
                ?,
                ?,
                ?,
                1
            )
        `, [
            name.trim(),
            category || 'HairAndBeard',
            servicePrice
        ]);

        res.redirect('/admin/services');

    } catch (error) {
        console.error('Create service error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء إضافة الخدمة</h2>
            <pre>${error.message}</pre>
        `);
    }
}


async function editPage(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).send('رقم الخدمة غير صحيح');
        }

        const [[service]] = await db.query(`
            SELECT
                Id,
                Name,
                Category,
                Price,
                IsActive
            FROM Services
            WHERE Id = ?
            LIMIT 1
        `, [id]);

        if (!service) {
            return res.status(404).send('الخدمة غير موجودة');
        }

        res.render('admin/service-form', {
            user: req.session.user,
            service,
            error: null
        });

    } catch (error) {
        console.error('Edit service page error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل الخدمة</h2>
            <pre>${error.message}</pre>
        `);
    }
}


async function update(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).send('رقم الخدمة غير صحيح');
        }

        const {
            name,
            category,
            price
        } = req.body;

        const [[existingService]] = await db.query(`
            SELECT
                Id,
                Name,
                Category,
                Price,
                IsActive
            FROM Services
            WHERE Id = ?
            LIMIT 1
        `, [id]);

        if (!existingService) {
            return res.status(404).send('الخدمة غير موجودة');
        }

        if (!name || !name.trim()) {
            return res.render('admin/service-form', {
                user: req.session.user,
                service: {
                    ...existingService,
                    Name: name || '',
                    Category: category || existingService.Category,
                    Price: price !== undefined ? price : existingService.Price
                },
                error: 'من فضلك اكتب اسم الخدمة'
            });
        }

        const servicePrice = Number(price);

        if (
            price === undefined ||
            price === '' ||
            Number.isNaN(servicePrice) ||
            servicePrice < 0
        ) {
            return res.render('admin/service-form', {
                user: req.session.user,
                service: {
                    ...existingService,
                    Name: name.trim(),
                    Category: category || existingService.Category,
                    Price: price || ''
                },
                error: 'من فضلك اكتب سعر صحيح'
            });
        }

        await db.query(`
            UPDATE Services
            SET
                Name = ?,
                Category = ?,
                Price = ?
            WHERE Id = ?
        `, [
            name.trim(),
            category || 'HairAndBeard',
            servicePrice,
            id
        ]);

        res.redirect('/admin/services');

    } catch (error) {
        console.error('Update service error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تعديل الخدمة</h2>
            <pre>${error.message}</pre>
        `);
    }
}


async function toggle(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).send('رقم الخدمة غير صحيح');
        }

        await db.query(`
            UPDATE Services
            SET IsActive = NOT IsActive
            WHERE Id = ?
        `, [id]);

        res.redirect('/admin/services');

    } catch (error) {
        console.error('Toggle service error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تغيير حالة الخدمة</h2>
            <pre>${error.message}</pre>
        `);
    }
}


module.exports = {
    index,
    createPage,
    create,
    editPage,
    update,
    toggle
};