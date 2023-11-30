const express = require('express');
const bcrypt = require('bcryptjs');
const { setTokenCookie} = require('../../utils/auth');
const { User } = require('../../db/models');
const { check } = require('express-validator');
const { handleValidationErrors } = require('../../utils/validation');
const router = express.Router();


const validateSignup = [
  check('email')
    .exists({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email'),
  check('username')
    .exists({ checkFalsy: true })
    .isLength({ min: 4 })
    .withMessage('Username is required'),
  check('username')
    .not()
    .isEmail()
    .withMessage('Username cannot be an email.'),
  // check('password')
  //   .exists({ checkFalsy: true })
  //   .isLength({ min: 6 })
  //   .withMessage('Password must be 6 characters or more.'),
  check("firstName")
    .exists({ checkFalsy: true })
    .withMessage('First name is required'),
  check("lastName")
    .exists({ checkFalsy: true })
    .withMessage('Last name is required'),

  handleValidationErrors
];

// SIGN UP NEW USER!!
router.post(
    '/',
    validateSignup,
    async (req, res) => {
      const { email, password, username, firstName, lastName } = req.body;
      const hashedPassword = bcrypt.hashSync(password);
      const user = await User.create({ email, username, firstName, lastName, hashedPassword });
      const safeUsers = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username
    };
      await setTokenCookie(res, safeUsers);
      return res.json({
        user: safeUsers
      });
    }
  );

module.exports = router;
