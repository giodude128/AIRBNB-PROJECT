const express = require('express')
const { Spot, Review, User, SpotImage, Booking, ReviewImage } = require('../../db/models');
const { requireAuth } = require('../../utils/auth')
const router = express.Router()
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const queryFilters = require("../../utils/queryfilters");
//err middleware for checking spots
const checkSpotDetails = [
    check('address')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage("Street address is required"),
    check('city')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage("City is required"),
    check('state')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage("State is required"),
    check('country')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage("Country is required"),
    check('lat')
        .exists({ checkFalsy: true })
        .isFloat({ min: -90, max: 90 })
        .withMessage("Latitude is not valid"),
    check('lng')
        .exists({ checkFalsy: true })
        .isFloat({ min: -180, max: 180 })
        .withMessage("Longitude is not valid"),
    check('name')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage("Name is required"),
    check('name')
        .isLength({ max: 50 })
        .withMessage("Name must be less than 50 character"),
    check('description')
        .exists({ checkFalsy: true })
        .notEmpty()
        .withMessage("Description is required"),
    check('price')
        .exists({ checkFalsy: true })
        .notEmpty()
        .isFloat({ min: 0 })
        .withMessage("Price per day is required"),
    handleValidationErrors
]


router.get("/", queryFilters, async (req, res) => {

    const {
        limit,
        offset,
        size,
        page,
        minLat,
        maxLat,
        minLng,
        maxLng,
        minPrice,
        maxPrice,
        where,
    } = req.pagination;

    const spots = await Spot.unscoped().findAll({
        where,
        include: [
            {
                model: SpotImage,
                attributes: ["url"],
            },
        ],
        limit,
        offset,
    });

    const spotsJSON = spots.map((ele) => {
        const spotData = ele.toJSON()
        spotData.lat = parseFloat(spotData.lat);
        spotData.lng = parseFloat(spotData.lng);
        spotData.price = parseFloat(spotData.price);

        return spotData
    });

    for (let i = 0; i < spotsJSON.length; i++) {
        if (spotsJSON[i].SpotImages[0]) {
            spotsJSON[i].previewImage = spotsJSON[i].SpotImages[0].url;
            delete spotsJSON[i].SpotImages;
        } else {
            // If no image found, set previewImage to null or an empty string
            spotsJSON[i].previewImage = `No preview image`; // or spotsJSON[i].previewImage = '';
            delete spotsJSON[i].SpotImages;
        }

        const sum = await Review.sum("stars", {
            where: {
                spotId: spotsJSON[i].id,
            },
        });
        const total = await Review.count({
            where: {
                spotId: spotsJSON[i].id,
            },
        });

        spotsJSON[i].avgRating = total > 0 ? sum / total : 'Spot not rated';
    }

    res.json({ Spots: spotsJSON, page: page, size: size });
});

//Get all Spots owned by CU
router.get('/current', requireAuth, async (req, res) => {
    const currentId = req.user.id

    const spots = await Spot.findAll({
        where: {
            ownerId: currentId,
        },
        include: [Review, SpotImage]
    })
    let addedPropSpots = spots.map(async (spot) => {
        let reviews = spot.toJSON().Reviews
        let starRatings = []
        let reviewArr = []

        reviews.forEach(review => {
            let rating = review.stars
            starRatings.push(rating)
            reviewArr.push(reviews)
        });
        let sum = starRatings.reduce((prevNum, currNum) => prevNum + currNum, 0)
        let avgRating = parseFloat((sum / starRatings.length).toFixed(2))
        spot.avgRating = avgRating ? avgRating : `Spot not rated`
        const spotImage = await SpotImage.findOne({ where: { spotId: spot.id } })
        if (spotImage) {
            spot.previewImage = spotImage.url;
        } else {
            spot.previewImage = `No preview image`
        }
        let rdel = spot.toJSON()
        delete rdel.Reviews
        delete rdel.SpotImages
        rdel.lat = parseFloat(rdel.lat);
        rdel.lng = parseFloat(rdel.lng);
        rdel.price = parseFloat(rdel.price);


        return rdel
    });

    addedPropSpots = await Promise.all(addedPropSpots)

    res.status(200).json({
        "Spots": addedPropSpots
    })
})


