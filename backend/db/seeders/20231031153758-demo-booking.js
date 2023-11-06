'use strict';

const { Booking } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Booking.bulkCreate([
      {
        spotId: 1,
        userId: 1,
        startDate: 2011-4-5,
        endDate: 2011-4-6
      },
      {
        spotId: 2,
        userId: 2,
        startDate: 2019-6-7,
        endDate: 2019-6-8
      },
      {
        spotId: 3,
        userId: 3,
        startDate: 2020-7-8,
        endDate: 2020-7-9
      }
    ], options, { validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Bookings';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      spotId: { [Op.in]: ['1', '2', '3'] }
    }, {});
  }
};
