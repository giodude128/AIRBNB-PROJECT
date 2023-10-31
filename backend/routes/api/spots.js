const { Spot } = require('../../db/models'); //

const express = require('express');
const router = express.Router();


router.get('/', async(req, res) => {
const vari = await Spot.findAll()
return res.json({
    Spots: vari
})

})

// router.get('/current', async(req, res) => {
//     const vari = await Spot.findAll()
//     return res.json({
//         Spots: vari
//     })
//  })


module.exports = router;
