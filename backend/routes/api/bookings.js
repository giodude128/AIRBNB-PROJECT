const express = require('express')
const { requireAuth } = require('../../utils/auth')
const { User, Spot, Booking, SpotImage} = require('../../db/models');
const router = express.Router()
const { Op } = require("sequelize")

//GET ALL BOOKINGS BY THE CURRENT USER
router.get('/current', requireAuth, async (req, res) => {
    const { user } = req
    const timeZone = 'America/New_York'
    const currUserBooks = await Booking.findAll({
        where: { userId: user.id },
        include: {
            model: Spot, attribute: [
                'id', 'ownerId', 'address', 'city', 'state', 'country', 'lat', 'lng', 'name', 'price', 'previewImage'
            ]
        }
    })
    currUserBooks.forEach((booking) => {
        const spot = booking.Spot;
        spot.lat = parseFloat(spot.lat);
        spot.lng = parseFloat(spot.lng);
        spot.price = parseFloat(spot.price);
    });
    const fixedTime = { timeZone: 'CET', year: 'numeric', month: '2-digit', day: '2-digit' }
    const fixedCurrentBookings = currUserBooks.map((booking) => ({
        ...booking.toJSON(),
        startDate: booking.startDate.toLocaleDateString('en-US', fixedTime),
        endDate: booking.endDate.toLocaleDateString('en-US', fixedTime),
        updatedAt: booking.updatedAt.toLocaleString('en-US', { timeZone }),
        createdAt: booking.createdAt.toLocaleString('en-US', { timeZone })
    }))
    res.status(200).json({ Bookings: fixedCurrentBookings })
})

// EDIT THE BOOKINGS!!
router.put("/:bookingId", requireAuth, async (req, res) => {
    const { startDate, endDate } = req.body;
    const { bookingId } = req.params;
    const { user } = req;
    const timeZone = 'EST';
    const brandNewStartDate = new Date(startDate).getTime();
    const brandNewEndDate = new Date(endDate).getTime();

    // VALIDATIONS FOR THE BODY
    const errorObj = {};

    if (!startDate) {
        errorObj.startDate = "Please provide a valid Start Date";
    }
    if (!endDate) {
        errorObj.endDate = "Please provide a valid End Date";
    }
    if (errorObj.startDate || errorObj.endDate) {
        return res.status(400).json({ message: "Bad Request", errors: errorObj });
    }
    // END BEFORE THE START DATE!!
    if (brandNewEndDate <= brandNewStartDate) {
        return res.status(400).json({
            message: "Bad Request",
            errors: {
                endDate: "endDate cannot come before startDate"
            }
        });
    }
    // PAST THE DATE
    const currentDate = new Date().getTime();
    const testEndDate = new Date(endDate).getTime();
    if (currentDate >= testEndDate) {
        return res.status(403).json({
            message: "Past bookings can't be modified"
        });
    }
    const booking = await Booking.findByPk(bookingId, {
        attributes: ["id", "spotId", "userId", "startDate", "endDate", "createdAt", "updatedAt"]
    });
    if (!booking) return res.status(404).json({ message: "Booking not found" })
    if (booking.id === bookingId && user.id === booking.userId) {
        booking.update({
            startDate,
            endDate
        });
        return res.status(200).json(booking);
    } else {
        // INFO FOR ALL BOOKINGS
        const currentBookings = await Booking.findAll({
            where: {
                spotId: booking.spotId,
                id: { [Op.not]: booking.id }
            }
        });

        currentBookings.forEach((booking) => {
            const bookingStartDate = new Date(booking.dataValues.startDate).getTime();
            const bookingEndDate = new Date(booking.dataValues.endDate).getTime();
            const errObj = {};
            if (brandNewStartDate >= bookingStartDate && brandNewStartDate <= bookingEndDate) {
                errObj.startDate = "Start date conflicts with an existing booking";
            }
            if (brandNewEndDate >= bookingStartDate && brandNewEndDate <= bookingEndDate) {
                errObj.endDate = "End date conflicts with an existing booking";
            }
            if (brandNewStartDate < bookingStartDate && brandNewEndDate > bookingEndDate) {
                errObj.startDate = "Start date conflicts with an existing booking";
                errObj.endDate = "End date conflicts with an existing booking";
            }
            if (brandNewStartDate === bookingStartDate) {
                errObj.startDate = "Start date conflicts with an existing booking";
            }
            if (brandNewEndDate === bookingEndDate) {
                errObj.endDate = "End date conflicts with an existing booking";
            }
            if (errObj.startDate || errObj.endDate) {
                return res.status(403).json({
                    message: "Sorry, this spot is already booked for the specified dates",
                    errors: errObj
                });
            }
        });

        if (user.id === booking.userId) {
            booking.update({
                startDate,
                endDate
            });
            await booking.save()

            const fixedTime = { timeZone: 'CET', year: 'numeric', month: '2-digit', day: '2-digit' }

            const formatBooks = {
                ...booking.toJSON(),
                startDate: booking.startDate.toLocaleDateString('en-US', fixedTime),
                endDate: booking.endDate.toLocaleDateString('en-US', fixedTime),
                updatedAt: booking.updatedAt.toLocaleString('en-US', { timeZone }),
                createdAt: booking.createdAt.toLocaleString('en-US', { timeZone })
            }
            return res.status(200).json(formatBooks);
        } else {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

    }

});

// DELETING THE BOOKING!!
router.delete("/:bookingId", requireAuth, async (req, res) => {
    const bookings = await Booking.findByPk(req.params.bookingId)
    const { user } = req

    if (!bookings) return res.status(404).json({ message: "Booking couldn't be found" })

    if (bookings.userId !== user.id) return res.status(403).json({ message: "Forbidden" })

    const startDate = bookings.startDate
    const currDate = new Date()
    console.log(startDate, currDate)
    if (startDate <= currDate) return res.status(403).json({ message: "Bookings that have already started can't be deleted" })

    await bookings.destroy()
    res.status(200).json({ message: "Successfully deleted" })
})

module.exports = router;
