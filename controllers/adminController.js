const db = require('../config/db');


/*
==================================================
HELPERS
==================================================
*/

function getTodayStart() {

    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

}


function getTomorrowStart() {

    const today = getTodayStart();

    const tomorrow = new Date(today);

    tomorrow.setDate(
        tomorrow.getDate() + 1
    );

    return tomorrow;

}


function getWeekStart() {

    const today = getTodayStart();

    const day = today.getDay();

    /*
    JavaScript:
    Sunday = 0
    Monday = 1
    */

    const diff =
        day === 0
            ? -6
            : 1 - day;

    const monday = new Date(today);

    monday.setDate(
        monday.getDate() + diff
    );

    return monday;

}


function getMonthStart() {

    const today = getTodayStart();

    return new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

}


function getNextMonthStart() {

    const today = getTodayStart();

    return new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        1
    );

}


function getYearStart() {

    const today = getTodayStart();

    return new Date(
        today.getFullYear(),
        0,
        1
    );

}


function getNextYearStart() {

    const today = getTodayStart();

    return new Date(
        today.getFullYear() + 1,
        0,
        1
    );

}


/*
==================================================
ADMIN DASHBOARD
==================================================
*/

async function index(req, res) {

    try {

        /*
        ------------------------------------------
        OPEN BUSINESS DAY
        ------------------------------------------
        */

        const [[businessDay]] =
            await db.query(`
                SELECT *
                FROM BusinessDays
                WHERE IsOpen = 1
                ORDER BY Id DESC
                LIMIT 1
            `);


        const today =
            getTodayStart();

        const tomorrow =
            getTomorrowStart();

        const weekStart =
            getWeekStart();

        const monthStart =
            getMonthStart();

        const nextMonthStart =
            getNextMonthStart();

        const yearStart =
            getYearStart();

        const nextYearStart =
            getNextYearStart();


        /*
        ==================================================
        TODAY SALES
        ==================================================

        Sales are connected to the currently
        opened Business Day.
        */

        let todaySales = 0;

        let todayInvoices = 0;


        if (businessDay) {

            const [[result]] =
                await db.query(`
                    SELECT
                        COALESCE(
                            SUM(TotalAmount),
                            0
                        ) AS TodaySales,

                        COUNT(*) AS TodayInvoices

                    FROM Invoices

                    WHERE BusinessDayId = ?
                `, [
                    businessDay.Id
                ]);


            todaySales =
                Number(result.TodaySales) || 0;

            todayInvoices =
                Number(result.TodayInvoices) || 0;

        }


        /*
        ==================================================
        TODAY BONUSES
        ==================================================
        */

        const [[bonusResult]] =
            await db.query(`
                SELECT
                    COALESCE(
                        SUM(Amount),
                        0
                    ) AS Total

                FROM BarberBonuses

                WHERE Date >= ?
                  AND Date < ?
            `, [
                today,
                tomorrow
            ]);


        const todayBonuses =
            Number(bonusResult.Total) || 0;


        /*
        ==================================================
        TODAY EXPENSES
        ==================================================
        */

        const [[expenseResult]] =
            await db.query(`
                SELECT
                    COALESCE(
                        SUM(Amount),
                        0
                    ) AS Total

                FROM DailyExpenses

                WHERE Date >= ?
                  AND Date < ?
            `, [
                today,
                tomorrow
            ]);


        const todayExpenses =
            Number(expenseResult.Total) || 0;


        /*
        ==================================================
        TODAY ADVANCES
        ==================================================
        */

        const [[advanceResult]] =
            await db.query(`
                SELECT
                    COALESCE(
                        SUM(Amount),
                        0
                    ) AS Total

                FROM BarberAdvances

                WHERE Date >= ?
                  AND Date < ?
            `, [
                today,
                tomorrow
            ]);


        const todayAdvances =
            Number(advanceResult.Total) || 0;


        /*
        ==================================================
        TODAY NET INCOME
        ==================================================
        */

        const todayNetIncome =
            todaySales
            - todayBonuses
            - todayExpenses
            - todayAdvances;


        /*
        ==================================================
        WEEK
        ==================================================
        */

        const [[weekResult]] =
            await db.query(`
                SELECT

                    COALESCE(
                        SUM(TotalAmount),
                        0
                    ) AS Sales,

                    COUNT(*) AS Invoices

                FROM Invoices

                WHERE BusinessDate >= ?
                  AND BusinessDate < ?
            `, [
                weekStart,
                tomorrow
            ]);


        const weekSales =
            Number(weekResult.Sales) || 0;

        const weekInvoices =
            Number(weekResult.Invoices) || 0;


        /*
        ==================================================
        MONTH
        ==================================================
        */

        const [[monthResult]] =
            await db.query(`
                SELECT

                    COALESCE(
                        SUM(TotalAmount),
                        0
                    ) AS Sales,

                    COUNT(*) AS Invoices

                FROM Invoices

                WHERE BusinessDate >= ?
                  AND BusinessDate < ?
            `, [
                monthStart,
                nextMonthStart
            ]);


        const monthSales =
            Number(monthResult.Sales) || 0;

        const monthInvoices =
            Number(monthResult.Invoices) || 0;


        /*
        ==================================================
        YEAR
        ==================================================
        */

        const [[yearResult]] =
            await db.query(`
                SELECT

                    COALESCE(
                        SUM(TotalAmount),
                        0
                    ) AS Sales,

                    COUNT(*) AS Invoices

                FROM Invoices

                WHERE BusinessDate >= ?
                  AND BusinessDate < ?
            `, [
                yearStart,
                nextYearStart
            ]);


        const yearSales =
            Number(yearResult.Sales) || 0;

        const yearInvoices =
            Number(yearResult.Invoices) || 0;


        /*
        ==================================================
        BARBER SALES
        ==================================================
        */

        const [barberSales] =
            await db.query(`
                SELECT

                    b.Name AS BarberName,

                    COUNT(i.Id) AS InvoiceCount,

                    COALESCE(
                        SUM(i.TotalAmount),
                        0
                    ) AS TotalSales

                FROM Barbers b

                LEFT JOIN Invoices i
                    ON i.BarberId = b.Id
                    AND i.BusinessDate >= ?
                    AND i.BusinessDate < ?

                GROUP BY
                    b.Id,
                    b.Name

                ORDER BY
                    TotalSales DESC
            `, [
                monthStart,
                nextMonthStart
            ]);


        /*
        ==================================================
        RENDER DASHBOARD
        ==================================================
        */

        res.render(
            'admin/index',
            {

                user:
                    req.session.user,

                businessDay,

                todaySales,

                todayInvoices,

                todayBonuses,

                todayExpenses,

                todayAdvances,

                todayNetIncome,

                weekSales,

                weekInvoices,

                monthSales,

                monthInvoices,

                yearSales,

                yearInvoices,

                barberSales

            }
        );


    } catch (error) {

        console.error(
            'Admin dashboard error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل لوحة التحكم
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
BUSINESS DAY
==================================================
*/

async function businessDay(req, res) {

    try {

        const [[openDay]] =
            await db.query(`
                SELECT *
                FROM BusinessDays
                WHERE IsOpen = 1
                ORDER BY Id DESC
                LIMIT 1
            `);


        const [days] =
            await db.query(`
                SELECT *
                FROM BusinessDays
                ORDER BY Id DESC
                LIMIT 30
            `);


        res.render(
            'admin/business-day',
            {

                user:
                    req.session.user,

                openDay,

                days,

                error: null,

                success: null

            }
        );


    } catch (error) {

        console.error(
            'Business day page error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل يوم العمل
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
OPEN BUSINESS DAY
==================================================
*/

async function openBusinessDay(req, res) {

    try {

        const {
            businessDate
        } = req.body;


        if (!businessDate) {

            return res.redirect(
                '/admin/business-day'
            );

        }


        /*
        ------------------------------------------
        CHECK EXISTING OPEN DAY
        ------------------------------------------
        */

        const [[openDay]] =
            await db.query(`
                SELECT Id
                FROM BusinessDays
                WHERE IsOpen = 1
                LIMIT 1
            `);


        if (openDay) {

            return res.render(
                'admin/business-day',
                {

                    user:
                        req.session.user,

                    openDay,

                    days:
                        await getBusinessDays(),

                    error:
                        'يوجد يوم عمل مفتوح بالفعل. يجب قفله أولاً.',

                    success:
                        null

                }
            );

        }


        /*
        ------------------------------------------
        CHECK DUPLICATE DATE
        ------------------------------------------
        */

        const [[existingDay]] =
            await db.query(`
                SELECT
                    Id,
                    IsOpen

                FROM BusinessDays

                WHERE DATE(BusinessDate) = ?

                LIMIT 1
            `, [
                businessDate
            ]);


        if (existingDay) {

            return res.render(
                'admin/business-day',
                {

                    user:
                        req.session.user,

                    openDay:
                        null,

                    days:
                        await getBusinessDays(),

                    error:
                        'تاريخ يوم العمل ده موجود بالفعل.',

                    success:
                        null

                }
            );

        }


        /*
        ------------------------------------------
        CREATE BUSINESS DAY
        ------------------------------------------
        */

        await db.query(`
            INSERT INTO BusinessDays
            (
                BusinessDate,
                OpenedAt,
                ClosedAt,
                IsOpen
            )
            VALUES
            (
                ?,
                NOW(),
                NULL,
                1
            )
        `, [
            `${businessDate} 00:00:00`
        ]);


        res.redirect(
            '/admin/business-day'
        );


    } catch (error) {

        console.error(
            'Open business day error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء فتح يوم العمل
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
CLOSE BUSINESS DAY
==================================================
*/

async function closeBusinessDay(req, res) {

    try {

        const [[openDay]] =
            await db.query(`
                SELECT Id
                FROM BusinessDays
                WHERE IsOpen = 1
                ORDER BY Id DESC
                LIMIT 1
            `);


        if (!openDay) {

            return res.redirect(
                '/admin'
            );

        }


        await db.query(`
            UPDATE BusinessDays

            SET
                IsOpen = 0,
                ClosedAt = NOW()

            WHERE Id = ?
        `, [
            openDay.Id
        ]);


        res.redirect(
            '/admin'
        );


    } catch (error) {

        console.error(
            'Close business day error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء قفل يوم العمل
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
GET BUSINESS DAYS
==================================================
*/

async function getBusinessDays() {

    const [days] =
        await db.query(`
            SELECT *
            FROM BusinessDays
            ORDER BY Id DESC
            LIMIT 30
        `);

    return days;

}


/*
==================================================
INVOICES
==================================================
*/

async function invoices(req, res) {

    try {

        const {
            dateFrom,
            dateTo,
            barberId
        } = req.query;


        let where = [];

        let params = [];


        if (dateFrom) {

            where.push(
                `i.BusinessDate >= ?`
            );

            params.push(
                `${dateFrom} 00:00:00`
            );

        }


        if (dateTo) {

            where.push(
                `i.BusinessDate < DATE_ADD(?, INTERVAL 1 DAY)`
            );

            params.push(
                `${dateTo} 00:00:00`
            );

        }


        if (barberId) {

            where.push(
                `i.BarberId = ?`
            );

            params.push(
                Number(barberId)
            );

        }


        const whereClause =
            where.length
                ? `WHERE ${where.join(' AND ')}`
                : '';


        const [invoiceRows] =
            await db.query(`
                SELECT

                    i.Id,

                    i.InvoiceNumber,

                    i.CreatedAt,

                    i.BusinessDate,

                    i.TotalAmount,

                    i.PaymentMethod,

                    i.BarberId,

                    b.Name AS BarberName

                FROM Invoices i

                INNER JOIN Barbers b
                    ON b.Id = i.BarberId

                ${whereClause}

                ORDER BY
                    i.BusinessDate DESC,
                    i.Id DESC
            `, params);


        const [barbers] =
            await db.query(`
                SELECT
                    Id,
                    Name
                FROM Barbers
                WHERE IsActive = 1
                ORDER BY Name
            `);


        const totalInvoices =
            invoiceRows.length;


        const totalSales =
            invoiceRows.reduce(
                (sum, invoice) =>
                    sum +
                    Number(
                        invoice.TotalAmount || 0
                    ),
                0
            );


        res.render(
            'admin/invoices',
            {

                user:
                    req.session.user,

                invoices:
                    invoiceRows,

                barbers,

                dateFrom:
                    dateFrom || '',

                dateTo:
                    dateTo || '',

                barberId:
                    barberId || '',

                totalInvoices,

                totalSales

            }
        );


    } catch (error) {

        console.error(
            'Invoices page error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل الفواتير
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
INVOICE DETAILS
==================================================
*/

async function invoiceDetails(req, res) {

    try {

        const id =
            Number(req.params.id);


        if (!Number.isInteger(id)) {

            return res
                .status(400)
                .send(
                    'رقم الفاتورة غير صحيح'
                );

        }


        const [[invoice]] =
            await db.query(`
                SELECT

                    i.Id,

                    i.InvoiceNumber,

                    i.CreatedAt,

                    i.BusinessDate,

                    i.TotalAmount,

                    i.PaymentMethod,

                    i.BarberId,

                    b.Name AS BarberName

                FROM Invoices i

                INNER JOIN Barbers b
                    ON b.Id = i.BarberId

                WHERE i.Id = ?

                LIMIT 1
            `, [
                id
            ]);


        if (!invoice) {

            return res
                .status(404)
                .send(
                    'الفاتورة غير موجودة'
                );

        }


        const [items] =
            await db.query(`
                SELECT

                    ii.Id,

                    ii.Price,

                    ii.ServiceId,

                    s.Name AS ServiceName

                FROM InvoiceItems ii

                INNER JOIN Services s
                    ON s.Id = ii.ServiceId

                WHERE ii.InvoiceId = ?

                ORDER BY ii.Id
            `, [
                id
            ]);


        res.render(
            'admin/invoice-details',
            {

                user:
                    req.session.user,

                invoice,

                items

            }
        );


    } catch (error) {

        console.error(
            'Invoice details error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل تفاصيل الفاتورة
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
EXPORTS
==================================================
*/

module.exports = {

    index,

    businessDay,

    openBusinessDay,

    closeBusinessDay,

    invoices,

    invoiceDetails

};