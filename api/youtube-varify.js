const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// Your YouTube Channel ID
const YOUR_CHANNEL_ID = "UCtsoUWStLuvNDZf7A4p_Hw";

async function checkYouTubeSubscription(accessToken) {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // Get user's channel info
    const userInfo = await youtube.channels.list({
      part: 'snippet',
      mine: true
    });

    const userChannelId = userInfo.data.items[0].id;
    const userEmail = userInfo.data.items[0].snippet.title;

    // Check subscription to your channel
    const subscriptionCheck = await youtube.subscriptions.list({
      part: 'snippet',
      mine: true,
      forChannelId: YOUR_CHANNEL_ID
    });

    const isSubscribed = subscriptionCheck.data.items && subscriptionCheck.data.items.length > 0;
    
    return {
      success: true,
      subscribed: isSubscribed,
      message: isSubscribed ? "Subscribed to channel ✅" : "Not subscribed to channel ❌",
      userEmail: userEmail,
      userChannelId: userChannelId
    };

  } catch (error) {
    console.error('YouTube API error:', error);
    return {
      success: false,
      subscribed: false,
      message: "YouTube verification failed"
    };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://osintpro.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { accessToken, demo } = req.body;

    // Demo mode for testing
    if (demo) {
      return res.json({
        success: true,
        subscribed: true,
        message: "Demo mode - Subscribed to channel ✅",
        userEmail: "demo@example.com",
        userChannelId: "demo_channel"
      });
    }

    if (!accessToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'YouTube access token required' 
      });
    }

    const verificationResult = await checkYouTubeSubscription(accessToken);

    res.json(verificationResult);

  } catch (error) {
    console.error('YouTube verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'YouTube verification failed',
      error: error.message 
    });
  }
};
