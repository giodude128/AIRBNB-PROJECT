const express = require('express')
const { Spot, Review, User, SpotImage, Booking, ReviewImage } = require('../../db/models');
const { requireAuth } = require('../../utils/auth')
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const router = express.Router()



//get all reviews of CU

router.get('/current', requireAuth, async (req, res) => {
    const { user } = req
    const timeZone = 'EST'
    const currentUserReviews = await Review.findAll({
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
    currentUserReviews.forEach((review) => {
        const spot = review.Spot;
        spot.lat = parseFloat(spot.lat);
        spot.lng = parseFloat(spot.lng);
        spot.price = parseFloat(spot.price);
    });
    const fixedReviews = currentUserReviews.map((review) => ({
        ...review.toJSON(),
        createdAt: review.createdAt.toLocaleString('en-US', { timeZone }),
        updatedAt: review.updatedAt.toLocaleString('en-US', { timeZone }),
    }));
    res.status(200).json({ Reviews: fixedReviews })
})


//ADD IMAGE TO THE REVIEW BY USING THE REVIEW ID!!

router.post('/:reviewId/images', requireAuth, async (req, res) => {
    const review = await Review.findByPk(req.params.reviewId)
    const { user } = req
    const timezone = 'EST';
    if (!review) {
        return res.status(404).json({ message: "Review couldn't be found" })
    }
    if (review.userId !== user.id) {
        return res.status(400).json({ message: "Forbidden" })
    }
    const spot = await Spot.findByPk(review.spotId)
    const { url, preview } = req.body
    const otherRevImgs = await ReviewImage.findAll({
        where: { reviewId: review.id }
    })

    if (preview === true) spot.previewImage = url

    if (otherRevImgs.length > 9) {
        return res.status(403).json({ message: "Maximum number of images for this resource was reached" })
    } else {
        let newRevImg = await review.createReviewImage({
            url, reviewId: req.params.reviewId
        })
        newRevImg.createdAt = newRevImg.createdAt.toLocaleString('en-US', { timezone });
        newRevImg.updatedAt = newRevImg.updatedAt.toLocaleString('en-US', { timezone });

        res.status(200).json({
            id: newRevImg.id,
            url: newRevImg.url,
            reviewId: newRevImg.reviewId,
            updatedAt: newRevImg.createdAt.toLocaleString('en-US', { timezone }),
            createdAt: newRevImg.updatedAt.toLocaleString('en-US', { timezone })
        })
    }
})



// EDITING A REVIEW!!
router.put('/:reviewId', requireAuth, async (req, res, next) => {
    const revvws = await Review.findByPk(req.params.reviewId)
    const { user } = req
    const timeZone = 'EST'
    if (!revvws) {
        return res.status(404).json({ message: "Review couldn't be found" })
    }
    if (revvws.userId !== user.id) {
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
    revvws.review = review
    revvws.stars = stars
    await revvws.save()
    const formatRevs = {
        ...revvws.toJSON(),
        updatedAt: revvws.updatedAt.toLocaleString('en-US', { timeZone }),
        createdAt: revvws.createdAt.toLocaleString('en-US', { timeZone })
    }
    res.status(200).json(formatRevs)
})


// DELETING A REVIEW!!

// router.delete('/:reviewId', requireAuth, async (req, res) => {
//     let review = await Review.findByPk(req.params.reviewId)
//     const { user } = req
//     if (!review) {
//         res.status(404).json({ message: "Review couldn't be found" })
//         return
//     }
//     if (review.userId !== user.id) {
//         res.status(403).json({ message: "Forbidden" })
//         return
//     }
//     await review.destroy()
//     res.status(200).json({ message: "Successfully deleted" })
// })


router.delete('/:reviewId', requireAuth, async (req, res) => {
    try {
        let review = await Review.findByPk(req.params.reviewId);
        const { user } = req;

        if (!review) {
            return res.status(404).json({ message: "Review couldn't be found" });
        }

        if (review.userId !== user.id) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await review.destroy();
        return res.status(200).json({ message: "Successfully deleted" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
});



module.exports = router
