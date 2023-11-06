'use strict';

const { Review } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Review.bulkCreate([
      {
        spotId: 1,
        userId: 1,
        review: 'okay',
        stars: 3
      },
      {
        spotId: 2,
        userId: 2,
        review: 'great',
        stars: 5
      },
      {
        spotId: 3,
        userId: 3,
        review: 'horrible',
        stars: 1
      }
    ], options, { validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Reviews';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      review: { [Op.in]: ['okay', 'great', 'horrible'] }
    }, {});

  }
};
