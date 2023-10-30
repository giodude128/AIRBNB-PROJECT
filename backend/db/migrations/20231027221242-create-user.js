'use strict';

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.removeConstraint('Spots', 'Spots_ownerId_fkey');
    await queryInterface.removeConstraint('Bookings', 'Bookings_userId_fkey');

    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      username: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true
      },
      firstName: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      lastName: {
        type: Sequelize.STRING(30),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(256),
        allowNull: false,
        unique: true
      },
      hashedPassword: {
        type: Sequelize.STRING.BINARY,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    }, options);
  },

  async down(queryInterface, Sequelize) {
    options.tableName = 'Users';

    // First, drop the "Users" table
    await queryInterface.dropTable(options);

    // Then, re-add the foreign key constraints if needed
    await queryInterface.addConstraint('Spots', {
      fields: ['ownerId'],
      type: 'foreign key',
      name: 'Spots_ownerId_fkey',
      references: {
        table: 'Users',
        field: 'id',
      },
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('Bookings', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'Bookings_userId_fkey',
      references: {
        table: 'Users',
        field: 'id',
      },
      onDelete: 'CASCADE',
    });
  },
};