router.get('/:spotId', async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const timeZone = 'EST'
    if (!spot) return res.status(404).json({ message: "Spot couldn't be found" })
    spot = spot.toJSON()

    //numReviews
    const revs = await Review.findAll({
        where: { spotId: spot.id }
    })
    const numRevs = revs.length

    //avgRating
    let starRatings = []
    revs.forEach((review) => {
        starRatings.push(review.stars)
    })
    let sum = 0
    starRatings.forEach((rating) => {
        sum += rating
    })

    const avgRating = Number((sum / starRatings.length).toFixed(2))

    const spotImage = await SpotImage.findAll({ where: { spotId: spot.id }, attributes: ['id', 'url', 'preview'] })

    const owner = await User.findByPk(spot.ownerId, { attributes: ['id', 'firstName', 'lastName'] })

    if (spotImage.length >= 1) {
        spot.previewImage = spotImage[0].url
    } else {
        spot.previewImage = `No preview image`
    }
    spot.numReviews = numRevs

    spot.lat = parseFloat(spot.lat);
    spot.lng = parseFloat(spot.lng);
    spot.price = parseFloat(spot.price);
    spot.createdAt = spot.createdAt.toLocaleString('en-US', { timeZone });
    spot.updatedAt = spot.updatedAt.toLocaleString('en-US', { timeZone });


    spot.avgRating = avgRating ? avgRating : `Spot not rated`
    spot.SpotImages = spotImage
    spot.Owner = owner

    res.status(200).json(spot)
})

//create a new spot

router.post('/', requireAuth, checkSpotDetails, async (req, res) => {
    const userId = req.user.id
    const timeZone = 'EST'
    const { address, city, state, country, lat, lng, name, description, price } = req.body
    const newSpot = await Spot.create({
        ownerId: userId,
        address,
        city,
        state,
        country,
        lat,
        lng,
        name,
        description,
        price
    })
    let spot = newSpot.toJSON()
    // if(spot.avgRating === null)
    // delete spot.avgRating
    // delete spot.previewImage
    spot.lat = parseFloat(spot.lat);
    spot.lng = parseFloat(spot.lng);
    spot.price = parseFloat(spot.price);

    res.status(201).json({
        id: spot.id,
        ownerId: spot.ownerId,
        address: spot.address,
        city: spot.city,
        state: spot.state,
        country: spot.country,
        lat: spot.lat,
        lng: spot.lng,
        name: spot.name,
        description: spot.description,
        price: spot.price,
        updatedAt: spot.updatedAt,
        createdAt: spot.createdAt
    })
})


//create image for a spot

router.post('/:spotId/images', requireAuth, async (req, res) => {
    const spot = await Spot.findByPk(req.params.spotId)
    const { url, preview } = req.body
    if (!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found",
        })
    }
    if (spot.ownerId !== req.user.id) {
        return res.status(403).json({
            message: "Forbidden"
        })
    }
    if (preview === true) {
        spot.previewImage = url
        await spot.save()
    }
    const newSpotImage = await spot.createSpotImage({
        url, preview
    })
    newSpotImage.toJSON().url = url
    newSpotImage.toJSON().preview = preview
    let img = { id: newSpotImage.id, url, preview }
    await newSpotImage.save()
    res.status(200).json(img)
})

//edit a spot

