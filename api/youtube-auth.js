const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://osintpro.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/youtube.readonly'],
        prompt: 'consent'
      });

      return res.json({ 
        success: true, 
        authUrl 
      });
    } catch (error) {
      console.error('YouTube auth error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate YouTube auth URL' 
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
