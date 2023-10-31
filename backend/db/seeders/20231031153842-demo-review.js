'use strict';

const { Review } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Review.bulkCreate([
      {
        spotId: 1,
        userId: 11,
        review: 'okay',
        stars: 3
      },
      {
        spotId: 2,
        userId: 22,
        review: 'great',
        stars: 5
      },
      {
        spotId: 3,
        userId: 33,
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