router.put('/:spotId', requireAuth, checkSpotDetails, async (req, res) => {
    const spot = await Spot.findByPk(req.params.spotId)
    const timeZone = 'EST'
    const { address, city, state, country, lat, lng, name, description, price } = req.body
    const { user } = req
    if (!spot) {
        return res.status(404).json({
            message: "Spot couldn't be found",
        })
    }
    if (spot.ownerId !== user.id) {
        return res.status(403).json({
            message: "Forbidden"
        })
    }

    spot.address = address
    spot.city = city
    spot.state = state
    spot.country = country
    spot.lat = lat
    spot.lng = lng
    spot.name = name
    spot.description = description
    spot.price = price



    await spot.save()
    // spot.updatedAt = spot.updatedAt.toLocaleString('en-US', { timeZone });
    // spot.createdAt = spot.createdAt.toLocaleString('en-US', { timeZone });
    res.status(200).json({
        id: spot.id,
        ownerId: spot.ownerId,
        address: spot.address,
        city: spot.city,
        state: spot.state,
        country: spot.country,
        lat: spot.lat,
        lng: spot.lng,
        name: spot.name,
        description: spot.description,
        price: spot.price,
        // updatedAt: spot.updatedAt.toLocaleString('en-US', { timeZone }),
        // createdAt: spot.createdAt.toLocaleString('en-US', { timeZone })

    })
})


//delete a spot

router.delete('/:spotId', requireAuth, async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    let { user } = req
    if (!spot) {
        res.status(404).json({
            message: "Spot could not be found."
        })
    }
    if (spot.ownerId !== user.id) {
        return res.status(403).json({
            message: "Forbidden"
        })
    } else {
        await spot.destroy()
        return res.status(200).json({
            message: "Successfully deleted"
        })
    }
})


//Get all reviews by a Spot's id

router.get('/:spotId/reviews', async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const timeZone = "EST"
    if (!spot) {
        return res.status(404).json({ message: "Spot couldn't be found" })
    }

    const reviews = await Review.findAll({
        where: { spotId: spot.id },
        include: [{
            model: User, attributes: ['id', 'firstName', 'lastName']
        }, {
            model: ReviewImage,
            attributes: ['id', 'url']
        }]
    })
    // reviews.createdAt = reviews.createdAt.toLocaleString('en-US', { timeZone });
    // reviews.updatedAt = reviews.updatedAt.toLocaleString('en-US', { timeZone });
    const formatRevs = reviews.map((review) => ({
        ...review.toJSON(),
        createdAt: review.createdAt.toLocaleString('en-US', { timeZone }),
        updatedAt: review.updatedAt.toLocaleString('en-US', { timeZone })
    }))
    res.status(200).json({ Reviews: formatRevs })
})



// create a review for a spot based on spotId

router.post('/:spotId/reviews', requireAuth, async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const timeZone = 'EST'
    if (!spot) {
        return res.status(404).json({ message: "Spot couldn't be found" })
    }

    const { spotId, review, stars } = req.body
    const { user } = req

    const reviews = await Review.findAll({
        where: { userId: user.id }
    })

    let currRev = false
    reviews.forEach(review => {
        let revJ = review.toJSON()
        if (revJ.spotId == spot.id) {
            currRev = true
        }
    })

    let errors = []
    if (!review) errors.push("Review text is required")
    if (req.body.stars > 5 || req.body.stars < 1 || !stars) errors.push("Stars must be an integer from 1 to 5")
    if (errors.length) {
        res.status(400).json({
            message: "Bad Request", errors: {
                review: errors[0],
                stars: errors[1]
            }
        })
        return
    }
    if (currRev) {
        return res.status(500).json({ message: "User already has a review for this spot" })
    } else {
        const newRev = await spot.createReview({
            userId: user.id,
            spotId, review, stars
        })


        return res.status(201).json({
            id: newRev.id,
            userId: newRev.userId,
            spotId: newRev.spotId,
            review: newRev.review,
            stars: newRev.stars,

        })
    }

})

