const express = require('express');
const bcrypt = require('bcryptjs');

const { setTokenCookie, requireAuth } = require('../../utils/auth');
const { User } = require('../../db/models');

// const router = express.Router();

// backend/routes/api/users.js
// ...
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
// ...

// backend/routes/api/users.js
// const express = require('express')
const router = express.Router();

// backend/routes/api/users.js
// ...



// backend/routes/api/users.js
// ...
const validateSignup = [
  check('email')
    .exists({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email.'),
  check('username')
    .exists({ checkFalsy: true })
    .isLength({ min: 4 })
    .withMessage('Please provide a username with at least 4 characters.'),
  check('username')
    .not()
    .isEmail()
    .withMessage('Username cannot be an email.'),
  check('password')
    .exists({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage('Password must be 6 characters or more.'),
  check("firstName")
    .exists({ checkFalsy: true })
    .withMessage('First name is required'),
  check("lastName")
    .exists({ checkFalsy: true })
    .withMessage('Last name is required'),

  handleValidationErrors
];










// Sign up
router.post(
    '/',
    validateSignup,
    async (req, res) => {
      const { email, password, username, firstName, lastName } = req.body;
      const hashedPassword = bcrypt.hashSync(password);
      const user = await User.create({ email, username, firstName, lastName, hashedPassword });

      const safeUser = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
    };

      await setTokenCookie(res, safeUser);

      return res.json({
        user: safeUser
      });
    }
  );


//   // Log in a user
router.post('/api/session', async (req, res) => {
  const { credential, password } = req.body;

  try {
    // Validate the request body
    if (!credential || !password) {
      return res.status(400).json({
        message: 'Bad Request',
        errors: {
          credential: 'Email or username is required',
          password: 'Password is required',
        },
      });
    }

    // Find the user by email or username
    const user = await User.findOne({
      where: {
        [User.sequelize.Op.or]: [{ email: credential }, { username: credential }],
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check the password
    if (!bcrypt.compareSync(password, user.hashedPassword)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful login
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: user.username,
    };

    return res.status(200).json({ user: userData });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});




module.exports = router;
