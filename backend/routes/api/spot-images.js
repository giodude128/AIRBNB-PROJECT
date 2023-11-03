const express = require('express')
const { requireAuth } = require('../../utils/auth');

const { Spot, User, Image, Review} = require("../../db/models");

const sequelize = require('sequelize')
const Op = sequelize.Op
const router = express.Router();

//Delet a Spot Image
router.delete("/:imageId", requireAuth, async(req, res) => {
    const image = await Image.findByPk(req.params.id,
        {
            include: {model:Spot}
        })
    if (!image || !image.Spot) {
        res.status(404).json({
            message: "Spot Image couldn't be found",
            statusCode: 404
        })
        return
    }
    const { user } = req

    if (image.Spot.ownerId !== user.id) {
        res.json({
            message: "Validation error",
            statusCode: 400,
        })
        return
    }
    await image.destroy()
    res.status(200).json({
        message: "Successfully deleted",
        statusCode: 200
    })
});


module.exports = router;
