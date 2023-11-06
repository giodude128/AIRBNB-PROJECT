


const express = require('express')
const { requireAuth } = require('../../utils/auth')

const { User, Spot, Booking, SpotImage} = require('../../db/models');

const router = express.Router()

const { Op } = require("sequelize")




//get all current User's Bookings--------------------------------------
router.get('/current', requireAuth, async (req, res) => {
    const { user } = req
    const currUserBookings = await Booking.findAll({
        where: { userId: user.id },
        include: {
            model: Spot, attribute: [
                'id', 'ownerId', 'address', 'city', 'state', 'country', 'lat', 'lng', 'name', 'price', 'previewImage'
            ]
        }
    })
    // Convert lat, lng, and price to numbers in each Spot
    currUserBookings.forEach((booking) => {
        const spot = booking.Spot;
        spot.lat = parseFloat(spot.lat);
        spot.lng = parseFloat(spot.lng);
        spot.price = parseFloat(spot.price);
    });
    res.status(200).json({ Bookings: currUserBookings })
})






//edit a booking
router.put("/:bookingId", requireAuth, async (req, res) => {
    const { startDate, endDate } = req.body;
    const { bookingId } = req.params;
    const { user } = req;
    const timeZone = 'EST'
    //setup for date comparison
    const newStartDate = new Date(startDate).getTime();
    const newEndDate = new Date(endDate).getTime();

    //body validations
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

    //end must come after start
    if (newEndDate <= newStartDate) {
        return res.status(400).json({
            message: "Bad Request",
            errors: {
                endDate: "endDate cannot come before startDate"
            }
        });
    }

    //past date check
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

    // const bookingUserId = booking.dataValues.userId;
    if (!booking) return res.status(404).json({ message: "Booking not found" })
    if (booking.id === bookingId && user.id === booking.userId) {
        booking.update({
            startDate,
            endDate
        });
        return res.status(200).json(booking);
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
            const errObj = {};
            // if (newStartDate === newEndDate) {
            //     return res.status(403).json({ message: "Bad Request", errors: { endDate: "endDate cannot come before startDate" } })
            // }
            //start date is during a booking
            if (newStartDate >= bookingStartDate && newStartDate <= bookingEndDate) {
                errObj.startDate = "Start date conflicts with an existing booking";
            }
            //end date is during a booking
            if (newEndDate >= bookingStartDate && newEndDate <= bookingEndDate) {
                errObj.endDate = "End date conflicts with an existing booking";
            }

            if (newStartDate < bookingStartDate && newEndDate > bookingEndDate) {
                errObj.startDate = "Start date conflicts with an existing booking";
                errObj.endDate = "End date conflicts with an existing booking";
            }

            if (newStartDate === bookingStartDate) {
                errObj.startDate = "Start date conflicts with an existing booking";
            }

            if (newEndDate === bookingEndDate) {
                errObj.endDate = "End date conflicts with an existing booking";
            }

            if (errObj.startDate || errObj.endDate) {
                return res.status(403).json({
                    message: "Sorry, this spot is already booked for the specified dates",
                    errors: errObj
                });
            }
        });

        //authorization check
        if (user.id === booking.userId) {
            booking.update({
                startDate,
                endDate
            });
            await booking.save()
            // booking.startDate = startDate.toLocaleDateString('en-US', { timeZone })
            // booking.endDate = endDate.toLocaleDateString('en-US', { timeZone })
            const formatBooking = {
                ...booking.toJSON(),
                startDate: booking.startDate.toLocaleDateString('en-US', { timeZone }),
                endDate: booking.endDate.toLocaleDateString('en-US', { timeZone }),
                updatedAt: booking.updatedAt.toLocaleString('en-US', { timeZone }),
                createdAt: booking.createdAt.toLocaleString('en-US', { timeZone })
            }
            return res.status(200).json(formatBooking);
        } else {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

    }

});



//delete a Booking-----------------------------------------------------
router.delete("/:bookingId", requireAuth, async (req, res) => {
    const booking = await Booking.findByPk(req.params.bookingId)
    const { user } = req

    if (!booking) return res.status(404).json({ message: "Booking couldn't be found" })

    if (booking.userId !== user.id) return res.status(403).json({ message: "Forbidden" })

    const startDate = booking.startDate
    const currDate = new Date()
    console.log(startDate, currDate)
    if (startDate <= currDate) return res.status(403).json({ message: "Bookings that have already started can't be deleted" })

    await booking.destroy()
    res.status(200).json({ message: "Successfully deleted" })
})


module.exports = router;
