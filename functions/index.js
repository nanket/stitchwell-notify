const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// Helper to parse JSON body safely
function parseBody(req) {
  try { return typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch { return {}; }
}

// HTTPS endpoint: Register a user's token (fan-out per user)
exports.registerToken = functions.https.onRequest((req, res) => {
  // Set CORS headers manually for better compatibility
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  cors(req, res, async () => {
    try {
      console.log('registerToken called:', {
        method: req.method,
        contentType: req.get('content-type'),
        bodyType: typeof req.body,
        body: req.body,
        query: req.query,
        rawBody: req.rawBody ? req.rawBody.toString() : 'none'
      });

      // Support both POST and GET methods
      let userName, token;

      if (req.method === 'POST') {
        const parsedBody = parseBody(req);
        console.log('Parsed POST body:', parsedBody);
        userName = parsedBody.userName;
        token = parsedBody.token;
      } else if (req.method === 'GET') {
        console.log('GET query params:', req.query);
        userName = req.query.userName;
        token = req.query.token;
      } else {
        console.log('Method not allowed:', req.method);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      if (!userName || !token) {
        console.log('Missing required fields:', { userName: !!userName, token: !!token });
        res.status(400).json({
          error: 'userName and token are required',
          received: { userName: !!userName, token: !!token }
        });
        return;
      }

      console.log('Attempting to save to Firestore:', { userName, tokenLength: token.length });
      await db.collection('fcmTokens').doc(userName).set({
        tokens: admin.firestore.FieldValue.arrayUnion(token),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      console.log('Successfully saved token for user:', userName);
      res.status(200).json({ ok: true, message: 'Token registered successfully' });

    } catch (e) {
      console.error('registerToken error:', e);
      res.status(500).json({ error: 'Failed to register token', details: e.message });
    }
  });
});

// HTTPS endpoint: Send push by userName (server looks up tokens)
exports.sendPush = functions.https.onRequest((req, res) => {
  // Set CORS headers manually for better compatibility
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  cors(req, res, async () => {
    let userName, token, title, body, data;
    if (req.method === 'POST') {
      ({ userName, token, title, body, data } = parseBody(req));
    } else if (req.method === 'GET') {
      userName = req.query.userName;
      token = req.query.token;
      title = req.query.title;
      body = req.query.body;
      data = undefined;
    } else {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    try {
      let tokens = [];
      if (token) {
        tokens = [token];
      } else if (userName) {
        const docSnap = await db.collection('fcmTokens').doc(userName).get();
        tokens = docSnap.exists ? (docSnap.data().tokens || []) : [];
      }
      if (!Array.isArray(tokens)) tokens = [];
      tokens = tokens.filter(Boolean).map(t => String(t));
      if (!tokens.length) { res.status(200).json({ ok: 0, message: 'No tokens' }); return; }

      const messaging = admin.messaging();
      const safeData = {};
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) safeData[k] = String(v);
      }
      const results = await Promise.allSettled(tokens.map(t => messaging.send({
        token: t,
        notification: { title: title || 'StitchWell', body: body || '' },
        data: safeData,
      })));
      const ok = results.filter(r => r.status === 'fulfilled').length;
      res.status(200).json({ ok, total: tokens.length });
    } catch (e) {
      console.error('sendPush error', e);
      res.status(500).json({ error: 'Failed to send push' });
    }
  });
});

// Backward/alternate name for the same handler (matches your deployed name)
exports.sendTestNotification = exports.sendPush;


// Firestore trigger: push when an item is newly assigned or reassigned
// TODO: Fix for firebase-functions v6 syntax
/*
exports.onClothItemWrite = functions.firestore
  .document('clothItems/{id}')
  .onWrite(async (change, context) => {
    try {
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;
      if (!after) return; // deleted
      const beforeAssignee = before?.assignedTo || null;
      const afterAssignee = after.assignedTo || null;
      if (afterAssignee && beforeAssignee !== afterAssignee) {
        const tokensDoc = await db.collection('fcmTokens').doc(afterAssignee).get();
        const tokens = tokensDoc.exists ? (tokensDoc.data().tokens || []) : [];
        if (!tokens.length) return;
        const title = 'New Task Assigned';
        const body = `Item ${after.billNumber || ''} (${after.type || ''}) assigned for ${after.status || ''}`;
        await Promise.allSettled(tokens.map(t => admin.messaging().send({
          token: t,
          notification: { title, body },
          data: { itemId: context.params.id || '' }
        })));
      }
    } catch (e) {
      console.error('onClothItemWrite push error', e);
    }
  });
*/
