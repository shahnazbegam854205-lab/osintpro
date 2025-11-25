const fetch = require('node-fetch');

// Simple in-memory storage for YouTube subscriptions
const youtubeSubscriptions = new Map();

// Rate limiting
const requestCounts = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
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

// YouTube subscription check - IP based for demo
function checkYouTubeAccess(userIdentifier) {
  const userSubscribed = youtubeSubscriptions.get(userIdentifier);
  return userSubscribed && userSubscribed.subscribed === true;
}

// Function to set YouTube subscription status
function setYouTubeSubscription(userIdentifier, status) {
  youtubeSubscriptions.set(userIdentifier, {
    subscribed: status,
    timestamp: Date.now()
  });
}

// Data processing function
function processBackendData(fetchedData) {
  const allRecords = [];
  const data = fetchedData.data || fetchedData;
  
  // Process number_info
  if (data.number_info && Array.isArray(data.number_info)) {
    data.number_info.forEach((item) => {
      if (item && item.name) {
        allRecords.push({
          source: 'telecom',
          name: item.name || 'N/A',
          father_name: item.fname || 'N/A',
          address: item.address || 'N/A',
          mobile: item.alt || 'N/A',
          circle: item.circle || 'N/A',
          id_number: item.id || 'N/A',
          type: 'Telecom Data'
        });
      }
    });
  }
  
  // Process ration data
  if (data.ration && Array.isArray(data.ration)) {
    data.ration.forEach((item) => {
      if (item.data && item.data.memberDetailsList && Array.isArray(item.data.memberDetailsList)) {
        item.data.memberDetailsList.forEach((member) => {
          if (member.memberName) {
            allRecords.push({
              source: 'ration',
              name: member.memberName,
              relationship: member.releationship_name || 'N/A',
              address: item.data.address || 'N/A',
              type: 'Ration Card',
              uid: member.uid || 'N/A',
              member_id: member.memberId || 'N/A'
            });
          }
        });
      }
    });
  }
  
  // Process aadhar data
  if (data.aadhar && Array.isArray(data.aadhar)) {
    data.aadhar.forEach((item) => {
      if (item.data && item.data.success && item.data.result && Array.isArray(item.data.result)) {
        item.data.result.forEach((aadharItem) => {
          if (aadharItem.name) {
            allRecords.push({
              source: 'aadhar',
              name: aadharItem.name,
              father_name: aadharItem.father_name || 'N/A',
              address: aadharItem.address || 'N/A',
              mobile: aadharItem.mobile || 'N/A',
              alt_mobile: aadharItem.alt_mobile || 'N/A',
              circle: aadharItem.circle || 'N/A',
              email: aadharItem.email || 'N/A',
              id_number: aadharItem.id_number || 'N/A',
              type: 'Aadhar Linked'
            });
          }
        });
      }
    });
  }
  
  return allRecords;
}

module.exports = async (req, res) => {
  /* 🌐 CORS SETUP */
  res.setHeader('Access-Control-Allow-Origin', 'https://osintpro.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Set YouTube subscription status (called from frontend)
  if (req.method === 'POST') {
    try {
      const { userIdentifier, subscribed } = req.body;
      setYouTubeSubscription(userIdentifier, subscribed);
      return res.json({ success: true, message: 'Subscription status updated' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Update failed' });
    }
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

  /* 🔓 YOUTUBE SUBSCRIPTION CHECK */
  const userSubscribed = checkYouTubeAccess(clientIP);
  
  if (!userSubscribed) {
    return res.status(403).json({
      success: false,
      message: 'YouTube subscription required. Please subscribe to our channel to access this feature.',
      requiresYouTube: true,
      channelUrl: 'https://www.youtube.com/channel/UCtsoUWStLuvNDZf7A4p_Hw'
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
  console.log(`Processing ${searchType} search for IP ${clientIP}`);

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
    
    console.error('External API failed:', fetchError.message);
    
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again.'
    });
  }

  /* 🎯 SUCCESS RESPONSE */
  const processedData = processBackendData(externalResponse);
  
  res.json({
    success: true,
    search_type: searchType,
    fetched: externalResponse,
    processed_data: processedData,
    developer: 'Happy 😊',
    contact: '@Royal_smart_boy',
    privacy_notice: 'Protect your privacy at: https://otpal.vercel.app',
    message: 'YouTube subscription verified ✅'
  });
};
