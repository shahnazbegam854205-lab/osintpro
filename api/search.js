const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Firebase Admin with Environment Variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      "type": "service_account",
      "project_id": process.env.FIREBASE_PROJECT_ID || "happy-8530b",
      "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID || "37828f9300bb492ec95b980145d1a22a11b7a938",
      "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDj7IvmdbCrsLaT\ngZtFhhEOIftExX2NOHrrgToeBazriZ9h/GuGt9hUqCSXOV3eWAk0KanwYHX1ikTC\n+x0Qx2enzVA9HGPgokdUzax66AltXGeIbGESKRQCSMQMCYqq2gA3zyPw++1dE8rX\nxRVU38fPsj3peGSRb3fu7/zidxd+ubMCtsN96Gtia6OuecEJ9mPEiBEg9GofUxUu\nS+msgf/wH7kcVsumaX/vfCo+Y8R992+MsRaOSBnTQJ9xxfESZD0x7cCuRm7/FvOc\nFuw5dBy0XoQa2y4av9d3qD6FcAKlUjAxq+rERCpbT8t0RImOp7KHY5Bal3elSWLx\nROT1ijALAgMBAAECggEAE9CROwhZQxvaS4mVd55XpjxjDVAEAb56xTWXWVvR9Coj\nPpAEwxIBjx6NC86TcAyERFIo8XpZVu7d2nudQ8OqKcbqJl3s+u7wt5kn2QmKJEVH\nxO7zI3KJyEcOMCO2N/M62J879yvXr2NUm5yJJbdMtiw/QKhUSeaAbTfU6tVCqCQP\nu3irr12v8ZGxT8IwKMorrNE31Tp3juhwSEO2UHk613JLaTQZyamvw+dgLj9OZTIe\nuV8o1if9u+etpP4YiRMIE2G2uG23LKwhAAvfoHIclccY0cISCOP6/KVR6EGiHf8o\nFFv6E2HRwALYlYlJv9IVlMtUqswg/PcRlYqJKtXr1QKBgQD5wl4w2IajMPgiSa9A\nTwTb1/d+n9aBw9+JiMJwnqwiUWvxTvZwbYkfEe8DjR8Mlocg93mFbqjZ2J/sdc+J\n69wTl22dqRDsjAg2A0BX1aLAGz2NQ96JrPqQNuYDKBjjSjLGscJ4hn2briykIAmM\n58BIoYSeRNVLQp+9kB8TCLr7zwKBgQDpnoFdMqGjj+RhRQBsyAx94eAvXUUkklu+\n1maaI1sY7BdsbuJHDu8ByQiZFXHkHfaFvL1usQHbrErxuVzNOnTKQwFEST0qdIbW\nCDrzLpuN5L26QWnKmasiJ+uFoj3gWv+ByOEAgJgdOwz5tLSD3rHKr9gYYj3s+23L\nXVK4XVCrBQKBgG9bPevBXqY8GyYOfFjL4nqym+KVGWraDjygATF9TXovm1UHw9D0\nxYJY2JxYu1M9eho0vLXFVPtsHkGrdVElHAaQKYt16dnNxYtvf6ypz9qfSp5FeF8i\nBMVv9LXLlu0gE+uLLg3WyQI0cirrLdbpLU401ZBLWF4p4lb+fxxZdCT5AoGAS3Qt\nVhuXR0ufOKdfpsLJ/hJpJQMb5N78kNuQkfIfZyJBwnzhyo+RNGNoyoC5ozLmP3Wh\nPVIgRoIURpRW29YoiHcxvotlHQQ71H8eAxMnnKGngbPE5nHRaxu3nxayo3bglVt7\nCH2AI9jBrRjnQLw5cjxvMBjy5UqjwI4ovHEvL70CgYAkU2jJBYFMuuconYx4gciV\nX5mPKtTtGYe1F5fCzOzpprDZBAW4V+ysGiWiDWjOoZoPaNSFADNG36ecWfYBBAw7\nzd19Dq9hcT0Xs8GJNJbgjbHrWU7H7vBEuauP0kpp5vhnG7NV7An4fuKXlzWYME3V\nNaWFanqKM00QegqbrLvNbg==\n-----END PRIVATE KEY-----\n",
      "client_email": process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@happy-8530b.iam.gserviceaccount.com",
      "client_id": process.env.FIREBASE_CLIENT_ID || "115831601301588745263",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL || "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40happy-8530b.iam.gserviceaccount.com"
    }),
    databaseURL: "https://happy-8530b-default-rtdb.firebaseio.com"
  });
  console.log("Firebase Admin initialized successfully");
}

