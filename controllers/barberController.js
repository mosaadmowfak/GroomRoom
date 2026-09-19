const db = require('../config/db');

async function index(req, res) {
    try {
        res.render('barber/index', {
            user: req.session.user
        });

    } catch (error) {
        console.error('Barber dashboard error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل لوحة الحلاق</h2>
            <pre>${error.message}</pre>
        `);
    }
}

async function newHaircut(req, res) {
    try {
        const [barbers] = await db.query(`
            SELECT *
            FROM Barbers
            WHERE IsActive = 1
            ORDER BY Name
        `);

        const [services] = await db.query(`
            SELECT *
            FROM Services
            WHERE IsActive = 1
            ORDER BY Category, Name
        `);

        res.render('barber/new-haircut', {
            user: req.session.user,
            barbers,
            services,
            model: {
                BarberId: '',
                ServiceIds: [],
                PaymentMethod: 'Cash'
            },
            errors: []
        });

    } catch (error) {
        console.error('New haircut page error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل صفحة الحلاقة الجديدة</h2>
            <pre>${error.message}</pre>
        `);
    }
}

async function createHaircut(req, res) {
    try {
        const barberId = Number(req.body.BarberId);

        let serviceIds = req.body.ServiceIds || [];

        if (!Array.isArray(serviceIds)) {
            serviceIds = [serviceIds];
        }

        serviceIds = serviceIds
            .map(id => Number(id))
            .filter(id => Number.isInteger(id) && id > 0);

        serviceIds = [...new Set(serviceIds)];

        const paymentMethod = req.body.PaymentMethod;

        const errors = [];

        // =====================================================
        // Validate Payment Method
        // =====================================================

        const allowedPaymentMethods = [
            'Cash',
            'Card',
            'Wallet'
        ];

        if (!allowedPaymentMethods.includes(paymentMethod)) {
            errors.push('طريقة الدفع غير صحيحة.');
        }

        // =====================================================
        // Check Open Business Day
        // =====================================================

        const [[businessDay]] = await db.query(`
            SELECT *
            FROM BusinessDays
            WHERE IsOpen = 1
            ORDER BY Id DESC
            LIMIT 1
        `);

        if (!businessDay) {
            errors.push(
                'لا يوجد يوم عمل مفتوح حاليًا. برجاء انتظار Admin لفتح يوم العمل.'
            );
        }

        // =====================================================
        // Validate Barber
        // =====================================================

        const [[barber]] = await db.query(`
            SELECT *
            FROM Barbers
            WHERE Id = ?
              AND IsActive = 1
            LIMIT 1
        `, [barberId]);

        if (!barber) {
            errors.push('برجاء اختيار حلاق صحيح.');
        }

        // =====================================================
        // Validate Services
        // =====================================================

        if (serviceIds.length === 0) {
            errors.push('برجاء اختيار خدمة واحدة على الأقل.');
        }

        let services = [];

        if (serviceIds.length > 0) {

            const placeholders = serviceIds
                .map(() => '?')
                .join(',');

            const [serviceRows] = await db.query(`
                SELECT *
                FROM Services
                WHERE Id IN (${placeholders})
                  AND IsActive = 1
            `, serviceIds);

            services = serviceRows;

            if (services.length !== serviceIds.length) {
                errors.push('برجاء اختيار خدمات صحيحة.');
            }
        }

        // =====================================================
        // Return View If Validation Failed
        // =====================================================

        if (errors.length > 0) {

            const [barbers] = await db.query(`
                SELECT *
                FROM Barbers
                WHERE IsActive = 1
                ORDER BY Name
            `);

            const [allServices] = await db.query(`
                SELECT *
                FROM Services
                WHERE IsActive = 1
                ORDER BY Category, Name
            `);

            return res.render('barber/new-haircut', {
                user: req.session.user,
                barbers,
                services: allServices,
                model: {
                    BarberId: barberId || '',
                    ServiceIds: serviceIds,
                    PaymentMethod: paymentMethod || 'Cash'
                },
                errors
            });
        }

        // =====================================================
        // Calculate Total From Database
        // =====================================================

        const totalAmount = services.reduce(
            (total, service) => total + Number(service.Price),
            0
        );

        // =====================================================
        // Create Invoice
        // =====================================================

        const connection = await db.getConnection();

        try {

            await connection.beginTransaction();

            // Re-check open Business Day inside transaction
            const [[currentBusinessDay]] = await connection.query(`
                SELECT *
                FROM BusinessDays
                WHERE IsOpen = 1
                ORDER BY Id DESC
                LIMIT 1
                FOR UPDATE
            `);

            if (!currentBusinessDay) {

                await connection.rollback();

                return res.render('barber/new-haircut', {
                    user: req.session.user,
                    barbers: await getActiveBarbers(connection),
                    services: await getActiveServices(connection),
                    model: {
                        BarberId: barberId || '',
                        ServiceIds: serviceIds,
                        PaymentMethod: paymentMethod || 'Cash'
                    },
                    errors: [
                        'لا يوجد يوم عمل مفتوح حاليًا. برجاء انتظار Admin لفتح يوم العمل.'
                    ]
                });
            }

            const now = new Date();

            // Temporary invoice number
            const temporaryInvoiceNumber =
                `TEMP-${Date.now()}-${Math.random()
                    .toString(36)
                    .substring(2, 10)}`;

            const [invoiceResult] = await connection.query(`
                INSERT INTO Invoices
                (
                    InvoiceNumber,
                    BarberId,
                    TotalAmount,
                    PaymentMethod,
                    CreatedAt,
                    BusinessDate,
                    BusinessDayId
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            `, [
                temporaryInvoiceNumber,
                barber.Id,
                totalAmount,
                paymentMethod,
                now,
                currentBusinessDay.BusinessDate,
                currentBusinessDay.Id
            ]);

            const invoiceId = invoiceResult.insertId;

            // =====================================================
            // Add Invoice Items
            // =====================================================

            for (const service of services) {

                await connection.query(`
                    INSERT INTO InvoiceItems
                    (
                        InvoiceId,
                        ServiceId,
                        Price
                    )
                    VALUES
                    (
                        ?,
                        ?,
                        ?
                    )
                `, [
                    invoiceId,
                    service.Id,
                    service.Price
                ]);
            }

            // =====================================================
            // Generate Final Invoice Number
            // =====================================================

            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');

            const invoiceNumber =
                `GR-${year}${month}${day}-${String(invoiceId).padStart(6, '0')}`;

            await connection.query(`
                UPDATE Invoices
                SET InvoiceNumber = ?
                WHERE Id = ?
            `, [
                invoiceNumber,
                invoiceId
            ]);

            await connection.commit();

            // =====================================================
            // Show Invoice
            // =====================================================

            return res.redirect(`/barber/invoice/${invoiceId}`);

        } catch (transactionError) {

            await connection.rollback();

            throw transactionError;

        } finally {

            connection.release();
        }

    } catch (error) {

        console.error('Create haircut error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تسجيل الحلاقة</h2>
            <pre>${error.message}</pre>
        `);
    }
}

async function invoice(req, res) {
    try {

        const invoiceId = Number(req.params.id);

        if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
            return res.status(404).send('Invoice not found');
        }

        const [[invoice]] = await db.query(`
            SELECT
                i.*,
                b.Name AS BarberName,
                bd.BusinessDate AS InvoiceBusinessDate
            FROM Invoices i
            INNER JOIN Barbers b
                ON b.Id = i.BarberId
            INNER JOIN BusinessDays bd
                ON bd.Id = i.BusinessDayId
            WHERE i.Id = ?
            LIMIT 1
        `, [invoiceId]);

        if (!invoice) {
            return res.status(404).send('Invoice not found');
        }

        const [items] = await db.query(`
            SELECT
                ii.Id,
                ii.InvoiceId,
                ii.ServiceId,
                ii.Price,
                s.Name AS ServiceName,
                s.Category
            FROM InvoiceItems ii
            INNER JOIN Services s
                ON s.Id = ii.ServiceId
            WHERE ii.InvoiceId = ?
            ORDER BY ii.Id
        `, [invoiceId]);

        res.render('barber/invoice', {
            user: req.session.user,
            invoice,
            items
        });

    } catch (error) {

        console.error('Invoice page error:', error);

        res.status(500).send(`
            <h1>Groom Room</h1>
            <h2>حدث خطأ أثناء تحميل الفاتورة</h2>
            <pre>${error.message}</pre>
        `);
    }
}

// =====================================================
// Helpers
// =====================================================

async function getActiveBarbers(connection) {

    const [barbers] = await connection.query(`
        SELECT *
        FROM Barbers
        WHERE IsActive = 1
        ORDER BY Name
    `);

    return barbers;
}

async function getActiveServices(connection) {

    const [services] = await connection.query(`
        SELECT *
        FROM Services
        WHERE IsActive = 1
        ORDER BY Category, Name
    `);

    return services;
}

module.exports = {
    index,
    newHaircut,
    createHaircut,
    invoice
};