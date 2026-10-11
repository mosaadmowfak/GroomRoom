
const db = require('../config/db');

function toBool(value) {
    return value === '1' || value === 'on' || value === true;
}

function formatDateForInput(value) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().split('T')[0];
}

async function getBarber(id) {
    const [[barber]] = await db.query(`
        SELECT
            Id,
            Name,
            BasicSalary,
            IsActive,
            UserId,
            StartDate,
            WorksFriday,
            WorksMonday,
            WorksSaturday,
            WorksSunday,
            WorksThursday,
            WorksTuesday,
            WorksWednesday
        FROM Barbers
        WHERE Id = ?
        LIMIT 1
    `, [id]);

    return barber;
}

// =========================
// BARBERS LIST
// =========================

async function index(req, res) {
    try {
        const [barbers] = await db.query(`
            SELECT
                Id,
                Name,
                BasicSalary,
                IsActive,
                StartDate,
                WorksFriday,
                WorksMonday,
                WorksSaturday,
                WorksSunday,
                WorksThursday,
                WorksTuesday,
                WorksWednesday
            FROM Barbers
            ORDER BY Id DESC
        `);

        res.render('admin/barbers', {
            user: req.session.user,
            barbers
        });
    } catch (error) {
        console.error('Barbers page error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل الحلاقين</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// CREATE PAGE
// =========================

function createPage(req, res) {
    res.render('admin/barber-form', {
        user: req.session.user,
        barber: {
            Name: '',
            BasicSalary: '',
            StartDate: '',
            WorksSaturday: false,
            WorksSunday: false,
            WorksMonday: false,
            WorksTuesday: false,
            WorksWednesday: false,
            WorksThursday: false,
            WorksFriday: false
        },
        error: null
    });
}

// =========================
// CREATE
// =========================

async function create(req, res) {
    try {
        const {
            name,
            basicSalary,
            startDate,
            saturday,
            sunday,
            monday,
            tuesday,
            wednesday,
            thursday,
            friday
        } = req.body;

        const barber = {
            Name: name || '',
            BasicSalary: basicSalary || '',
            StartDate: startDate || '',
            WorksSaturday: toBool(saturday),
            WorksSunday: toBool(sunday),
            WorksMonday: toBool(monday),
            WorksTuesday: toBool(tuesday),
            WorksWednesday: toBool(wednesday),
            WorksThursday: toBool(thursday),
            WorksFriday: toBool(friday)
        };

        if (!name || !name.trim()) {
            return res.render('admin/barber-form', {
                user: req.session.user,
                barber,
                error: 'من فضلك اكتب اسم الحلاق'
            });
        }

        const salary = Number(basicSalary);

        if (
            basicSalary === undefined ||
            basicSalary === '' ||
            Number.isNaN(salary) ||
            salary < 0
        ) {
            return res.render('admin/barber-form', {
                user: req.session.user,
                barber,
                error: 'من فضلك اكتب مرتب صحيح'
            });
        }

        if (!startDate) {
            return res.render('admin/barber-form', {
                user: req.session.user,
                barber,
                error: 'من فضلك اختر تاريخ بداية العمل'
            });
        }

        await db.query(`
            INSERT INTO Barbers
            (
                Name,
                BasicSalary,
                IsActive,
                UserId,
                StartDate,
                WorksFriday,
                WorksMonday,
                WorksSaturday,
                WorksSunday,
                WorksThursday,
                WorksTuesday,
                WorksWednesday
            )
            VALUES (?, ?, 1, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name.trim(),
            salary,
            `${startDate} 00:00:00`,
            toBool(friday),
            toBool(monday),
            toBool(saturday),
            toBool(sunday),
            toBool(thursday),
            toBool(tuesday),
            toBool(wednesday)
        ]);

        res.redirect('/admin/barbers');
    } catch (error) {
        console.error('Create barber error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء إضافة الحلاق</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// EDIT PAGE
// =========================

async function editPage(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).send('رقم الحلاق غير صحيح');
        }

        const barber = await getBarber(id);

        if (!barber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        barber.StartDate = formatDateForInput(barber.StartDate);

        const [bonuses] = await db.query(`
            SELECT Id, BarberId, Amount, Reason, Date
            FROM BarberBonuses
            WHERE BarberId = ?
            ORDER BY Date DESC, Id DESC
        `, [id]);

        const [penalties] = await db.query(`
            SELECT Id, BarberId, Amount, Reason, Date
            FROM BarberPenalties
            WHERE BarberId = ?
            ORDER BY Date DESC, Id DESC
        `, [id]);

        const [advances] = await db.query(`
            SELECT Id, BarberId, Amount, Reason, Date
            FROM BarberAdvances
            WHERE BarberId = ?
            ORDER BY Date DESC, Id DESC
        `, [id]);

        barber.Bonuses = bonuses;
        barber.Penalties = penalties;
        barber.Advances = advances;

        res.render('admin/barber-edit', {
            user: req.session.user,
            barber,
            error: null
        });
    } catch (error) {
        console.error('Edit barber page error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل بيانات الحلاق</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// UPDATE
// =========================

async function update(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).send('رقم الحلاق غير صحيح');
        }

        const existingBarber = await getBarber(id);

        if (!existingBarber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        const {
            name,
            basicSalary,
            startDate,
            saturday,
            sunday,
            monday,
            tuesday,
            wednesday,
            thursday,
            friday
        } = req.body;

        const barber = {
            ...existingBarber,
            Name: name || '',
            BasicSalary: basicSalary !== undefined
                ? basicSalary
                : existingBarber.BasicSalary,
            StartDate: startDate || formatDateForInput(existingBarber.StartDate),
            WorksSaturday: toBool(saturday),
            WorksSunday: toBool(sunday),
            WorksMonday: toBool(monday),
            WorksTuesday: toBool(tuesday),
            WorksWednesday: toBool(wednesday),
            WorksThursday: toBool(thursday),
            WorksFriday: toBool(friday)
        };

        if (!name || !name.trim()) {
            return res.render('admin/barber-form', {
                user: req.session.user,
                barber,
                error: 'من فضلك اكتب اسم الحلاق'
            });
        }

        const salary = Number(basicSalary);

        if (
            basicSalary === undefined ||
            basicSalary === '' ||
            Number.isNaN(salary) ||
            salary < 0
        ) {
            return res.render('admin/barber-form', {
                user: req.session.user,
                barber,
                error: 'من فضلك اكتب مرتب صحيح'
            });
        }

        if (!startDate) {
            return res.render('admin/barber-form', {
                user: req.session.user,
                barber,
                error: 'من فضلك اختر تاريخ بداية العمل'
            });
        }

        await db.query(`
            UPDATE Barbers
            SET
                Name = ?,
                BasicSalary = ?,
                StartDate = ?,
                WorksFriday = ?,
                WorksMonday = ?,
                WorksSaturday = ?,
                WorksSunday = ?,
                WorksThursday = ?,
                WorksTuesday = ?,
                WorksWednesday = ?
            WHERE Id = ?
        `, [
            name.trim(),
            salary,
            `${startDate} 00:00:00`,
            toBool(friday),
            toBool(monday),
            toBool(saturday),
            toBool(sunday),
            toBool(thursday),
            toBool(tuesday),
            toBool(wednesday),
            id
        ]);

        res.redirect('/admin/barbers');
    } catch (error) {
        console.error('Update barber error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تعديل الحلاق</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// TOGGLE ACTIVE
// =========================

async function toggle(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).send('رقم الحلاق غير صحيح');
        }

        const barber = await getBarber(id);

        if (!barber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        await db.query(`
            UPDATE Barbers
            SET IsActive = NOT IsActive
            WHERE Id = ?
        `, [id]);

        res.redirect('/admin/barbers');
    } catch (error) {
        console.error('Toggle barber error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تغيير حالة الحلاق</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// ADD BONUS
// =========================

async function addBonus(req, res) {
    try {
        const barberId = Number(req.params.id);
        const amount = Number(req.body.amount);
        const reason = (req.body.reason || '').trim();
        const date = req.body.date;

        if (!Number.isInteger(barberId) || barberId <= 0) {
            return res.status(400).send('رقم الحلاق غير صحيح');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).send('قيمة المكافأة غير صحيحة');
        }

        if (!reason || !date) {
            return res.status(400).send('السبب والتاريخ مطلوبان');
        }

        const barber = await getBarber(barberId);

        if (!barber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        await db.query(`
            INSERT INTO BarberBonuses (BarberId, Amount, Reason, Date)
            VALUES (?, ?, ?, ?)
        `, [barberId, amount, reason, `${date} 00:00:00`]);

        res.redirect(`/admin/barbers/edit/${barberId}`);
    } catch (error) {
        console.error('Add bonus error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء إضافة المكافأة</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// ADD PENALTY
// =========================

async function addPenalty(req, res) {
    try {
        const barberId = Number(req.params.id);
        const amount = Number(req.body.amount);
        const reason = (req.body.reason || '').trim();
        const date = req.body.date;

        if (!Number.isInteger(barberId) || barberId <= 0) {
            return res.status(400).send('رقم الحلاق غير صحيح');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).send('قيمة الجزاء غير صحيحة');
        }

        if (!reason || !date) {
            return res.status(400).send('السبب والتاريخ مطلوبان');
        }

        const barber = await getBarber(barberId);

        if (!barber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        await db.query(`
            INSERT INTO BarberPenalties (BarberId, Amount, Reason, Date)
            VALUES (?, ?, ?, ?)
        `, [barberId, amount, reason, `${date} 00:00:00`]);

        res.redirect(`/admin/barbers/edit/${barberId}`);
    } catch (error) {
        console.error('Add penalty error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء إضافة الجزاء</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// ADD ADVANCE
// =========================

async function addAdvance(req, res) {
    try {
        const barberId = Number(req.params.id);
        const amount = Number(req.body.amount);
        const reason = (req.body.reason || '').trim();
        const date = req.body.date;

        if (!Number.isInteger(barberId) || barberId <= 0) {
            return res.status(400).send('رقم الحلاق غير صحيح');
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).send('قيمة السلفة غير صحيحة');
        }

        if (!reason || !date) {
            return res.status(400).send('السبب والتاريخ مطلوبان');
        }

        const barber = await getBarber(barberId);

        if (!barber) {
            return res.status(404).send('الحلاق غير موجود');
        }

        await db.query(`
            INSERT INTO BarberAdvances (BarberId, Amount, Reason, Date)
            VALUES (?, ?, ?, ?)
        `, [barberId, amount, reason, `${date} 00:00:00`]);

        res.redirect(`/admin/barbers/edit/${barberId}`);
    } catch (error) {
        console.error('Add advance error:', error);
        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء إضافة السلفة</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =========================
// EXPORTS
// =========================

module.exports = {
    index,
    createPage,
    create,
    editPage,
    update,
    toggle,
    addBonus,
    addPenalty,
    addAdvance
};
