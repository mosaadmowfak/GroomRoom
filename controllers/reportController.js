const db = require('../config/db');


function getPeriod(period, dateFrom, dateTo) {

    const today = new Date();

    let from;
    let to;
    let title;

    if (period === 'custom' && dateFrom && dateTo) {

        from = new Date(`${dateFrom}T00:00:00`);

        to = new Date(`${dateTo}T00:00:00`);
        to.setDate(to.getDate() + 1);

        title = `تقرير من ${dateFrom} إلى ${dateTo}`;

        return {
            from,
            to,
            title
        };
    }

    switch (period) {

        case 'week': {

            const day = today.getDay();

            // Sunday = 0
            // Monday = 1
            // ...
            // Saturday = 6

            const daysFromMonday = day === 0 ? 6 : day - 1;

            from = new Date(today);

            from.setDate(
                today.getDate() - daysFromMonday
            );

            from.setHours(0, 0, 0, 0);

            to = new Date(today);

            to.setDate(today.getDate() + 1);

            to.setHours(0, 0, 0, 0);

            title = 'تقرير الأسبوع';

            break;
        }

        case 'month':

            from = new Date(
                today.getFullYear(),
                today.getMonth(),
                1
            );

            from.setHours(0, 0, 0, 0);

            to = new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                1
            );

            to.setHours(0, 0, 0, 0);

            title = 'تقرير الشهر';

            break;

        case 'year':

            from = new Date(
                today.getFullYear(),
                0,
                1
            );

            from.setHours(0, 0, 0, 0);

            to = new Date(
                today.getFullYear() + 1,
                0,
                1
            );

            to.setHours(0, 0, 0, 0);

            title = 'تقرير السنة';

            break;

        case 'day':
        default:

            from = new Date(today);

            from.setHours(0, 0, 0, 0);

            to = new Date(from);

            to.setDate(to.getDate() + 1);

            title = 'تقرير اليوم';

            break;
    }

    return {
        from,
        to,
        title
    };
}


function formatDateForInput(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
        date.getDate()
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}


