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
router.put("/:bookingId", requireAuth, async (req, res) => {
    const { startDate, endDate } = req.body;
    const { bookingId } = req.params;
    const { user } = req;

    //setup for date comparison
    const newStartDate = new Date(startDate).getTime();
    const newEndDate = new Date(endDate).getTime();

    //body validations
    const errorsObj = {};

    if (!startDate) {
        errorsObj.startDate = "Please provide a valid Start Date";
    }
    if (!endDate) {
        errorsObj.endDate = "Please provide a valid End Date";
    }

    if (errorsObj.startDate || errorsObj.endDate) {
        res.status(400).json({ "message": "Bad Request", "errors": errorsObj });
    }

    //end must come after start
    if (newEndDate <= newStartDate) {
        res.status(400).json({
            "message": "Bad Request",
            "errors": {
                "endDate": "endDate cannot come before startDate"
            }
        });
    }

    //past date check
    const currentDate = new Date().getTime();
    const testEndDate = new Date(endDate).getTime();
    if (currentDate >= testEndDate) {
        res.status(403);
        return res.send({
            "message": "Past bookings can't be modified"
        });
    }

    try {
        const booking = await Booking.findByPk(bookingId, {
            attributes: ["id", "spotId", "userId", "startDate", "endDate", "createdAt", "updatedAt"]
        });

        const bookingUserId = booking.dataValues.userId;

        if (booking.dataValues.id === bookingId && user.id === bookingUserId) {
            booking.update({
                startDate,
                endDate
            });
            res.status(200).json(booking);
        } else {
            //get info for current bookings
            const currentBookings = await Booking.findAll({
                where: {
                    spotId: booking.spotId,
                    id: { [Op.not]: booking.id }
                }
            });

            currentBookings.forEach((booking) => {
                //setup for date comparisons
                const bookingStartDate = new Date(booking.dataValues.startDate).getTime();
                const bookingEndDate = new Date(booking.dataValues.endDate).getTime();

                //check if this spot has been booked for these dates
                const errorsObject = {};
                // if (newStartDate === newEndDate) {
                //     return res.status(403).json({ message: "Bad Request", errors: { endDate: "endDate cannot come before startDate" } })
                // }
                //start date is during a booking
                if (newStartDate >= bookingStartDate && newStartDate <= bookingEndDate) {
                    errorsObject.startDate = "Start date conflicts with an existing booking";
                }
                //end date is during a booking
                if (newEndDate >= bookingStartDate && newEndDate <= bookingEndDate) {
                    errorsObject.endDate = "End date conflicts with an existing booking";
                }

                if (newStartDate < bookingStartDate && newEndDate > bookingEndDate) {
                    errorsObject.startDate = "Start date conflicts with an existing booking";
                    errorsObject.endDate = "End date conflicts with an existing booking";
                }

                if (newStartDate === bookingStartDate) {
                    errorsObject.startDate = "Start date conflicts with an existing booking";
                }

                if (newEndDate === bookingEndDate) {
                    errorsObject.endDate = "End date conflicts with an existing booking";
                }

                if (errorsObject.startDate || errorsObject.endDate) {
                    return res.status(403).json({
                        "message": "Sorry, this spot is already booked for the specified dates",
                        "errors": errorsObject
                    });
                }
            });

            //authorization check
            if (user.id === bookingUserId) {
                booking.update({
                    startDate,
                    endDate
                });
            } else {
                res.status(403).json({
                    "message": "Forbidden"
                });
            }

            res.json(booking);
        }
    } catch (error) {
        res.status(404).json({
            "message": "Booking couldn't be found"
        });
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
