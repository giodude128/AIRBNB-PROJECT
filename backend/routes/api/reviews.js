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


//add an image to a review from reviewId

router.post('/:reviewId/images', requireAuth, async (req, res) => {
    const review = await Review.findByPk(req.params.reviewId)
    const { user } = req
    if (!review) {
        res.status(404).json({ message: "Review couldn't be found" })
    }
    if (review.userId !== user.id) {
        res.status(400).json({ message: "Forbidden" })
    }
    const spot = await Spot.findByPk(review.spotId)
    const { url, preview } = req.body
    const otherRevImgs = await ReviewImage.findAll({
        where: { reviewId: review.id }
    })

    if (preview === true) spot.previewImage = url

    if (otherRevImgs.length > 9) {
        res.status(403).json({ message: "Maximum number of images for this resource was reached" })
    } else {
        let newRevImg = await review.createReviewImage({
            url, reviewId: req.params.reviewId
        })
        res.status(200).json(newRevImg)
    }
})



//edit a review


router.put('/:reviewId', requireAuth, async (req, res, next) => {
    const revs = await Review.findByPk(req.params.reviewId)
    const { user } = req
    if (!revs) {
        return res.status(404).json({ message: "Review couldn't be found" })
    }
    if (revs.userId !== user.id) {
        return res.status(403).json({ message: "Forbidden" })
    }

    const { review, stars } = req.body

    let errors = []

    if (!req.body.review) errors.push("Review text is required")
    if (req.body.stars > 5 || req.body.stars < 1 || !stars) errors.push("Stars must be an integer from 1 to 5")
    if (errors.length > 0) {
        return res.status(400).json({
            message: "Bad Request", errors: {
                review: errors[0],
                stars: errors[1]
            }
        })
    }
    revs.review = review
    revs.stars = stars
    await revs.save()
    res.status(200).json(revs)
})


//delete a review

router.delete('/:reviewId', requireAuth, async (req, res) => {
    let review = await Review.findByPk(req.params.reviewId)
    const { user } = req
    if (!review) {
        res.status(404).json({ message: "Review couldn't be found" })
    }
    if (review.userId !== user.id) {
        res.status(400).json({ message: "Forbidden" })
    }
    await review.destroy()
    res.status(200).json({ message: "Successfully deleted" })
})

module.exports = router
