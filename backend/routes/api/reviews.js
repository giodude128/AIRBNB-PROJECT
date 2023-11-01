const express = require('express')
const { Spot, Review, User, SpotImage, Booking, ReviewImage } = require('../../db/models');
const { requireAuth } = require('../../utils/auth')
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const router = express.Router()


//get all reviews of CU

router.get('/current', requireAuth, async (req, res) => {
    const { user } = req
    const currUserRevs = await Review.findAll({
        where: {
            userId: user.id
        },
        include: [
            {
                model: User,
                attributes: ['id', 'firstName', 'lastName']
            }, {
                model: Spot,
                attributes: [
                    'id',
                    'ownerId',
                    'address',
                    'city',
                    'state',
                    'country',
                    'lat',
                    'lng',
                    'name',
                    'price',
                    'previewImage'
                ]
            }, {
                model: ReviewImage,
                attributes: ['id', 'url']
            }
        ]
    })
    res.status(200).json({ Reviews: currUserRevs })
})


//edit a review

router.put('/:reviewId', requireAuth, async (req, res, next) => {
    const revs = await Review.findByPk(req.params.reviewId)
    const { user } = req
    if (!revs) {
        res.status(404).json({ message: "Review couldn't be found" })
    }
    if (revs.userId !== user.id) {
        res.status(400).json({ message: "Can only edit your own reviews" })
    }

    const { review, stars } = req.body

    let errors = []

    if (!req.body.review) errors.push("Review text is required")
    if (req.body.stars > 5 || req.body.stars < 1 || !stars) errors.push("Stars must be an integer from 1 to 5")
    if (errors.length > 0) {
        const error = new Error("Validation error")
        err.statusCode = 400
        error.errors = errors
        return next(error)
    }
    revs.review = review
    revs.stars = stars
    await revs.save()
    res.status(200).json(revs)
})


module.exports = router


// create Image for a Review
router.post("/:id/images", requireAuth, async (req, res) => {
    const review = await Review.findByPk(req.params.id)
    const { user } = req
    if (!review) {
        res.status(404).json({
            message: "Review couldn't be found",
            statusCode: 404
    })
    }
    if (review.userId !== user.id) {
        res.json({
            message: "Validation error",
            statusCode: 400,
        })
    }

    const spot = await Spot.findByPk(review.spotId)
    const { url, preview } = req.body
    const prevImgsArr = await Image.findAll({
        where: { reviewId: review.id }
    })

    if (preview === true) {
        spot.previewImage = url
    }

    if (prevImgsArr.length > 9) {
        return res.status(403).json({
            message: "Maximum number of images for this resource was reached",
            statusCode: 403
        })
    } else {
        const newReviewImage = await spot.createImage({
            url, reviewId: +req.params.id
        })
        let id = newReviewImage.id
        newReviewImage.url = url
        let img = { id, url}
        res.status(200).json(img)
    }
});

//Delete a Review-----------------------------------
router.delete('/:id', requireAuth, async (req, res) => {
    let review = await Review.findByPk(req.params.id)
    if (!review) {
        res.status(404).json({
            message: "Review couldn't be found",
            statusCode: 404
        })
    }
    const { user } = req
    if (review.userId !== user.id) {
        res.json({
            message: "Validation error",
            statusCode: 400,
        })
    }
    await review.destroy()
    res.status(200).json({
        message: "Successfully deleted",
        statusCode: 200
    })
});



module.exports = router;
