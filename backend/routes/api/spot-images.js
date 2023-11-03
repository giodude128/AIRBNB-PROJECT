const express = require('express')
const { Spot, Review, User, SpotImage, Booking, ReviewImage } = require('../../db/models');
const { requireAuth } = require('../../utils/auth')
const router = express.Router()

router.delete("/:imageId", requireAuth, async (req, res) => {
    const { user } = req
    const img = await SpotImage.findByPk(req.params.imageId, {
        include: { model: Spot, attributes: ['ownerId'] }
    })
    if (!img || !img.Spot) {
        res.status(404).json({ message: "Spot Image couldn't be found" })
        return
    }

    if (img.Spot.ownerId !== user.id) {
        res.status(403).json({ message: "Forbidden" })
        return
    }

    await img.destroy()
    res.status(200).json({ message: "Successfully deleted" })
})

module.exports = router
