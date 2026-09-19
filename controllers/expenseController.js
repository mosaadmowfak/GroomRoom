const db = require('../config/db');


// GET /admin/expenses
async function index(req, res) {
    try {

        const { dateFrom, dateTo } = req.query;

        let where = [];
        let params = [];

        if (dateFrom) {
            where.push(`Date >= ?`);
            params.push(`${dateFrom} 00:00:00`);
        }

        if (dateTo) {
            where.push(`Date < DATE_ADD(?, INTERVAL 1 DAY)`);
            params.push(`${dateTo} 00:00:00`);
        }

        const whereClause = where.length
            ? `WHERE ${where.join(' AND ')}`
            : '';

        const [expenses] = await db.query(`
            SELECT
                Id,
                Amount,
                Reason,
                Date
            FROM DailyExpenses
            ${whereClause}
            ORDER BY Date DESC
        `, params);


        const totalExpenses = expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.Amount || 0),
            0
        );


        res.render('admin/expenses', {

            user: req.session.user,

            expenses,

            dateFrom: dateFrom || '',

            dateTo: dateTo || '',

            totalExpenses

        });

    } catch (error) {

        console.error(
            'Expenses page error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل المصروفات
            </h2>

            <pre>
${error.message}
            </pre>
        `);
    }
}


// POST /admin/expenses/add
async function addExpense(req, res) {

    try {

        const {
            amount,
            reason,
            date
        } = req.body;

        const expenseAmount =
            Number(amount);


        if (
            Number.isNaN(expenseAmount) ||
            expenseAmount <= 0
        ) {
            return res.status(400).send(
                'قيمة المصروف غير صحيحة'
            );
        }


        if (!date) {
            return res.status(400).send(
                'التاريخ مطلوب'
            );
        }


        await db.query(`
            INSERT INTO DailyExpenses
            (
                Amount,
                Reason,
                Date
            )
            VALUES
            (?, ?, ?)
        `, [
            expenseAmount,
            reason || '',
            `${date} 00:00:00`
        ]);


        res.redirect('/admin/expenses');

    } catch (error) {

        console.error(
            'Add expense error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء إضافة المصروف
            </h2>

            <pre>
${error.message}
            </pre>
        `);
    }
}


module.exports = {
    index,
    addExpense
};