// Rate limiting
const requestCounts = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         'unknown';
}

function rateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  
  let requests = requestCounts.get(ip) || [];
  requests = requests.filter(time => time > windowStart);
  
  if (requests.length >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  requests.push(now);
  requestCounts.set(ip, requests);
  return true;
}

function validateInput(input, type) {
  if (!input) return false;
  const cleanInput = input.replace(/\D/g, '');
  
  if (type === 'phone') {
    return cleanInput.length === 10 && ['6','7','8','9'].includes(cleanInput[0]);
  }
  
  if (type === 'aadhaar') {
    return cleanInput.length === 12;
  }
  
  return false;
}

// ✅ BAD WORDS FILTER
const badWords = [
  'fuck', 'lund', 'chod', 'madarchod', 'bhosdike', 'behenchod', 
  'gaand', 'chutiya', 'kutta', 'kamine', 'lavde', 'randi',
  'rand', 'bhenchod', 'bsdk', 'mc', 'bc', 'gandu',
  'prostitute', 'whore', 'slut', 'asshole', 'bitch', 
  'dick', 'pussy', 'sex', 'fucking', 'bastard',
  'motherfucker', 'shit', 'ass', 'dickhead'
];

function containsBadWords(text) {
  if (!text || typeof text !== 'string') return false;
  return badWords.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
}

// ✅ CHECK IF USER IS BANNED
async function isUserBanned(userId) {
  try {
    const banRef = admin.database().ref('banned_users/' + userId);
    const snapshot = await banRef.once('value');
    return snapshot.exists();
  } catch (error) {
    console.error('Error checking ban status:', error);
    return false;
  }
}

// ✅ ADD WARNING TO USER
async function addWarning(userId, reason) {
  try {
    const warningRef = admin.database().ref('user_warnings/' + userId);
    const snapshot = await warningRef.once('value');
    const currentWarnings = snapshot.val() || 0;
    
    await warningRef.set(currentWarnings + 1);
    
    // Log the warning
    await admin.database().ref('admin_logs').push().set({
      action: 'warning',
      userId: userId,
      reason: reason,
      timestamp: admin.database.ServerValue.TIMESTAMP,
      warningsCount: currentWarnings + 1
    });
    
    console.log(`Warning added to user ${userId}. Total warnings: ${currentWarnings + 1}`);
    
    // Auto-ban after 3 warnings
    if (currentWarnings + 1 >= 3) {
      await admin.database().ref('banned_users/' + userId).set({
        banned: true,
        reason: 'Multiple warnings - Auto ban',
        bannedAt: admin.database.ServerValue.TIMESTAMP,
        bannedBy: 'system'
      });
      console.log(`User ${userId} auto-banned due to multiple warnings`);
    }
    
    return currentWarnings + 1;
  } catch (error) {
    console.error('Error adding warning:', error);
    return 0;
  }
}