// get all current bookings by spotId
router.get('/:spotId/bookings', requireAuth, async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const { user } = req
    const timeZone = 'EST'
    if (!spot) {
        return res.status(404).json({ message: "Spot couldn't be found" })
    }

    if (spot.ownerId === user.id) {
        const allBookings = await Booking.findAll({
            where: { spotId: spot.id },
            include: { model: User, attributes: ['id', 'firstName', 'lastName'] }
        })
        const formattedBookings = allBookings.map(booking => ({
            spotId: booking.spotId,
            startDate: booking.startDate.toLocaleDateString(),
            endDate: booking.endDate.toLocaleDateString()
        }));

        return res.status(200).json({ Bookings: formattedBookings });
    }
    if (spot.ownerId !== user.id) {
        const allBookings = await Booking.findAll({
            where: { spotId: spot.id },
            attributes: ['spotId', 'startDate', 'endDate']
        })
        const formattedBookings = allBookings.map(booking => ({
            spotId: booking.spotId,
            startDate: booking.startDate.toLocaleDateString('en-US', { timeZone }),
            endDate: booking.endDate.toLocaleDateString('en-US', { timeZone })
        }));

        return res.status(200).json({ Bookings: formattedBookings });
    }
})

// Create a booking based on a spotId
router.post('/:spotId/bookings', requireAuth, async (req, res) => {
    const { user } = req;
    const timeZone = 'EST'
    const userId = user.id;

    const spot = await Spot.findByPk(req.params.spotId);
    const body = req.body;

    if (!spot) {
        return res.status(404).json({ message: "Spot couldn't be found" });
    }

    if (spot.ownerId === user.id) {
        return res.status(403).json({ message: "You cannot make a booking for a spot you own" });
    }

    const bookings = await Booking.findAll({
        where: {
            spotId: spot.id
        }
    });

    const newStart = new Date(body.startDate);
    const newEnd = new Date(body.endDate);

    for (const currBooking of bookings) {
        const currStartDate = new Date(currBooking.startDate);
        const currEndDate = new Date(currBooking.endDate);

        if (newStart.getTime() === currStartDate.getTime() && newEnd.getTime() === currEndDate.getTime()) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    startDate: "Start date conflicts with an existing booking",
                    endDate: "End date conflicts with an existing booking"
                }
            });
        }

        if (newStart.getTime() === currStartDate.getTime()) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    startDate: "Start date on an existing start date"
                }
            });
        }

        if (newStart.getTime() === currEndDate.getTime()) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    startDate: "Start date on an existing end date"
                }
            });
        }

        if (newEnd.getTime() === currStartDate.getTime()) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    endDate: "End date on an existing start date"
                }
            });
        }

        if (newEnd.getTime() === currEndDate.getTime()) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    endDate: "End date on an existing end date"
                }
            });
        }

        if (newStart > currStartDate && newEnd < currEndDate) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    startDate: "Start date conflicts with an existing booking",
                    endDate: "End date conflicts with an existing booking"
                }
            });
        }

        if (newStart >= currStartDate && newStart < currEndDate) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    startDate: "Start date during an existing booking"
                }
            });
        }

        if (newEnd > currStartDate && newEnd <= currEndDate) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    endDate: "End date during an existing booking"
                }
            });
        }

        if (newStart <= currStartDate && newEnd >= currEndDate) {
            return res.status(403).json({
                message: "Sorry, this spot is already booked for the specified dates",
                errors: {
                    startDate: "Start date conflicts with an existing booking",
                    endDate: "End date conflicts with an existing booking"
                }
            });
        }
    }

    if (newStart.getTime() === newEnd.getTime()) {
        return res.status(400).json({
            message: "Bad Request",
            errors: {
                startDate: "Start and end date are the same",
                endDate: "Start and end date are the same"
            }
        });
    }

    if (newEnd.getTime() < newStart.getTime()) {
        return res.status(400).json({
            message: "Bad Request",
            errors: {
                endDate: "End date cannot be before start date"
            }
        });
    }

    body.userId = userId;
    body.spotId = spot.id;

    const newBooking = await Booking.create(body);
    await newBooking.save()
    const formattedBooking = {
        ...newBooking.dataValues,
        startDate: newBooking.startDate.toLocaleDateString('en-US', { timeZone }),
        endDate: newBooking.endDate.toLocaleDateString('en-US', { timeZone }),
        createdAt: newBooking.createdAt.toLocaleString('en-US', { timeZone }),
        updatedAt: newBooking.updatedAt.toLocaleString('en-US', { timeZone }),
    };
    // await formattedBooking.save()
    res.json(formattedBooking);
});
module.exports = router
