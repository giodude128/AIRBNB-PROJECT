


const express = require('express')
const { requireAuth } = require('../../utils/auth')

const { User, Spot, Booking, SpotImage} = require('../../db/models');

const router = express.Router()

const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');




//get all current User's Bookings--------------------------------------
router.get('/current', requireAuth, async (req, res) => {
    const { user } = req;
    const currentUserBookings = await Booking.findAll({
        where: {userId: user.id},
        include: {model: Spot, attributes: [
            "id", "ownerId", "address", "city", "state", "country",
            "lat", "lng", "name", "price"
        ], include: {model: SpotImage, where: {
            preview: true,

        }, limit: 1
     }},
    })
    // console.log(currentUserBookings)
    let bookingsPayload = []
    for (let booking of currentUserBookings) {
        booking = booking.toJSON()
        booking.Spot.previewImage = booking.Spot.SpotImages[0].url
        delete booking.Spot.SpotImages
        // console.log(booking.Spot)
        bookingsPayload.push(booking)
    }

    res.status(200).json({
        "Bookings": bookingsPayload
    })
});









//edit a Booking-------------------------------------------------------
router.put('/:bookingId', requireAuth ,async (req, res) => {
    let booking = await Booking.findByPk(req.params.id)
    if(!booking) {
        res.status(404).json({
            message: "Booking couldn't be found",
            statusCode: 404
        })
    }

    const {user} = req;
    let errors = [];
    const {startDate, endDate} = req.body

    let checkStartDate = new Date (startDate)
    let checkEndDate = new Date (endDate)
    let today = new Date()

    if (booking.userId !== user.id) errors.push('Invalid User')
    if (checkStartDate >= checkEndDate) errors.push("endDate cannot come before startDate")
    if (checkEndDate <= today) errors.push("Past bookings can't be modified")

    if (errors.length > 0) {
        const err = new Error('Validation error')
        err.statusCode = 400
        err.errors = errors
        res.status(400).json(err)
    }

    let thisDateRange = moment.range(startDate, endDate)

    const bookingsActive = await Booking.findAll({
        where: {spotId: booking.spotId}
    })
    let errs = [];

    bookingsActive.forEach(booking => {
        let range = moment.range(booking.startDate, booking.endDate)
        if (thisDateRange.overlaps(range)) {
            let start = moment(startDate)
            let end = moment(endDate)
            if(start.within(range)) errs.push("Start date conflicts with an existing booking")
            if(end.within(range)) errs.push("End date conflicts with an existing booking")
        }
    })

    if (errs.length) {
        res.status(403).json({
            message: "Sorry, this spot is already booked for the specified dates",
            statusCode: 403,
            errs
        })
        return
    }
    booking.startDate = startDate
    booking.endDate = endDate

    await booking.save()

    res.status(200).json(booking)
});

//delete a Booking-----------------------------------------------------
router.delete('/:bookingId', requireAuth, async (req, res) => {
    let booking = await Booking.findByPk(req.params.id)
    if(!booking) {
        res.status(404).json({
            message: "Booking couldn't be found",
            statusCode: 404
        })
    }
    const {user} = req
    if (booking.userId !== user.id) {
        res.json({
            message: "Validation error",
            statusCode: 400,
        })
    }
    let startDate = Booking.startDate
    booking.startDate = new Date(startDate)
    if (startDate) {
        res.status(403).json(        {
            message: "Bookings that have been started can't be deleted",
            statusCode: 403
        })
    }
    await booking.destroy()
    res.status(200).json({
        message: "Successfully deleted"
    })
});


module.exports = router;