function formatDateForMySQL(date) {

    const year = date.getFullYear();

    const month = String(
        date.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
        date.getDate()
    ).padStart(2, '0');

    const hours = String(
        date.getHours()
    ).padStart(2, '0');

    const minutes = String(
        date.getMinutes()
    ).padStart(2, '0');

    const seconds = String(
        date.getSeconds()
    ).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


async function index(req, res) {

    try {

        const period =
            req.query.period || 'day';

        const dateFrom =
            req.query.dateFrom || '';

        const dateTo =
            req.query.dateTo || '';

        const {
            from,
            to,
            title
        } = getPeriod(
            period,
            dateFrom,
            dateTo
        );

        const fromSql =
            formatDateForMySQL(from);

        const toSql =
            formatDateForMySQL(to);


        /*
        ==================================================
        SALES
        ==================================================
        */

        const [[sales]] = await db.query(
            `
            SELECT
                COALESCE(SUM(TotalAmount), 0) AS TotalSales,
                COUNT(*) AS InvoiceCount,

                COALESCE(
                    SUM(
                        CASE
                            WHEN PaymentMethod = 'Cash'
                            THEN TotalAmount
                            ELSE 0
                        END
                    ),
                    0
                ) AS CashSales,

                COALESCE(
                    SUM(
                        CASE
                            WHEN PaymentMethod = 'Card'
                            THEN TotalAmount
                            ELSE 0
                        END
                    ),
                    0
                ) AS CardSales,

                COALESCE(
                    SUM(
                        CASE
                            WHEN PaymentMethod = 'Wallet'
                            THEN TotalAmount
                            ELSE 0
                        END
                    ),
                    0
                ) AS WalletSales

            FROM Invoices

            WHERE CreatedAt >= ?
              AND CreatedAt < ?
            `,
            [
                fromSql,
                toSql
            ]
        );


        /*
        ==================================================
        BONUSES
        ==================================================
        */

        const [[bonusResult]] = await db.query(
            `
            SELECT
                COALESCE(SUM(Amount), 0) AS Total

            FROM BarberBonuses

            WHERE Date >= ?
              AND Date < ?
            `,
            [
                fromSql,
                toSql
            ]
        );


        /*
        ==================================================
        PENALTIES
        ==================================================
        */

        const [[penaltyResult]] = await db.query(
            `
            SELECT
                COALESCE(SUM(Amount), 0) AS Total

            FROM BarberPenalties

            WHERE Date >= ?
              AND Date < ?
            `,
            [
                fromSql,
                toSql
            ]
        );


        /*
        ==================================================
        ADVANCES
        ==================================================
        */

        const [[advanceResult]] = await db.query(
            `
            SELECT
                COALESCE(SUM(Amount), 0) AS Total

            FROM BarberAdvances

            WHERE Date >= ?
              AND Date < ?
            `,
            [
                fromSql,
                toSql
            ]
        );


        /*
        ==================================================
        EXPENSES
        ==================================================
        */

        const [[expenseResult]] = await db.query(
            `
            SELECT
                COALESCE(SUM(Amount), 0) AS Total

            FROM DailyExpenses

            WHERE Date >= ?
              AND Date < ?
            `,
            [
                fromSql,
                toSql
            ]
        );


        /*
        ==================================================
        TOTALS
        ==================================================
        */

        const totalSales =
            Number(sales.TotalSales || 0);

        const totalInvoices =
            Number(sales.InvoiceCount || 0);

        const cashSales =
            Number(sales.CashSales || 0);

        const cardSales =
            Number(sales.CardSales || 0);

        const walletSales =
            Number(sales.WalletSales || 0);

        const totalBonuses =
            Number(
                bonusResult.Total || 0
            );

        const totalPenalties =
            Number(
                penaltyResult.Total || 0
            );

        const totalAdvances =
            Number(
                advanceResult.Total || 0
            );

        const totalExpenses =
            Number(
                expenseResult.Total || 0
            );


        const netIncome =
            totalSales -
            totalBonuses -
            totalPenalties -
            totalExpenses -
            totalAdvances;


        /*
        ==================================================
        BARBER REPORT
        ==================================================
        */

        const [barberSales] =
            await db.query(
                `
                SELECT

                    b.Id AS BarberId,

                    b.Name AS BarberName,

                    COUNT(i.Id) AS InvoiceCount,

                    COALESCE(
                        SUM(i.TotalAmount),
                        0
                    ) AS TotalSales,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN i.PaymentMethod = 'Cash'
                                THEN i.TotalAmount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS CashSales,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN i.PaymentMethod = 'Card'
                                THEN i.TotalAmount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS CardSales,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN i.PaymentMethod = 'Wallet'
                                THEN i.TotalAmount
                                ELSE 0
                            END
                        ),
                        0
                    ) AS WalletSales

                FROM Barbers b

                LEFT JOIN Invoices i
                    ON i.BarberId = b.Id
                    AND i.CreatedAt >= ?
                    AND i.CreatedAt < ?

                GROUP BY
                    b.Id,
                    b.Name

                ORDER BY
                    TotalSales DESC,
                    b.Name
                `,
                [
                    fromSql,
                    toSql
                ]
            );


        /*
        ==================================================
        INVOICES REPORT
        ==================================================
        */

        const [invoices] =
            await db.query(
                `
                SELECT

                    i.Id,

                    i.InvoiceNumber,

                    i.CreatedAt,

                    i.TotalAmount,

                    i.PaymentMethod,

                    b.Name AS BarberName

                FROM Invoices i

                INNER JOIN Barbers b
                    ON b.Id = i.BarberId

                WHERE i.CreatedAt >= ?
                  AND i.CreatedAt < ?

                ORDER BY
                    i.CreatedAt DESC
                `,
                [
                    fromSql,
                    toSql
                ]
            );


        /*
        ==================================================
        RENDER
        ==================================================
        */

        res.render(
            'admin/reports',
            {

                user: req.session.user,

                period,

                title,

                dateFrom:
                    period === 'custom'
                        ? dateFrom
                        : formatDateForInput(from),

                dateTo:
                    period === 'custom'
                        ? dateTo
                        : formatDateForInput(
                            new Date(
                                to.getTime() - 86400000
                            )
                        ),

                totalSales,

                totalInvoices,

                cashSales,

                cardSales,

                walletSales,

                totalBonuses,

                totalPenalties,

                totalAdvances,

                totalExpenses,

                netIncome,

                barberSales,

                invoices
            }
        );

    } catch (error) {

        console.error(
            'Reports error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل التقارير
            </h2>

            <pre>
${error.message}
            </pre>
        `);
    }
}


module.exports = {
    index
};