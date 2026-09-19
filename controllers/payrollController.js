const db = require('../config/db');


/*
==================================================
GET WORKING DAY
==================================================
*/

function getWorksOnDay(barber, date) {

    const day = date.getDay();

    switch (day) {

        // Sunday
        case 0:
            return Boolean(barber.WorksSunday);

        // Monday
        case 1:
            return Boolean(barber.WorksMonday);

        // Tuesday
        case 2:
            return Boolean(barber.WorksTuesday);

        // Wednesday
        case 3:
            return Boolean(barber.WorksWednesday);

        // Thursday
        case 4:
            return Boolean(barber.WorksThursday);

        // Friday
        case 5:
            return Boolean(barber.WorksFriday);

        // Saturday
        case 6:
            return Boolean(barber.WorksSaturday);

        default:
            return false;
    }
}


/*
==================================================
CALCULATE SCHEDULED DAYS
FULL SELECTED MONTH
==================================================
*/

function calculateScheduledDays(
    barber,
    selectedYear,
    selectedMonth
) {

    const startDate = new Date(
        selectedYear,
        selectedMonth - 1,
        1
    );

    const endDate = new Date(
        selectedYear,
        selectedMonth,
        0
    );

    let scheduledDays = 0;

    for (
        let date = new Date(startDate);
        date <= endDate;
        date.setDate(date.getDate() + 1)
    ) {

        if (getWorksOnDay(barber, date)) {
            scheduledDays++;
        }

    }

    return scheduledDays;
}


/*
==================================================
CALCULATE WORKED DAYS
START DATE IS RESPECTED
==================================================
*/

function calculateWorkedDays(
    barber,
    selectedYear,
    selectedMonth
) {

    const monthStart = new Date(
        selectedYear,
        selectedMonth - 1,
        1
    );

    const monthEnd = new Date(
        selectedYear,
        selectedMonth,
        0
    );

    let effectiveStartDate = new Date(
        barber.StartDate
    );

    if (Number.isNaN(effectiveStartDate.getTime())) {
        effectiveStartDate = new Date(monthStart);
    }

    effectiveStartDate = new Date(
        effectiveStartDate.getFullYear(),
        effectiveStartDate.getMonth(),
        effectiveStartDate.getDate()
    );

    /*
    If barber started before selected month,
    start from first day of selected month.
    */

    if (effectiveStartDate < monthStart) {
        effectiveStartDate = new Date(monthStart);
    }

    let workedDays = 0;

    if (effectiveStartDate <= monthEnd) {

        for (
            let date = new Date(effectiveStartDate);
            date <= monthEnd;
            date.setDate(date.getDate() + 1)
        ) {

            if (getWorksOnDay(barber, date)) {
                workedDays++;
            }

        }

    }

    return workedDays;
}


/*
==================================================
PAYROLL PAGE
==================================================
*/

