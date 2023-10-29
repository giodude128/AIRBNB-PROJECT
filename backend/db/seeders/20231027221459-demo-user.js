'use strict';

const { User } = require('../models');
const bcrypt = require("bcryptjs");
const user = require('../models/user');

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await User.bulkCreate([
      {
        email: 'demo@user.com',
        firstName: 'Demo',
        lastName: 'User',
        username: 'Demo-lisher',
        hashedPassword: bcrypt.hashSync('demopass')
      },
      {
        email: 'email@email.email',
        firstName: 'User',
        lastName: 'name',
        username: 'username',
        hashedPassword: bcrypt.hashSync('hashedpass')
      }
    ], { validate: true })
  },

  async down(queryInterface, Sequelize) {

    options.tableName = 'Users';
    const Op = Sequelize.Op;

    return queryInterface.bulkDelete(options, {
      username: { [Op.in]: ['Demo-lisher', 'username'] }
    }, {});
  }
};
