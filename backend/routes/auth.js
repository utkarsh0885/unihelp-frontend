const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const tokenController = require('../controllers/tokenController');
const { authenticateUser, authorizeRoles } = require('../middlewares/authMiddleware');
const { body, validationResult } = require('express-validator');

// Validation Middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const signupValidation = [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const profileValidation = [
  body('name').notEmpty().withMessage('Name is required').trim().escape(),
  body('specialisation').optional().isLength({ max: 50 }).withMessage('Specialisation is too long').trim().escape(),
];

// Primary Authentication Routes
router.post('/signup', signupValidation, validate, authController.signup);
router.post('/login', loginValidation, validate, authController.login);
router.put('/profile', authenticateUser, profileValidation, validate, authController.updateProfile);

// Token Rotation & Session Management
router.post('/refresh', tokenController.refresh);
router.post('/logout', tokenController.logout);

// Example of a Protected Route requiring Authentication & Admin Role
router.get('/admin-dashboard', authenticateUser, authorizeRoles('admin'), (req, res) => {
  res.json({
    success: true,
    message: `Welcome to the admin dashboard, ${req.user.role}!`,
    sensitiveData: [1, 2, 3]
  });
});

module.exports = router;
