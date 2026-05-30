const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static('public'));

// Helper to construct Axios configuration with optional token
function getGithubConfig(req) {
  const config = {};
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    config.headers = {
      Authorization: `token ${token}`
    };
  } else if (process.env.GITHUB_TOKEN) {
    config.headers = {
      Authorization: `token ${process.env.GITHUB_TOKEN}`
    };
  }
  return config;
}

// Endpoint to handle GitHub OAuth exchange
app.post('/api/auth/github', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'OAuth code is required' });
  }
  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });
    
    if (response.data.error) {
      return res.status(400).json({ error: response.data.error_description });
    }
    
    res.json({ access_token: response.data.access_token });
  } catch (error) {
    console.error('❌ API: Error exchanging OAuth code:', error.message);
    res.status(500).json({ error: 'Failed to exchange OAuth code' });
  }
});

// Score & Grade Calculator Helper
function calculateDeveloperGrade(score) {
  if (score >= 1000) return 'S';
  if (score >= 500) return 'A+';
  if (score >= 250) return 'A';
  if (score >= 100) return 'B+';
  if (score >= 50) return 'B';
  return 'C';
}

// Helper to calculate synergy users (commit/fork/languages overlaps + follower overlaps)
async function calculateSynergy(profileId, username, githubConfig) {
  let synergyUsers = [];
  try {
    // 1. Fetch other profiles in the database
    const otherProfiles = await db.query('SELECT * FROM profiles WHERE id != ?', [profileId]);
    if (otherProfiles.length === 0) return [];
    
    // 2. Fetch active profile's repositories & languages
    const [myRepos, myLanguages] = await Promise.all([
      db.query('SELECT repo_name, forks, stars FROM repositories WHERE profile_id = ?', [profileId]),
      db.query('SELECT language FROM languages WHERE profile_id = ?', [profileId])
    ]);
    
    const myRepoNames = myRepos.map(r => r.repo_name.toLowerCase());
    const myLangNames = myLanguages.map(l => l.language.toLowerCase());

    const synergyList = [];

    // 3. Fetch followers & following list in parallel to discover network matches
    let connectionLogins = [];
    try {
      const [followersRes, followingRes] = await Promise.all([
        axios.get(`https://api.github.com/users/${username}/followers?per_page=100`, githubConfig),
        axios.get(`https://api.github.com/users/${username}/following?per_page=100`, githubConfig)
      ]);
      
      const followers = (followersRes.data || []).map(f => f.login.toLowerCase());
      const following = (followingRes.data || []).map(f => f.login.toLowerCase());
      connectionLogins = Array.from(new Set([...followers, ...following]));
    } catch (apiErr) {
      console.warn(`⚠️ Synergy API: GitHub rate limits or connection issue for ${username}. Using database overlaps only.`);
    }

    // 4. Batch fetch all repositories and languages to avoid the O(N) database query loop
    const otherProfileIds = otherProfiles.map(op => op.id);
    let allRepos = [];
    let allLanguages = [];
    if (otherProfileIds.length > 0) {
      // Dialect-safe queries (Postgres/MySQL compatible)
      const placeHolders = otherProfileIds.map((_, i) => db.isPostgres ? `$${i+1}` : '?').join(',');
      allRepos = await db.query(`SELECT profile_id, repo_name, forks, stars FROM repositories WHERE profile_id IN (${placeHolders})`, otherProfileIds);
      allLanguages = await db.query(`SELECT profile_id, language FROM languages WHERE profile_id IN (${placeHolders})`, otherProfileIds);
    }

    const reposByProfile = {};
    const langsByProfile = {};
    allRepos.forEach(r => {
      if (!reposByProfile[r.profile_id]) reposByProfile[r.profile_id] = [];
      reposByProfile[r.profile_id].push(r);
    });
    allLanguages.forEach(l => {
      if (!langsByProfile[l.profile_id]) langsByProfile[l.profile_id] = [];
      langsByProfile[l.profile_id].push(l);
    });

    for (const op of otherProfiles) {
      const isConnectedNode = connectionLogins.includes(op.username.toLowerCase());
      
      const opRepos = reposByProfile[op.id] || [];
      const opLanguages = langsByProfile[op.id] || [];
      
      const opRepoNames = opRepos.map(r => r.repo_name.toLowerCase());
      const opLangNames = opLanguages.map(l => l.language.toLowerCase());

      // Overlap calculations
      const sharedRepos = opRepoNames.filter(r => myRepoNames.includes(r));
      const sharedLangs = opLangNames.filter(l => myLangNames.includes(l));

      let score = 0;
      let details = '';

      if (sharedRepos.length > 0) {
        score += sharedRepos.length * 100; // heavy weight for matching repo names
        details = `Both worked/committed on identical repositories: ${sharedRepos.join(', ')}`;
      }

      if (isConnectedNode) {
        score += 150; // supreme weight for direct follower connection!
        details = details ? `${details}. Direct follower/following overlap.` : 'Direct follower/following connection in database.';
      }

      if (sharedLangs.length > 0 && !details) {
        score += sharedLangs.length * 5;
        details = `Shared technology configurations: ${sharedLangs.slice(0, 3).join(', ')}`;
      }

      // Append user — use Object.assign to clone pg row (which is a frozen object)
      synergyList.push(Object.assign({}, op, {
        score,
        overlap_repos: sharedRepos,
        details: details || 'General database node proximity.'
      }));
    }

    // Sort and limit to 3
    synergyList.sort((a, b) => b.score - a.score);
    synergyUsers = synergyList.slice(0, 3);
  } catch (err) {
    console.error("⚠️ Synergy: Calculation error:", err.message);
  }
  return synergyUsers;
}
app.post('/api/analyze/:username', async (req, res) => {
  const username = req.params.username.trim().toLowerCase();
  const githubConfig = getGithubConfig(req);

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    console.log(`🔍 API: Starting analysis for user: ${username}`);

    // 1. Fetch main GitHub profile
    let profileResponse;
    try {
      profileResponse = await axios.get(`https://api.github.com/users/${username}`, githubConfig);
    } catch (apiErr) {
      if (apiErr.response && apiErr.response.status === 404) {
        return res.status(404).json({ error: `GitHub user "${username}" not found.` });
      }
      throw apiErr;
    }

    const u = profileResponse.data;

    // 2. Fetch user's public repositories (up to 100)
    const reposResponse = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      githubConfig
    );
    const repos = reposResponse.data || [];

    // Calculate metrics
    let totalStars = 0;
    let totalForks = 0;
    const langMap = {};
    let totalSize = 0;

    const parsedRepos = repos.map(r => {
      totalStars += r.stargazers_count;
      totalForks += r.forks_count;
      
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + r.size;
        totalSize += r.size;
      }

      return {
        name: r.name,
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language || 'Unknown',
        html_url: r.html_url
      };
    });

    // Sort repositories by stars DESC to save top ones
    const topRepos = [...parsedRepos]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 8); // Keep top 8 repos

    // Compute languages percentages
    const computedLanguages = [];
    Object.keys(langMap).forEach(lang => {
      const size = langMap[lang];
      const percentage = totalSize > 0 ? parseFloat(((size / totalSize) * 100).toFixed(2)) : 0;
      computedLanguages.push({
        language: lang,
        bytes_count: size * 1024, // conversion from KB size
        percentage
      });
    });
    // Sort languages by percentage DESC
    computedLanguages.sort((a, b) => b.percentage - a.percentage);

    // Compute Developer Score
    let devScore = (u.followers * 3) + (u.public_repos * 1) + (u.public_gists * 2) + (totalStars * 5) + (totalForks * 3);
    if (u.location) devScore += 10;
    if (u.bio) devScore += 10;
    if (u.company) devScore += 20;
    if (u.blog) devScore += 10;

    const devGrade = calculateDeveloperGrade(devScore);

    // 3. Database Sync Transactional Logic
    // Clean up existing entry if it exists (cascade will handle child tables)
    await db.query('DELETE FROM profiles WHERE username = ?', [username]);

    // Insert new profile
    let insertProfileSql;
    if (db.isPostgres) {
      insertProfileSql = `
        INSERT INTO profiles 
        (username, name, avatar_url, bio, public_repos, public_gists, followers, following, location, company, blog, github_created_at, developer_score, developer_grade)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;
    } else {
      insertProfileSql = `
        INSERT INTO profiles 
        (username, name, avatar_url, bio, public_repos, public_gists, followers, following, location, company, blog, github_created_at, developer_score, developer_grade)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
    }

    const profileParams = [
      username,
      u.name || null,
      u.avatar_url || null,
      u.bio || null,
      u.public_repos || 0,
      u.public_gists || 0,
      u.followers || 0,
      u.following || 0,
      u.location || null,
      u.company || null,
      u.blog || null,
      u.created_at || null,
      devScore,
      devGrade
    ];

    let profileId;
    if (db.isPostgres) {
      const res = await db.query(insertProfileSql, profileParams);
      profileId = res[0].id;
    } else {
      const res = await db.query(insertProfileSql, profileParams);
      // In mysql2, res can have insertId depending on pool structure.
      // Let's query the ID to make it 100% dialect safe!
      const checkProfile = await db.query('SELECT id FROM profiles WHERE username = ?', [username]);
      profileId = checkProfile[0].id;
    }

    // Insert Top Repositories
    for (const repo of topRepos) {
      await db.query(
        'INSERT INTO repositories (profile_id, repo_name, stars, forks, language, html_url) VALUES (?, ?, ?, ?, ?, ?)',
        [profileId, repo.name, repo.stars, repo.forks, repo.language, repo.html_url]
      );
    }

    // Insert Language breakdown
    for (const lang of computedLanguages) {
      await db.query(
        'INSERT INTO languages (profile_id, language, bytes_count, percentage) VALUES (?, ?, ?, ?)',
        [profileId, lang.language, lang.bytes_count, lang.percentage]
      );
    }

    // Calculate synergy users beautifully
    const synergyUsers = await calculateSynergy(profileId, username, githubConfig);

    const payload = {
      profile: {
        id: profileId,
        username,
        name: u.name,
        avatar_url: u.avatar_url,
        bio: u.bio,
        public_repos: u.public_repos,
        public_gists: u.public_gists,
        followers: u.followers,
        following: u.following,
        location: u.location,
        company: u.company,
        blog: u.blog,
        github_created_at: u.created_at,
        developer_score: devScore,
        developer_grade: devGrade
      },
      top_repositories: topRepos,
      languages: computedLanguages,
      synergy_users: synergyUsers
    };

    console.log(`✅ API: Profile ${username} successfully analyzed and saved.`);
    res.json(payload);

  } catch (error) {
    console.error('❌ API: Error analyzing profile:', error.message);
    res.status(500).json({ error: 'Server error processing profile analysis. Please check API token or connection.' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Get All Analyzed Profiles
// -------------------------------------------------------------
app.get('/api/profiles', async (req, res) => {
  try {
    const profiles = await db.query('SELECT * FROM profiles ORDER BY developer_score DESC');
    res.json(profiles);
  } catch (error) {
    console.error('❌ API: Error fetching profiles:', error.message);
    res.status(500).json({ error: 'Database query error.' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Get Details of a Single Profile
// -------------------------------------------------------------
app.get('/api/profiles/:username', async (req, res) => {
  const username = req.params.username.trim().toLowerCase();
  const githubConfig = getGithubConfig(req);

  try {
    const profileRows = await db.query('SELECT * FROM profiles WHERE username = ?', [username]);
    if (profileRows.length === 0) {
      return res.status(404).json({ error: `Profile "${username}" not analyzed yet.` });
    }

    const profile = profileRows[0];
    const repositories = await db.query('SELECT * FROM repositories WHERE profile_id = ? ORDER BY stars DESC', [profile.id]);
    const languages = await db.query('SELECT * FROM languages WHERE profile_id = ? ORDER BY percentage DESC', [profile.id]);

    // Calculate dynamic synergy scores safely using unified helper
    const synergyUsers = await calculateSynergy(profile.id, username, githubConfig);

    res.json({
      profile,
      top_repositories: repositories,
      languages,
      synergy_users: synergyUsers
    });
  } catch (error) {
    console.error(`❌ API: Error fetching profile detail for ${username}:`, error.message);
    res.status(500).json({ error: 'Database query error.' });
  }
});

// -------------------------------------------------------------
// ENDPOINT: Delete Profile from DB
// -------------------------------------------------------------
app.delete('/api/profiles/:username', async (req, res) => {
  const username = req.params.username.trim().toLowerCase();

  try {
    const profileRows = await db.query('SELECT * FROM profiles WHERE username = ?', [username]);
    if (profileRows.length === 0) {
      return res.status(404).json({ error: `Profile "${username}" not found.` });
    }

    await db.query('DELETE FROM profiles WHERE username = ?', [username]);
    res.json({ message: `Successfully deleted profile analysis for ${username}.` });
  } catch (error) {
    console.error(`❌ API: Error deleting profile for ${username}:`, error.message);
    res.status(500).json({ error: 'Database query error.' });
  }
});

// Start backend server
app.listen(PORT, async () => {
  console.log(`🚀 Server: Radar running on port http://localhost:${PORT}`);
  // Initialize Database automatically on start
  await db.initDatabase();
});
