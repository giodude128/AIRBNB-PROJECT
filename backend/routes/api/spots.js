const express = require('express')
const { Spot, Review, User, SpotImage, Booking, ReviewImage } = require('../../db/models');
const { requireAuth } = require('../../utils/auth')
const router = express.Router()
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');

const queryFilters = require("../../utils/queryfilters");


//CHECKS FOR SPOTS. MIDDLEWARE!!
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
    const timeZone = 'EST'
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

    const spottedJSON = spots.map((ele) => {
        const spotData = ele.toJSON()
        spotData.lat = parseFloat(spotData.lat);
        spotData.lng = parseFloat(spotData.lng);
        spotData.price = parseFloat(spotData.price);
        spotData.updatedAt = spotData.updatedAt.toLocaleString('en-US', { timeZone })
        spotData.createdAt = spotData.createdAt.toLocaleString('en-US', { timeZone })
        return spotData
    });

    for (let i = 0; i < spottedJSON.length; i++) {
        if (spottedJSON[i].SpotImages[0]) {
            spottedJSON[i].previewImage = spottedJSON[i].SpotImages[0].url;
            delete spottedJSON[i].SpotImages;
        } else {

            spottedJSON[i].previewImage = `No preview image`;
            delete spottedJSON[i].SpotImages;
        }

        const sum = await Review.sum("stars", {
            where: {
                spotId: spottedJSON[i].id,
            },
        });
        const total = await Review.count({
            where: {
                spotId: spottedJSON[i].id,
            },
        });

        spottedJSON[i].avgRating = total > 0 ? sum / total : 'Spot not rated';
    }

    res.json({ Spots: spottedJSON, page: page, size: size });
});

//SPOTS BY THE CURRENT USER
router.get('/current', requireAuth, async (req, res) => {
    const currentId = req.user.id
    const timeZone = 'EST'
    const spots = await Spot.findAll({
        where: {
            ownerId: currentId,
        },
        include: [Review, SpotImage]
    })
    let addedSpots = spots.map(async (spot) => {
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
        rdel.createdAt = rdel.createdAt.toLocaleString('en-US', { timeZone });
        rdel.updatedAt = rdel.updatedAt.toLocaleString('en-US', { timeZone });
        return rdel
    });
    addedSpots = await Promise.all(addedSpots)
    res.status(200).json({
        "Spots": addedSpots
    })
})


router.get('/:spotId', async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const timeZone = 'EST';
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

    delete spot.previewImage;

    res.status(200).json(spot)
})

// CREATING A NEW SPOT
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
    spot.lat = parseFloat(spot.lat);
    spot.lng = parseFloat(spot.lng);
    spot.price = parseFloat(spot.price);
    spot.createdAt = spot.createdAt.toLocaleString('en-US', { timeZone });
    spot.updatedAt = spot.updatedAt.toLocaleString('en-US', { timeZone })

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
    let image = { id: newSpotImage.id, url, preview }
    await newSpotImage.save()
    res.status(200).json(image)
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
        updatedAt: spot.updatedAt.toLocaleString('en-US', { timeZone }),
        createdAt: spot.createdAt.toLocaleString('en-US', { timeZone })
    })
})


//DELETING A SPOT!!

router.delete('/:spotId', requireAuth, async (req, res) => {
    let spots = await Spot.findByPk(req.params.spotId)
    let { user } = req
    if (!spots) {
        res.status(404).json({
            message: "Spot could not be found."
        })
    }
    if (spots.ownerId !== user.id) {
        return res.status(403).json({
            message: "Forbidden"
        })
    } else {
        await spots.destroy()
        return res.status(200).json({
            message: "Successfully deleted"
        })
    }
})


// GET REVIEW FOR A SPOT IDs!!

router.get('/:spotId/reviews', async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const timeZone = 'EST';
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
    const formatRevs = reviews.map((review) => ({
        ...review.toJSON(),
        createdAt: review.createdAt.toLocaleString('en-US', { timeZone }),
        updatedAt: review.updatedAt.toLocaleString('en-US', { timeZone })
    }))
    res.status(200).json({ Reviews: formatRevs })
})



// CREATING A REVIEW BASED ON THE SPOT ID
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
    let currentReview = false
    reviews.forEach(review => {
        let revJ = review.toJSON()
        if (revJ.spotId == spot.id) {
            currentReview = true
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
    if (currentReview) {
        return res.status(500).json({ message: "User already has a review for this spot" })
    } else {
        const newReview = await spot.createReview({
            userId: user.id,
            spotId, review, stars
        })
        newReview.createdAt = newReview.createdAt.toLocaleString('en-US', { timeZone });
        newReview.updatedAt = newReview.updatedAt.toLocaleString('en-US', { timeZone });
        return res.status(201).json({
            id: newReview.id,
            userId: newReview.userId,
            spotId: newReview.spotId,
            review: newReview.review,
            stars: newReview.stars,
            updatedAt: newReview.createdAt.toLocaleString('en-US', { timeZone }),
            createdAt: newReview.updatedAt.toLocaleString('en-US', { timeZone })
        })
    }

})

// get all current bookings by spotId
router.get('/:spotId/bookings', requireAuth, async (req, res) => {
    let spot = await Spot.findByPk(req.params.spotId)
    const { user } = req

    if (!spot) {
        res.status(404).json({ message: "Spot couldn't be found" })
    }

    if (spot.ownerId === user.id) {
        const allBookings = await Booking.findAll({
            where: { spotId: spot.id },
            include: { model: User, attributes: ['id', 'firstName', 'lastName'] }
        })
        res.status(200).json({ Bookings: allBookings })
    }
    if (spot.ownerId !== user.id) {
        const allBookings = await Booking.findAll({
            where: { spotId: spot.id },
            attributes: ['spotId', 'startDate', 'endDate']
        })
        res.status(200).json({ Bookings: allBookings })
    }
})


// CREATE BOOKING BASED ON SPOT ID
router.post('/:spotId/bookings', requireAuth, async (req, res) => {
    const { user } = req;
    const timeZone = 'EST';
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

    for (const currentBookings of bookings) {
        const currStartDate = new Date(currentBookings.startDate);
        const currEndDate = new Date(currentBookings.endDate);

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

    const newBooks = await Booking.create(body);
    await newBooks.save()

    const options = { timeZone: 'CET', year: 'numeric', month: '2-digit', day: '2-digit' }

    const formattedBooking = {
        ...newBooks.dataValues,
        startDate: newBooks.startDate.toLocaleDateString('en-US', options),
        endDate: newBooks.endDate.toLocaleDateString('en-US', options),
        createdAt: newBooks.createdAt.toLocaleString('en-US', { timeZone }),
        updatedAt: newBooks.updatedAt.toLocaleString('en-US', { timeZone }),
    };
    res.json(formattedBooking);
});
module.exports = router
