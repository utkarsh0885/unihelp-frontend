/**
 * controllers/adminController.js
 *
 * Implements actual admin database operations for system statistics,
 * retrieving flagged posts from the 'reports' collection, and deleting/dismissing them.
 */

const { db } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const postsSnapshot = await db.collection('posts').get();
    const usersSnapshot = await db.collection('users').get();
    
    res.json({
      users: usersSnapshot.size,
      posts: postsSnapshot.size,
      messages: 0,
      banned: 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.updateUserStatus = async (req, res) => {
  res.json({ success: true, message: 'User status updated' });
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    await db.collection('posts').doc(postId).delete();

    // Resolve reports related to this post
    const reportsSnapshot = await db.collection('reports')
      .where('targetId', '==', postId)
      .where('status', '==', 'pending')
      .get();

    if (!reportsSnapshot.empty) {
      const batch = db.batch();
      reportsSnapshot.forEach((doc) => {
        batch.update(doc.ref, { status: 'resolved', resolvedAt: new Date().toISOString() });
      });
      await batch.commit();
    }

    res.json({ success: true, message: 'Post deleted by admin' });
  } catch (error) {
    console.error('[Admin] Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

exports.getFlaggedPosts = async (req, res) => {
  try {
    const reportsSnapshot = await db.collection('reports')
      .where('status', '==', 'pending')
      .get();

    const reportsList = [];
    for (const docSnap of reportsSnapshot.docs) {
      const reportData = docSnap.data();
      const reportId = docSnap.id;

      // 1. Fetch reporter user details
      let reporterInfo = { id: reportData.reporter, name: 'User' };
      if (reportData.reporter) {
        try {
          const reporterDoc = await db.collection('users').doc(reportData.reporter).get();
          if (reporterDoc.exists) {
            reporterInfo = {
              id: reportData.reporter,
              name: reporterDoc.data().name || 'Student',
            };
          }
        } catch (e) {
          console.warn(`[Admin] Failed to fetch reporter ${reportData.reporter}:`, e.message);
        }
      }

      // 2. Fetch target post details
      let targetPostInfo = null;
      if (reportData.targetId && reportData.targetType === 'post') {
        try {
          const postDoc = await db.collection('posts').doc(reportData.targetId).get();
          if (postDoc.exists) {
            const postData = postDoc.data();
            targetPostInfo = {
              _id: postDoc.id,
              id: postDoc.id,
              title: postData.title || '',
              content: postData.content || '',
              authorName: postData.authorName || 'Anonymous',
            };
          }
        } catch (e) {
          console.warn(`[Admin] Failed to fetch target post ${reportData.targetId}:`, e.message);
        }
      }

      if (targetPostInfo) {
        reportsList.push({
          _id: reportId,
          id: reportId,
          ...reportData,
          reporter: reporterInfo,
          targetId: targetPostInfo,
        });
      }
    }

    res.json(reportsList);
  } catch (error) {
    console.error('[Admin] Error fetching flagged posts:', error);
    res.status(500).json({ error: 'Failed to fetch flagged posts' });
  }
};

exports.dismissReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    await db.collection('reports').doc(reportId).update({
      status: 'dismissed',
      resolvedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Report dismissed' });
  } catch (error) {
    console.error('[Admin] Error dismissing report:', error);
    res.status(500).json({ error: 'Failed to dismiss report' });
  }
};
