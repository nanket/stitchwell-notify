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
  cors(req, res, async () => {
    console.log('registerToken called:', { method: req.method, body: req.body, headers: req.headers });
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const parsedBody = parseBody(req);
    console.log('Parsed body:', parsedBody);
    const { userName, token } = parsedBody;
    if (!userName || !token) {
      console.log('Missing required fields:', { userName: !!userName, token: !!token });
      res.status(400).json({ error: 'userName and token are required' });
      return;
    }
    try {
      console.log('Attempting to save to Firestore:', { userName, tokenLength: token.length });
      await db.collection('fcmTokens').doc(userName).set({
        tokens: admin.firestore.FieldValue.arrayUnion(token),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log('Successfully saved token for user:', userName);
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error('registerToken error', e);
      res.status(500).json({ error: 'Failed to register token' });
    }
  });
});

// HTTPS endpoint: Send push by userName (server looks up tokens)
exports.sendPush = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    const { userName, token, title, body, data } = parseBody(req);
    try {
      let tokens = [];
      if (token) {
        tokens = [token];
      } else if (userName) {
        const docSnap = await db.collection('fcmTokens').doc(userName).get();
        tokens = docSnap.exists ? (docSnap.data().tokens || []) : [];
      }
      if (!tokens.length) { res.status(200).json({ ok: 0, message: 'No tokens' }); return; }

      const messaging = admin.messaging();
      const results = await Promise.allSettled(tokens.map(t => messaging.send({
        token: t,
        notification: { title: title || 'StitchWell', body: body || '' },
        data: data || {},
      })));
      const ok = results.filter(r => r.status === 'fulfilled').length;
      res.status(200).json({ ok, total: tokens.length });
    } catch (e) {
      console.error('sendPush error', e);
      res.status(500).json({ error: 'Failed to send push' });
    }
  });
});

// Firestore trigger: push when an item is newly assigned or reassigned
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
