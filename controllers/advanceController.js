const db = require('../config/db');

async function index(req, res) {
    try {
        const {
            dateFrom,
            dateTo,
            barberId
        } = req.query;

        let where = [];
        let params = [];

        if (dateFrom) {
            where.push(`a.Date >= ?`);
            params.push(`${dateFrom} 00:00:00`);
        }

        if (dateTo) {
            where.push(`a.Date < DATE_ADD(?, INTERVAL 1 DAY)`);
            params.push(`${dateTo} 00:00:00`);
        }

        if (barberId) {
            where.push(`a.BarberId = ?`);
            params.push(Number(barberId));
        }

        const whereClause = where.length
            ? `WHERE ${where.join(' AND ')}`
            : '';

        const [advances] = await db.query(`
            SELECT
                a.Id,
                a.BarberId,
                a.Amount,
                a.Reason,
                a.Date,
                b.Name AS BarberName
            FROM BarberAdvances a
            INNER JOIN Barbers b
                ON b.Id = a.BarberId
            ${whereClause}
            ORDER BY a.Date DESC, a.Id DESC
        `, params);

        const [barbers] = await db.query(`
            SELECT
                Id,
                Name
            FROM Barbers
            ORDER BY Name
        `);

        const totalAdvances = advances.reduce(
            (sum, advance) =>
                sum + Number(advance.Amount || 0),
            0
        );

        res.render('admin/advances', {
            user: req.session.user,
            advances,
            barbers,

            dateFrom: dateFrom || '',
            dateTo: dateTo || '',
            barberId: barberId || '',

            totalAdvances
        });

    } catch (error) {
        console.error('Advances page error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل السلف</h2>
            <pre>${error.message}</pre>
        `);
    }
}

async function addAdvance(req, res) {
    try {
        const {
            barberId,
            amount,
            reason,
            date
        } = req.body;

        const parsedBarberId = Number(barberId);
        const advanceAmount = Number(amount);

        if (!Number.isInteger(parsedBarberId)) {
            return res.status(400).send('الحلاق غير صحيح');
        }

        if (
            Number.isNaN(advanceAmount) ||
            advanceAmount <= 0
        ) {
            return res.status(400).send('قيمة السلفة غير صحيحة');
        }

        if (!date) {
            return res.status(400).send('التاريخ مطلوب');
        }

        const [[barber]] = await db.query(`
            SELECT Id
            FROM Barbers
            WHERE Id = ?
            LIMIT 1
        `, [parsedBarberId]);

        if (!barber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        await db.query(`
            INSERT INTO BarberAdvances
            (
                BarberId,
                Amount,
                Reason,
                Date
            )
            VALUES
            (?, ?, ?, ?)
        `, [
            parsedBarberId,
            advanceAmount,
            reason || '',
            `${date} 00:00:00`
        ]);

        res.redirect('/admin/advances');

    } catch (error) {
        console.error('Add advance error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء إضافة السلفة</h2>
            <pre>${error.message}</pre>
        `);
    }
}

module.exports = {
    index,
    addAdvance
};