async function index(req, res) {

    try {

        const today = new Date();


        /*
        ------------------------------------------
        SELECTED YEAR / MONTH
        ------------------------------------------
        */

        const year =
            Number(req.query.year) ||
            today.getFullYear();

        const month =
            Number(req.query.month) ||
            (today.getMonth() + 1);


        if (
            !Number.isInteger(year) ||
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12
        ) {

            return res
                .status(400)
                .send('السنة أو الشهر غير صحيح');

        }


        /*
        ------------------------------------------
        MONTH RANGE
        ------------------------------------------
        */

        const startDate = new Date(
            year,
            month - 1,
            1
        );

        const endDate = new Date(
            year,
            month,
            1
        );


        /*
        ------------------------------------------
        ACTIVE BARBERS
        ------------------------------------------
        */

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
            WHERE IsActive = 1
            ORDER BY Name
        `);


        const payroll = [];


        /*
        ==========================================
        CALCULATE PAYROLL
        ==========================================
        */

        for (const barber of barbers) {


            /*
            --------------------------------------
            SCHEDULED DAYS
            Full selected month
            --------------------------------------
            */

            const scheduledDaysInMonth =
                calculateScheduledDays(
                    barber,
                    year,
                    month
                );


            /*
            --------------------------------------
            ACTUAL WORKED DAYS
            From StartDate until month end
            --------------------------------------
            */

            const workedDays =
                calculateWorkedDays(
                    barber,
                    year,
                    month
                );


            /*
            --------------------------------------
            BASIC SALARY
            --------------------------------------
            */

            const basicSalary =
                Number(barber.BasicSalary) || 0;


            /*
            --------------------------------------
            DAILY SALARY
            IMPORTANT:
            Basic Salary / Scheduled Work Days
            --------------------------------------
            */

            const dailySalary =
                scheduledDaysInMonth > 0
                    ? basicSalary / scheduledDaysInMonth
                    : 0;


            /*
            --------------------------------------
            EARNED SALARY
            --------------------------------------
            */

            const earnedSalary =
                dailySalary * workedDays;


            /*
            --------------------------------------
            BONUSES
            --------------------------------------
            */

            const [[bonusResult]] =
                await db.query(`
                    SELECT
                        COALESCE(
                            SUM(Amount),
                            0
                        ) AS Total
                    FROM BarberBonuses
                    WHERE BarberId = ?
                      AND Date >= ?
                      AND Date < ?
                `, [
                    barber.Id,
                    startDate,
                    endDate
                ]);


            /*
            --------------------------------------
            PENALTIES
            --------------------------------------
            */

            const [[penaltyResult]] =
                await db.query(`
                    SELECT
                        COALESCE(
                            SUM(Amount),
                            0
                        ) AS Total
                    FROM BarberPenalties
                    WHERE BarberId = ?
                      AND Date >= ?
                      AND Date < ?
                `, [
                    barber.Id,
                    startDate,
                    endDate
                ]);


            /*
            --------------------------------------
            ADVANCES
            --------------------------------------
            */

            const [[advanceResult]] =
                await db.query(`
                    SELECT
                        COALESCE(
                            SUM(Amount),
                            0
                        ) AS Total
                    FROM BarberAdvances
                    WHERE BarberId = ?
                      AND Date >= ?
                      AND Date < ?
                `, [
                    barber.Id,
                    startDate,
                    endDate
                ]);


            const totalBonuses =
                Number(bonusResult.Total) || 0;

            const totalPenalties =
                Number(penaltyResult.Total) || 0;

            const totalAdvances =
                Number(advanceResult.Total) || 0;


            /*
            --------------------------------------
            NET SALARY
            --------------------------------------

            Earned Salary
            + Bonuses
            - Penalties
            - Advances
            */

            const netSalary =
                earnedSalary +
                totalBonuses -
                totalPenalties -
                totalAdvances;


            /*
            --------------------------------------
            PUSH PAYROLL ROW
            --------------------------------------
            */

            payroll.push({

                BarberId:
                    barber.Id,

                BarberName:
                    barber.Name,

                BasicSalary:
                    basicSalary,

                ScheduledDays:
                    scheduledDaysInMonth,

                DailySalary:
                    dailySalary,

                WorkedDays:
                    workedDays,

                EarnedSalary:
                    earnedSalary,

                TotalBonuses:
                    totalBonuses,

                TotalPenalties:
                    totalPenalties,

                TotalAdvances:
                    totalAdvances,

                NetSalary:
                    netSalary

            });

        }


        /*
        ==================================================
        TOTALS
        ==================================================
        */

        const totalBasicSalary =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.BasicSalary,
                0
            );


        const totalWorkedDays =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.WorkedDays,
                0
            );


        const totalEarnedSalary =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.EarnedSalary,
                0
            );


        const totalBonuses =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.TotalBonuses,
                0
            );


        const totalPenalties =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.TotalPenalties,
                0
            );


        const totalAdvances =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.TotalAdvances,
                0
            );


        const totalNetSalary =
            payroll.reduce(
                (sum, barber) =>
                    sum + barber.NetSalary,
                0
            );


        /*
        ==================================================
        RENDER
        ==================================================
        */

        res.render(
            'admin/payroll',
            {

                user:
                    req.session.user,

                payroll,

                year,

                month,

                totalBasicSalary,

                totalWorkedDays,

                totalEarnedSalary,

                totalBonuses,

                totalPenalties,

                totalAdvances,

                totalNetSalary

            }
        );


    } catch (error) {

        console.error(
            'Payroll page error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء تحميل المرتبات
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
ADD BONUS
==================================================
*/

async function addBonus(req, res) {

    try {

        const {
            barberId,
            amount,
            reason,
            date
        } = req.body;


        const barber =
            Number(barberId);

        const bonusAmount =
            Number(amount);


        if (
            !Number.isInteger(barber) ||
            barber <= 0
        ) {

            return res
                .status(400)
                .send('الحلاق غير صحيح');

        }


        if (
            Number.isNaN(bonusAmount) ||
            bonusAmount <= 0
        ) {

            return res
                .status(400)
                .send('قيمة البونص غير صحيحة');

        }


        if (!date) {

            return res
                .status(400)
                .send('التاريخ مطلوب');

        }


        const [[barberExists]] =
            await db.query(`
                SELECT Id
                FROM Barbers
                WHERE Id = ?
                LIMIT 1
            `, [barber]);


        if (!barberExists) {

            return res
                .status(404)
                .send('الحلاق غير موجود');

        }


        await db.query(`
            INSERT INTO BarberBonuses
            (
                BarberId,
                Amount,
                Reason,
                Date
            )
            VALUES
            (?, ?, ?, ?)
        `, [

            barber,
            bonusAmount,
            reason || '',
            `${date} 00:00:00`

        ]);


        const selectedDate =
            new Date(`${date}T00:00:00`);


        res.redirect(
            `/admin/payroll?year=${selectedDate.getFullYear()}&month=${selectedDate.getMonth() + 1}`
        );


    } catch (error) {

        console.error(
            'Add bonus error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء إضافة البونص
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
ADD PENALTY
==================================================
*/

async function addPenalty(req, res) {

    try {

        const {
            barberId,
            amount,
            reason,
            date
        } = req.body;


        const barber =
            Number(barberId);

        const penaltyAmount =
            Number(amount);


        if (
            !Number.isInteger(barber) ||
            barber <= 0
        ) {

            return res
                .status(400)
                .send('الحلاق غير صحيح');

        }


        if (
            Number.isNaN(penaltyAmount) ||
            penaltyAmount <= 0
        ) {

            return res
                .status(400)
                .send('قيمة الجزاء غير صحيحة');

        }


        if (!date) {

            return res
                .status(400)
                .send('التاريخ مطلوب');

        }


        const [[barberExists]] =
            await db.query(`
                SELECT Id
                FROM Barbers
                WHERE Id = ?
                LIMIT 1
            `, [barber]);


        if (!barberExists) {

            return res
                .status(404)
                .send('الحلاق غير موجود');

        }


        await db.query(`
            INSERT INTO BarberPenalties
            (
                BarberId,
                Amount,
                Reason,
                Date
            )
            VALUES
            (?, ?, ?, ?)
        `, [

            barber,
            penaltyAmount,
            reason || '',
            `${date} 00:00:00`

        ]);


        const selectedDate =
            new Date(`${date}T00:00:00`);


        res.redirect(
            `/admin/payroll?year=${selectedDate.getFullYear()}&month=${selectedDate.getMonth() + 1}`
        );


    } catch (error) {

        console.error(
            'Add penalty error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء إضافة الجزاء
            </h2>

            <pre>
${error.message}
            </pre>
        `);

    }

}


