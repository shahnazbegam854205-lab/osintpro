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
      const { code } = req.query;

      if (!code) {
        return res.redirect('https://osintpro.vercel.app?error=no_code');
      }

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      // Redirect back to app with success and tokens
      const redirectUrl = `https://osintpro.vercel.app?youtube_success=true&access_token=${tokens.access_token}`;
      return res.redirect(redirectUrl);

    } catch (error) {
      console.error('YouTube callback error:', error);
      return res.redirect('https://osintpro.vercel.app?error=auth_failed');
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
};
