// routes/posts.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// ── Public routes (no token required) ────────────────────────────────────────
// GET requests are intentionally public so the Home screen loads without auth.
// Mobile/web clients may hit these before the token is attached on first render.
router.get('/', postController.getPosts);
router.get('/saved', authenticateUser, postController.getSavedPosts);
router.get('/:id', postController.getPostById);



// ── Protected routes (token required) ────────────────────────────────────────
router.post('/', authenticateUser, postController.createPost);
router.put('/:id', authenticateUser, postController.updatePost);
router.put('/:id/like', authenticateUser, postController.toggleLike);
router.put('/:id/save', authenticateUser, postController.toggleSave);
router.post('/:id/vote', authenticateUser, postController.votePoll);
router.post('/:id/flag', authenticateUser, postController.flagPost);
router.delete('/:id', authenticateUser, postController.deletePost);

module.exports = router;
