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

module.exports = async (req, res) => {
  /* 🌐 CORS SETUP */
  res.setHeader('Access-Control-Allow-Origin', 'https://osintpro.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
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

  /* 💰 CREDIT MANAGEMENT - BACKEND SE HI */
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
    res.json({
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
    
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.',
      developer: 'Happy 😊'
    });
  }
};