module.exports = async (req, res) => {
  /* 🌐 CORS SETUP */
  res.setHeader('Access-Control-Allow-Origin', 'https://osintpro.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  /* 🔐 SECURITY CHECKS */
  const clientIP = getClientIP(req);
  
  if (!rateLimit(clientIP)) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }

  /* 🔑 AUTHENTICATION CHECK */
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please login again.'
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let userId;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    userId = decodedToken.uid;
    
    if (!decodedToken.email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email not verified. Please verify your email first.'
      });
    }
  } catch (authError) {
    console.error('Auth error:', authError);
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token. Please login again.'
    });
  }

  /* 🚫 CHECK IF USER IS BANNED */
  try {
    const isBanned = await isUserBanned(userId);
    if (isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been banned. Please contact support.'
      });
    }
  } catch (banCheckError) {
    console.error('Ban check error:', banCheckError);
    // Continue even if ban check fails
  }

  // ✅ NEW: GET ALL USERS ENDPOINT
  if (req.method === 'GET' && req.url === '/api/search/users') {
    try {
      const usersRef = admin.database().ref('users');
      const snapshot = await usersRef.once('value');
      const users = snapshot.val();

      const usersList = [];
      Object.entries(users || {}).forEach(([uid, userData]) => {
        if (uid !== userId) { // Don't include current user
          usersList.push({
            uid: uid,
            name: userData.name || 'Unknown User',
            email: userData.email || '',
            credits: userData.credits || 0,
            profile: userData.profile || {},
            createdAt: userData.createdAt || Date.now(),
            isOnline: userData.isOnline || false
          });
        }
      });

      return res.json({
        success: true,
        users: usersList,
        total_users: usersList.length
      });

    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to get users' 
      });
    }
  }

  // ✅ NEW: SEND CHAT MESSAGE ENDPOINT
  if (req.method === 'POST' && req.url === '/api/search/send-message') {
    try {
      const { toUserId, message } = req.body;
      
      if (!toUserId || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'User ID and message are required' 
        });
      }

      if (message.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Message cannot be empty' 
        });
      }

      // 🚫 CHECK FOR BAD WORDS
      if (containsBadWords(message)) {
        const warningCount = await addWarning(userId, 'Used bad words in chat');
        return res.status(400).json({
          success: false,
          message: `Inappropriate content detected. Warning ${warningCount}/3.`,
          warning_issued: true,
          warnings_count: warningCount
        });
      }

      // Check if target user exists
      const targetUserRef = admin.database().ref('users/' + toUserId);
      const targetUserSnapshot = await targetUserRef.once('value');
      
      if (!targetUserSnapshot.exists()) {
        return res.status(404).json({ 
          success: false, 
          message: 'Target user not found' 
        });
      }

      // Get current user info
      const userRef = admin.database().ref('users/' + userId);
      const userSnapshot = await userRef.once('value');
      const userData = userSnapshot.val();
      const userName = userData?.name || 'Unknown User';

      // Create chat ID (sorted to ensure consistency)
      const chatId = [userId, toUserId].sort().join('_');
      
      // Save message to Firebase Realtime Database
      const messageData = {
        text: message.trim(),
        senderId: userId,
        senderName: userName,
        timestamp: admin.database.ServerValue.TIMESTAMP,
        read: false,
        expiresAt: Date.now() + (3 * 60 * 1000) // 3 minutes from now
      };

      const chatRef = admin.database().ref('chats/' + chatId + '/messages');
      const newMessageRef = chatRef.push();
      
      await newMessageRef.set(messageData);

      // ✅ AUTO-DELETE AFTER 3 MINUTES
      setTimeout(async () => {
        try {
          await newMessageRef.remove();
          console.log(`Auto-deleted message: ${newMessageRef.key}`);
        } catch (error) {
          console.error('Error auto-deleting message:', error);
        }
      }, 3 * 60 * 1000); // 3 minutes

      // Update both users' chat lists
      const userChatRef = admin.database().ref('user_chats/' + userId + '/' + toUserId);
      const targetChatRef = admin.database().ref('user_chats/' + toUserId + '/' + userId);
      
      const chatInfo = {
        lastMessage: message.trim(),
        lastMessageTime: admin.database.ServerValue.TIMESTAMP,
        unreadCount: admin.database.ServerValue.increment(1),
        participantId: toUserId,
        participantName: targetUserSnapshot.val().name || 'Unknown User',
        participantAvatar: targetUserSnapshot.val().profile?.profilePic || ''
      };

      await userChatRef.set({
        ...chatInfo,
        unreadCount: 0 // For sender, unread count is 0
      });

      await targetChatRef.set({
        ...chatInfo,
        participantId: userId,
        participantName: userName,
        participantAvatar: userData.profile?.profilePic || ''
      });

      return res.json({
        success: true,
        message: 'Message sent successfully!',
        message_id: newMessageRef.key,
        chat_id: chatId,
        expires_in: '3 minutes'
      });

    } catch (error) {
      console.error('Chat message error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message: ' + error.message
      });
    }
  }

  // ✅ NEW: GET CHAT MESSAGES ENDPOINT
  if (req.method === 'GET' && req.url === '/api/search/get-messages') {
    try {
      const { targetUserId } = req.query;
      
      if (!targetUserId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Target user ID is required' 
        });
      }

      // Create chat ID (sorted to ensure consistency)
      const chatId = [userId, targetUserId].sort().join('_');
      
      // Get messages from Firebase
      const messagesRef = admin.database().ref('chats/' + chatId + '/messages');
      const snapshot = await messagesRef.orderByChild('timestamp').limitToLast(50).once('value');
      
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        const messageData = childSnapshot.val();
        // Check if message is expired
        if (messageData.expiresAt > Date.now()) {
          messages.push({
            id: childSnapshot.key,
            ...messageData
          });
        }
      });

      // Mark messages as read
      const updates = {};
      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().senderId !== userId && !childSnapshot.val().read) {
          updates[childSnapshot.key + '/read'] = true;
        }
      });

      if (Object.keys(updates).length > 0) {
        await messagesRef.update(updates);
      }

      return res.json({
        success: true,
        messages: messages.reverse(), // Latest messages last
        chat_id: chatId
      });

    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get messages: ' + error.message
      });
    }
  }

  // ✅ ORIGINAL SEARCH FUNCTIONALITY (UNCHANGED)
  try {
    const userRef = admin.database().ref('users/' + userId);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    const currentCredits = userData.credits || 0;
    
    if (currentCredits <= 0) {
      return res.status(402).json({
        success: false,
        message: 'Insufficient credits. Please purchase more credits to continue.',
        remaining_credits: 0
      });
    }

    /* ⚙️ INPUT VALIDATION */
    let { number, aadhaar } = req.query;

    if (!number && !aadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Either phone number or Aadhaar number is required'
      });
    }

    if (number && aadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Provide either phone number OR Aadhaar number, not both'
      });
    }

    let apiUrl, searchType, validatedInput;

    if (number) {
      if (!validateInput(number, 'phone')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Must be 10 digits starting with 6,7,8,9'
        });
      }
      apiUrl = `https://all-in-one-personal-api.vercel.app/api/aggregate?number=${number}`;
      searchType = 'phone';
      validatedInput = number.replace(/\D/g, '');
    } else {
      if (!validateInput(aadhaar, 'aadhaar')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Aadhaar number format. Must be 12 digits'
        });
      }
      apiUrl = `https://all-in-one-personal-api.vercel.app/api/aggregate?aadhaar=${aadhaar}`;
      searchType = 'aadhaar';
      validatedInput = aadhaar.replace(/\D/g, '');
    }

    /* 🚫 CHECK FOR BAD WORDS IN SEARCH INPUT */
    const searchQuery = number || aadhaar;
    if (containsBadWords(searchQuery)) {
      const warningCount = await addWarning(userId, 'Used bad words in search');
      return res.status(400).json({
        success: false,
        message: `Inappropriate content detected. Warning ${warningCount}/3.`,
        warning_issued: true,
        warnings_count: warningCount
      });
    }

    /* 🌐 EXTERNAL API CALL */
    console.log(`Processing ${searchType} search for user ${userId}, Credits before: ${currentCredits}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let externalResponse;
    
    try {
      const response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HappyOSINT-Backend/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`);
      }

      externalResponse = await response.json();
      
      if (!externalResponse || typeof externalResponse !== 'object') {
        throw new Error('Invalid response from external API');
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // External API failed - DON'T deduct credits
      console.error('External API failed, credits not deducted:', fetchError.message);
      
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again.',
        remaining_credits: currentCredits // Credits intact
      });
    }

    /* 💸 CREDIT DEDUCTION - ONLY WHEN SUCCESSFUL */
    const newCredits = currentCredits - 1;
    
    try {
      await userRef.update({ 
        credits: newCredits,
        lastSearch: {
          type: searchType,
          input: validatedInput.substring(0, 3) + '***',
          timestamp: admin.database.ServerValue.TIMESTAMP
        }
      });
      
      console.log(`Credits deducted for user ${userId}. New balance: ${newCredits}`);

    } catch (dbError) {
      console.error('Credit deduction failed:', dbError);
      // Even if credit update fails, return data but log the error
    }

    /* 🎯 SUCCESS RESPONSE */
    return res.json({
      success: true,
      search_type: searchType,
      credits_used: 1,
      remaining_credits: newCredits,
      fetched: externalResponse,
      developer: 'Happy 😊',
      contact: '@Royal_smart_boy',
      privacy_notice: 'Protect your privacy at: https://otpal.vercel.app'
    });

  } catch (error) {
    console.error('Server error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.',
      developer: 'Happy 😊'
    });
  }
};