/*
==================================================
ADD ADVANCE
==================================================
*/

async function addAdvance(req, res) {

    try {

        const {
            barberId,
            amount,
            reason,
            date
        } = req.body;


        const barber =
            Number(barberId);

        const advanceAmount =
            Number(amount);


        if (
            !Number.isInteger(barber) ||
            barber <= 0
        ) {

            return res
                .status(400)
                .send('الحلاق غير صحيح');

        }


        if (
            Number.isNaN(advanceAmount) ||
            advanceAmount <= 0
        ) {

            return res
                .status(400)
                .send('قيمة السلفة غير صحيحة');

        }


        if (!date) {

            return res
                .status(400)
                .send('التاريخ مطلوب');

        }


        const [[barberExists]] =
            await db.query(`
                SELECT Id
                FROM Barbers
                WHERE Id = ?
                LIMIT 1
            `, [barber]);


        if (!barberExists) {

            return res
                .status(404)
                .send('الحلاق غير موجود');

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

            barber,
            advanceAmount,
            reason || '',
            `${date} 00:00:00`

        ]);


        const selectedDate =
            new Date(`${date}T00:00:00`);


        res.redirect(
            `/admin/payroll?year=${selectedDate.getFullYear()}&month=${selectedDate.getMonth() + 1}`
        );


    } catch (error) {

        console.error(
            'Add advance error:',
            error
        );

        res.status(500).send(`
            <h1>Groom Room</h1>

            <h2>
                حدث خطأ أثناء إضافة السلفة
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

    addBonus,

    addPenalty,

    addAdvance

};