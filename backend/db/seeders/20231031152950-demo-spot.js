'use strict';

const { Spot } = require('../models');

let options = {};
if (process.env.NODE_ENV === 'production'){
  options.schema = process.env.SCHEMA;
}

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
        name: 'Gio',
        description: 'somewhere',
        price: 850000,
        previewImage: 'image url'
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
        price: 650000,
        previewImage: 'image url'
      },
      {
        ownerId: 3,
        address: '123 Z street',
        city: 'Cypress',
        state: 'CA',
        country: 'USA',
        lat: 31.5,
        lng: 32.5,
        name: 'Z',
        description: 'idk',
        price: 95,
        previewImage: 'image url'
      }
    ], { validate: true });
  },

  async down (queryInterface, Sequelize) {
    options.tableName = 'Spots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      name: { [Op.in]: ['Gio', 'Light', 'Z'] }
    }, {});
  }
};
