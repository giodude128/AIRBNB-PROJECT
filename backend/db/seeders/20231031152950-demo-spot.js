'use strict';

const { Spot } = require('../models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await Spot.bulkCreate([
      {
        ownerId: 1,
        address: '123 Gio street',
        city: 'Los Alamitos',
        state: 'CA',
        country: 'USA',
        lat: 23.56,
        lng: 56.34,
        name: 'GIO',
        description: 'somewhere',
        price: 850000
      },
      {
        ownerId: 2,
        address: '234 Light street',
        city: 'Cerritos',
        state: 'CA',
        country: 'USA',
        lat: 23.23,
        lng: 56.67,
        name: 'Light',
        description: 'where',
        price: 650000
      },
      {
        ownerId: 3,
        address: '123 Z street',
        city: 'Cypress',
        state: 'CA',
        country: 'USA',
        lat: 26.56,
        lng: 86.34,
        name: 'Z',
        description: 'idk',
        price: 950000
      }
    ], options, { validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Spots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      ownerId: { [Op.in]: ['1', '2', '3'] }
    }, {});
  }
};
