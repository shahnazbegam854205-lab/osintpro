const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Firebase Admin with Environment Variables ONLY
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      "type": "service_account",
      "project_id": process.env.FIREBASE_PROJECT_ID,
      "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
      "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : "",
      "client_email": process.env.FIREBASE_CLIENT_EMAIL,
      "client_id": process.env.FIREBASE_CLIENT_ID,
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL
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

  /* 💰 CREDIT MANAGEMENT */
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
        remaining_credits: currentCredits
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
