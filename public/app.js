// ==========================================
// RepoRadar Premium Interactive App Core
// ==========================================

const API_BASE = '/api';

// State management
let analyzedProfiles = [];
let activeProfile = null;
let selectedForComparison = [];
let languageChartInstance = null;
let activeSynergyUsers = [];
let myUsername = null;
let myAvatar = null;
let profileCache = {}; // Cache of username -> { data: parsedPayload, timestamp: Date.now() }

// DOM Elements
const searchForm = document.getElementById('search-form');
const usernameInput = document.getElementById('username-input');
const loadingSpinner = document.getElementById('loading');
const errorBanner = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

const profilesGrid = document.getElementById('profiles-grid');
const compareBtn = document.getElementById('compare-btn');
const compareCountSpan = document.getElementById('compare-count');

const detailCard = document.getElementById('detail-card');
const detailPlaceholder = document.getElementById('detail-placeholder');
const detailContent = document.getElementById('detail-content');

// Detail elements
const detailAvatar = document.getElementById('detail-avatar');
const detailFullname = document.getElementById('detail-fullname');
const detailUsername = document.getElementById('detail-username');
const detailBio = document.getElementById('detail-bio');
const detailGrade = document.getElementById('detail-grade');

const statRepos = document.getElementById('stat-repos');
const statFollowers = document.getElementById('stat-followers');
const statFollowing = document.getElementById('stat-following');
const statScore = document.getElementById('stat-score');

const languagesLegend = document.getElementById('languages-legend');
const reposContainer = document.getElementById('repos-container');

const scorecardNumber = document.getElementById('scorecard-number');
const scorecardTitle = document.getElementById('scorecard-title');
const scorecardDescription = document.getElementById('scorecard-description');
const scoreFollowers = document.getElementById('score-followers');
const scoreStars = document.getElementById('score-stars');
const scoreForks = document.getElementById('score-forks');
const scoreCompleteness = document.getElementById('score-completeness');

// Modals
const comparisonModal = document.getElementById('comparison-modal');
const closeModalBtn = document.getElementById('close-modal');
const compareCol1 = document.getElementById('compare-col-1');
const compareCol2 = document.getElementById('compare-col-2');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initAuth().then(() => {
    fetchProfiles();
  });
  setupTabs();

  // Search Submit
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    if (username) {
      await analyzeProfile(username);
    }
  });

  // Modal Close
  closeModalBtn.addEventListener('click', () => {
    comparisonModal.classList.add('hidden');
  });

  // Compare Button Action
  compareBtn.addEventListener('click', showComparisonModal);
  
  const compareMeBtn = document.getElementById('compare-me-btn');
  if (compareMeBtn) {
    compareMeBtn.addEventListener('click', async () => {
      if (activeProfile && myUsername) {
        // Ensure my profile is analyzed
        const exists = analyzedProfiles.find(p => p.username === myUsername);
        if (!exists) {
          const loadingText = document.querySelector('.loading-text');
          const originalText = loadingText ? loadingText.textContent : '';
          if (loadingText) {
            loadingText.textContent = "Analyzing your profile to compute cluster synergies...";
          }
          try {
            await analyzeProfile(myUsername);
          } finally {
            if (loadingText) {
              loadingText.textContent = originalText;
            }
          }
        }
        selectedForComparison = [myUsername, activeProfile.username];
        showComparisonModal();
      }
    });
  }

  // Auth Logic UI
  const authModal = document.getElementById('auth-modal');
  document.getElementById('login-btn').addEventListener('click', () => authModal.classList.remove('hidden'));
  document.getElementById('close-auth-modal').addEventListener('click', () => authModal.classList.add('hidden'));
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('gitradar_github_token');
    window.location.reload();
  });
  document.getElementById('oauth-login-btn').addEventListener('click', () => {
    const clientId = 'Ov23liMMOsUbI0gCM4pO';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user`;
  });
  document.getElementById('pat-login-btn').addEventListener('click', () => {
    const token = document.getElementById('pat-input').value.trim();
    if (token) {
      localStorage.setItem('gitradar_github_token', token);
      window.location.reload();
    }
  });
});

// Setup Tabs Logic
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active from all tabs
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      // Add active to current
      tab.classList.add('active');
      const paneId = tab.getAttribute('data-tab');
      document.getElementById(paneId).classList.add('active');

      // Trigger social radar rendering if selected
      if (paneId === 'social-tab' && activeProfile) {
        setTimeout(() => {
          renderSocialGraph(activeProfile.username, activeSynergyUsers);
        }, 50);
      }
    });
  });
}

// -------------------------------------------------------------
// API CALL: Fetch All Analyzed Profiles
// -------------------------------------------------------------
async function fetchProfiles() {
  try {
    const res = await fetch(`${API_BASE}/profiles`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch profiles');
    
    analyzedProfiles = await res.json();
    renderProfilesGrid();
  } catch (err) {
    console.error('Error fetching profiles:', err);
  }
}

// -------------------------------------------------------------
// API CALL: Analyze New Profile
// -------------------------------------------------------------
async function analyzeProfile(username) {
  hideError();
  showLoading();
  
  const cacheKey = username.toLowerCase();
  delete profileCache[cacheKey]; // Invalidate cache on new analysis

  try {
    const res = await fetch(`${API_BASE}/analyze/${username}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to analyze profile');
    }

    usernameInput.value = '';
    
    // Store in cache
    profileCache[cacheKey] = {
      data: data,
      timestamp: Date.now()
    };

    // Refresh profiles list
    await fetchProfiles();

    // Set as active details
    displayDetails(data);
  } catch (err) {
    showError(err.message);
  } finally {
    hideLoading();
  }
}

// -------------------------------------------------------------
// API CALL: Get Single Profile Details
// -------------------------------------------------------------
async function selectProfile(username) {
  const cacheKey = username.toLowerCase();
  const cached = profileCache[cacheKey];
  const now = Date.now();
  
  // Cache TTL of 15 minutes (15 * 60 * 1000 = 900000ms)
  if (cached && (now - cached.timestamp < 900000)) {
    displayDetails(cached.data);
    highlightActiveCard(username);
    return;
  }

  const detailCard = document.getElementById('detail-card');
  if (detailCard) {
    detailCard.classList.add('loading-fade');
  }

  try {
    const res = await fetch(`${API_BASE}/profiles/${username}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Profile details fetch failed');

    const data = await res.json();
    
    profileCache[cacheKey] = {
      data: data,
      timestamp: Date.now()
    };

    displayDetails(data);
    highlightActiveCard(username);
  } catch (err) {
    console.error('Error selecting profile:', err);
  } finally {
    if (detailCard) {
      detailCard.classList.remove('loading-fade');
    }
  }
}

function highlightActiveCard(username) {
  document.querySelectorAll('.profile-item-card').forEach(card => {
    card.classList.remove('active');
    if (card.dataset.username === username) {
      card.classList.add('active');
    }
  });
}

// -------------------------------------------------------------
// API CALL: Delete Profile
// -------------------------------------------------------------
async function deleteProfile(username, e) {
  e.stopPropagation(); // prevent card selection trigger
  if (!confirm(`Are you sure you want to delete the stored analysis for "${username}"?`)) return;

  const cacheKey = username.toLowerCase();
  delete profileCache[cacheKey]; // Invalidate cache on delete

  try {
    const res = await fetch(`${API_BASE}/profiles/${username}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });

    if (!res.ok) throw new Error('Deletion failed');

    // Remove from comparison array if selected
    selectedForComparison = selectedForComparison.filter(u => u !== username);
    updateCompareButton();

    // Refresh list
    await fetchProfiles();

    // Reset details panel if active profile was deleted
    if (activeProfile && activeProfile.username === username) {
      activeProfile = null;
      detailContent.classList.add('hidden');
      detailPlaceholder.classList.remove('hidden');
    }
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// RENDER: Profiles Grid List
// -------------------------------------------------------------
function renderProfilesGrid() {
  if (analyzedProfiles.length === 0) {
    profilesGrid.innerHTML = `
      <div class="no-data">
        <i class="fa-solid fa-folder-open"></i>
        <p>No profiles analyzed yet. Search a user to begin!</p>
      </div>
    `;
    return;
  }

  profilesGrid.innerHTML = '';
  analyzedProfiles.forEach(p => {
    const isChecked = selectedForComparison.includes(p.username);
    const cardClass = activeProfile && activeProfile.username === p.username ? 'profile-item-card active' : 'profile-item-card';

    const card = document.createElement('div');
    card.className = cardClass;
    card.dataset.username = p.username;
    card.addEventListener('click', () => selectProfile(p.username));

    card.innerHTML = `
      <div class="profile-meta-left">
        <input type="checkbox" class="compare-checkbox" data-username="${p.username}" ${isChecked ? 'checked' : ''}>
        <img src="${p.avatar_url}" alt="Avatar" class="profile-avatar-mini">
        <div class="profile-info-mini">
          <h4>${p.name || p.username}</h4>
          <p>@${p.username}</p>
        </div>
      </div>
      <div class="profile-meta-right">
        <span class="grade-tag tag-${p.developer_grade.toLowerCase().replace('+', 'p')}">${p.developer_grade}</span>
        <button class="delete-profile-btn" title="Remove Profile"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;

    // Connect checkbox changes
    const checkbox = card.querySelector('.compare-checkbox');
    checkbox.addEventListener('click', (e) => e.stopPropagation()); // prevent row click
    checkbox.addEventListener('change', (e) => toggleForComparison(p.username, e.target.checked));

    // Connect delete button
    card.querySelector('.delete-profile-btn').addEventListener('click', (e) => deleteProfile(p.username, e));

    profilesGrid.appendChild(card);
  });
}

// Checkbox select handler
function toggleForComparison(username, isChecked) {
  if (isChecked) {
    if (selectedForComparison.length >= 2) {
      alert('You can only select up to 2 profiles for comparison.');
      renderProfilesGrid(); // re-render to reset checkbox state
      return;
    }
    selectedForComparison.push(username);
  } else {
    selectedForComparison = selectedForComparison.filter(u => u !== username);
  }
  updateCompareButton();
}

function updateCompareButton() {
  const count = selectedForComparison.length;
  compareCountSpan.textContent = count;
  if (count > 0) {
    compareBtn.classList.remove('hidden');
  } else {
    compareBtn.classList.add('hidden');
  }
}

// -------------------------------------------------------------
// SHOW DETAILS PANEL
// -------------------------------------------------------------
function displayDetails(data) {
  const p = data.profile;

  // OPTIMIZATION: Avoid rebuilding charts & DOM if clicking the already active profile
  if (activeProfile && activeProfile.username === p.username) {
    return;
  }

  activeProfile = p;


  detailPlaceholder.classList.add('hidden');
  detailContent.classList.remove('hidden');

  const compareMeBtn = document.getElementById('compare-me-btn');
  if (compareMeBtn) {
    if (myUsername && myUsername !== p.username) {
      compareMeBtn.classList.remove('hidden');
    } else {
      compareMeBtn.classList.add('hidden');
    }
  }

  // Basic info
  detailAvatar.src = p.avatar_url;
  detailFullname.textContent = p.name || p.username;
  detailUsername.textContent = `@${p.username}`;
  detailBio.textContent = p.bio || 'No bio description available.';
  
  // Grade
  detailGrade.textContent = p.developer_grade;
  detailGrade.className = `grade-badge tag-${p.developer_grade.toLowerCase().replace('+', 'p')}`;

  // Stats row
  statRepos.textContent = p.public_repos;
  statFollowers.textContent = p.followers;
  statFollowing.textContent = p.following;
  statScore.textContent = p.developer_score;

  // Chart & Languages Tab
  renderLanguages(data.languages);

  // Repositories Tab
  renderRepositories(data.top_repositories);

  // Scorecard Tab
  scorecardNumber.textContent = p.developer_score;
  renderScorecardDetails(p, data.top_repositories);

  // Synergy Users Tab
  activeSynergyUsers = data.synergy_users || [];
  renderSynergyUsersList(activeSynergyUsers);

  // If social web tab is active, render it immediately
  const activeTab = document.querySelector('.tab-btn.active');
  if (activeTab && activeTab.getAttribute('data-tab') === 'social-tab') {
    setTimeout(() => {
      renderSocialGraph(p.username, activeSynergyUsers);
    }, 50);
  }
}

// -------------------------------------------------------------
// RENDER LANGUAGES TAB (Chart.js + custom legend)
// -------------------------------------------------------------
function renderLanguages(languages) {
  languagesLegend.innerHTML = '';

  if (!languages || languages.length === 0) {
    languagesLegend.innerHTML = '<p class="no-data">No languages data available.</p>';
    if (languageChartInstance) languageChartInstance.destroy();
    return;
  }

  // Tactical technical palette for chart slices
  const colors = ['#d4ff00', '#10b981', '#f97316', '#00f0ff', '#ef4444', '#a855f7', '#6b7280', '#3b82f6'];

  const labels = [];
  const percentages = [];
  const chartColors = [];

  languages.forEach((l, idx) => {
    const color = colors[idx % colors.length];
    labels.push(l.language);
    percentages.push(l.percentage);
    chartColors.push(color);

    // Legend item
    const item = document.createElement('div');
    item.className = 'lang-item-row';
    item.innerHTML = `
      <div class="lang-name-box">
        <span class="lang-color-indicator" style="background-color: ${color}"></span>
        <span>${l.language}</span>
      </div>
      <span class="lang-percent">${l.percentage}%</span>
    `;
    languagesLegend.appendChild(item);
  });

  // Chart.js render
  const ctx = document.getElementById('languageChart').getContext('2d');
  
  if (languageChartInstance) {
    languageChartInstance.destroy();
  }

  languageChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: percentages,
        backgroundColor: chartColors,
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      cutout: '70%',
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// -------------------------------------------------------------
// RENDER REPOSITORIES TAB
// -------------------------------------------------------------
function renderRepositories(repos) {
  reposContainer.innerHTML = '';

  if (!repos || repos.length === 0) {
    reposContainer.innerHTML = '<p class="no-data">No repository statistics available.</p>';
    return;
  }

  repos.forEach(r => {
    const row = document.createElement('div');
    row.className = 'repo-item-row';
    row.innerHTML = `
      <a href="${r.html_url}" target="_blank" class="repo-name-link">
        <i class="fa-solid fa-book-bookmark"></i>
        <span>${r.repo_name || r.name}</span>
      </a>
      <div class="repo-tags">
        <span class="repo-lang-bubble">${r.language}</span>
        <span><i class="fa-solid fa-star"></i> ${r.stars}</span>
        <span><i class="fa-solid fa-code-branch"></i> ${r.forks}</span>
      </div>
    `;
    reposContainer.appendChild(row);
  });
}

// -------------------------------------------------------------
// RENDER SCORECARD DETAILS & BREAKDOWNS
// -------------------------------------------------------------
function renderScorecardDetails(p, repos) {
  // Scorecard values logic
  const sumStars = repos.reduce((a, b) => a + b.stars, 0);
  const sumForks = repos.reduce((a, b) => a + b.forks, 0);

  scoreFollowers.textContent = p.followers * 3;
  scoreStars.textContent = sumStars * 5;
  scoreForks.textContent = sumForks * 3;

  let completeness = 0;
  if (p.location) completeness += 10;
  if (p.bio) completeness += 10;
  if (p.company) completeness += 20;
  if (p.blog) completeness += 10;
  scoreCompleteness.textContent = completeness;

  // Archetype & description based on Grade
  let title = 'Rising Coding Star';
  let desc = 'This developer has highly optimized profiles and shows growing community engagement. A high quality portfolio with curated projects shows fantastic dedication.';

  if (p.developer_grade === 'S') {
    title = 'Open Source Titan';
    desc = 'An elite engineering status! Extreme follower base, spectacular repository stars, and broad footprint across structural open-source projects. Truly outstanding.';
  } else if (p.developer_grade === 'A+' || p.developer_grade === 'A') {
    title = 'Expert Portfolio Architect';
    desc = 'Excellent engineering and coding practices. Boasts highly polished public files, star-studded modules, and impressive contributions.';
  } else if (p.developer_grade === 'B+' || p.developer_grade === 'B') {
    title = 'Versatile Systems Builder';
    desc = 'Active developer profile with very solid and clean code repositories. Demonstrates reliable community engagement and consistent portfolio updates.';
  }

  scorecardTitle.textContent = title;
  scorecardDescription.textContent = desc;
}

async function fetchProfileDataForComparison(username) {
  const cacheKey = username.toLowerCase();
  const cached = profileCache[cacheKey];
  const now = Date.now();
  if (cached && (now - cached.timestamp < 900000)) {
    return cached.data;
  }
  const res = await fetch(`${API_BASE}/profiles/${username}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Profile details fetch failed for ${username}`);
  const data = await res.json();
  profileCache[cacheKey] = {
    data: data,
    timestamp: Date.now()
  };
  return data;
}

// -------------------------------------------------------------
// COMPARISON MODAL SHOWCASE (SIDE BY SIDE MATRIX)
// -------------------------------------------------------------
async function showComparisonModal() {
  if (selectedForComparison.length < 2) {
    alert('Please select exactly 2 profiles using checkboxes to compare them.');
    return;
  }

  // 1. Open the modal instantly!
  comparisonModal.classList.remove('hidden');

  // Render a clean glassmorphic loading spinner inside the comparison columns
  compareCol1.innerHTML = `
    <div class="comp-loader">
      <div class="spinner"></div>
      <p>Loading Radar Matrix...</p>
    </div>
  `;
  compareCol2.innerHTML = `
    <div class="comp-loader">
      <div class="spinner"></div>
      <p>Loading Radar Matrix...</p>
    </div>
  `;

  try {
    // 2. Fetch both profiles concurrently (using cached or network)
    const [u1, u2] = await Promise.all([
      fetchProfileDataForComparison(selectedForComparison[0]),
      fetchProfileDataForComparison(selectedForComparison[1])
    ]);

    renderComparisonColumn(compareCol1, u1);
    renderComparisonColumn(compareCol2, u2);
  } catch (err) {
    comparisonModal.classList.add('hidden');
    alert('Error loading comparison matrices: ' + err.message);
  }
}

function renderComparisonColumn(container, data) {
  const p = data.profile;
  const topRepo = data.top_repositories[0] ? data.top_repositories[0].repo_name : 'N/A';
  const mainLang = data.languages[0] ? data.languages[0].language : 'N/A';

  container.innerHTML = `
    <img src="${p.avatar_url}" alt="Avatar" class="comp-avatar">
    <h4>${p.name || p.username}</h4>
    <span class="comp-username">@${p.username}</span>

    <div class="comp-stats-list">
      <div class="comp-stat-row">
        <span class="comp-stat-label">Radar Grade</span>
        <span class="comp-stat-val grade-tag tag-${p.developer_grade.toLowerCase().replace('+', 'p')}">${p.developer_grade}</span>
      </div>
      <div class="comp-stat-row">
        <span class="comp-stat-label">Radar Score</span>
        <span class="comp-stat-val">${p.developer_score}</span>
      </div>
      <div class="comp-stat-row">
        <span class="comp-stat-label">Followers</span>
        <span class="comp-stat-val">${p.followers}</span>
      </div>
      <div class="comp-stat-row">
        <span class="comp-stat-label">Public Repos</span>
        <span class="comp-stat-val">${p.public_repos}</span>
      </div>
      <div class="comp-stat-row">
        <span class="comp-stat-label">Dominant Lang</span>
        <span class="comp-stat-val">${mainLang}</span>
      </div>
      <div class="comp-stat-row">
        <span class="comp-stat-label">Star Project</span>
        <span class="comp-stat-val">${topRepo}</span>
      </div>
      <div class="comp-stat-row">
        <span class="comp-stat-label">Location</span>
        <span class="comp-stat-val">${p.location || 'Unknown'}</span>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// LOADING & ERROR BANNER HELPERS
// -------------------------------------------------------------
function showLoading() {
  loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
}

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
}

// Global animation frame holder for radar scanning
let socialGraphAnimId = null;

function renderSocialGraph(username, synergyUsers) {
  const canvas = document.getElementById('socialGraphCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  
  // HiDPI / Retina fix — scale canvas buffer by devicePixelRatio for crisp text
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth  = (rect.width  > 0 ? rect.width  : canvas.width)  || 500;
  const cssHeight = (rect.height > 0 ? rect.height : canvas.height) || 300;

  // Only resize buffer when dimensions actually change (avoids clearing mid-animation)
  const bufW = Math.round(cssWidth  * dpr);
  const bufH = Math.round(cssHeight * dpr);
  if (canvas.width !== bufW || canvas.height !== bufH) {
    canvas.width  = bufW;
    canvas.height = bufH;
  }

  // Scale every draw call so CSS px = logical px
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width  = cssWidth;
  const height = cssHeight;

  // Center node position
  const cx = width / 2;
  const cy = height / 2;

  // Cancel previous animation frame if running
  if (socialGraphAnimId) {
    cancelAnimationFrame(socialGraphAnimId);
  }

  // Create only nodes representing ACTUAL synergy users in the DB
  const nodes = [];
  const count = synergyUsers.length;
  
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / Math.max(count, 3); // distribute evenly
    const distance = 100 + (i * 15);
    const px = cx + Math.cos(angle) * distance;
    const py = cy + Math.sin(angle) * distance;
    
    nodes.push({ 
      x: px, 
      y: py, 
      label: `@${synergyUsers[i].username}`, 
      grade: synergyUsers[i].developer_grade 
    });
  }

  let scanAngle = 0;

  function draw() {
    // Semi-transparent clearing for trailing light sweeps
    ctx.fillStyle = 'rgba(10, 11, 14, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid rings (Tactical radar circles)
    ctx.strokeStyle = '#1c1f2b';
    ctx.lineWidth = 1;
    [55, 100, 145].forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Draw scan line (sweeping lime vector)
    ctx.strokeStyle = 'rgba(212, 255, 0, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(scanAngle) * 175, cy + Math.sin(scanAngle) * 175);
    ctx.stroke();

    scanAngle += 0.015;

    // Draw connections between center and peer nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(node.x, node.y);
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();

      // Node label
      ctx.fillStyle = '#f0f2f5';
      ctx.font = 'bold 11px Space Grotesk';
      ctx.textAlign = 'center';
      ctx.fillText(`${node.label} (${node.grade})`, node.x, node.y - 12);
    });

    // Center Node (Active Developer)
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d4ff00';
    ctx.stroke();

    ctx.fillStyle = '#d4ff00';
    ctx.font = 'bold 12px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText(`@${username}`, cx, cy - 16);

    // If zero other database entries exist, draw a beautiful tactical warning notice
    if (nodes.length === 0) {
      ctx.fillStyle = 'rgba(212, 255, 0, 0.45)';
      ctx.font = '700 10px Space Grotesk';
      ctx.textAlign = 'center';
      ctx.fillText('RADAR SCAN ACTIVE: SINGLE NODE MODE', cx, cy + 60);
      
      ctx.fillStyle = '#8c93a8';
      ctx.font = '9px Space Grotesk';
      ctx.fillText('ANALYZE MORE USERS TO MAP CLUSTER SYNERGIES', cx, cy + 78);
    }

    socialGraphAnimId = requestAnimationFrame(draw);
  }

  draw();
}

function renderSynergyUsersList(users) {
  const container = document.getElementById('synergy-users-list');
  if (!container) return;

  container.innerHTML = '';

  if (!users || users.length === 0) {
    container.innerHTML = `
      <div class="no-data" style="padding: 1.5rem;">
        <i class="fa-solid fa-users-slash" style="font-size: 1.5rem; opacity: 0.4;"></i>
        <p style="font-size: 0.8rem;">No database connection nodes for synergy calculation yet.</p>
      </div>
    `;
    return;
  }

  users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'repo-item-row';
    item.style.cursor = 'pointer';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'flex-start';
    item.style.gap = '0.5rem';
    item.addEventListener('click', () => selectProfile(u.username));

    item.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${u.avatar_url}" alt="Avatar" style="width: 28px; height: 28px; border: 1px solid var(--border-color); border-radius: 0;">
          <div>
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">@${u.username}</span>
            <span class="grade-tag tag-${u.developer_grade.toLowerCase().replace('+', 'p')}" style="margin-left: 0.5rem; font-size: 0.65rem;">${u.developer_grade}</span>
          </div>
        </div>
        <div style="font-size: 0.75rem; color: var(--color-accent); font-weight: 700;">
          Score: ${u.developer_score}
        </div>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; border-top: 1px solid #161821; padding-top: 0.4rem; width: 100%;">
        <i class="fa-solid fa-code-branch" style="margin-right: 0.25rem; color: var(--color-accent);"></i>
        ${u.details || 'General database node connection.'}
      </div>
    `;
    container.appendChild(item);
  });
}

async function initAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      const res = await fetch(API_BASE + '/auth/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('gitradar_github_token', data.access_token);
      }
    } catch (err) {
      console.error('OAuth exchange failed', err);
    }
  }

  const token = localStorage.getItem('gitradar_github_token');
  if (token) {
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': 'token ' + token }
      });
      if (res.ok) {
        const user = await res.json();
        myUsername = user.login.toLowerCase();
        myAvatar = user.avatar_url;
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('user-profile-badge').classList.remove('hidden');
        document.getElementById('logged-in-username').textContent = user.login;
        document.getElementById('logged-in-avatar').src = user.avatar_url;
      } else {
        localStorage.removeItem('gitradar_github_token');
      }
    } catch (err) {
      console.error('Failed to fetch logged in user', err);
    }
  }
}

function getAuthHeaders(headers = {}) {
  const token = localStorage.getItem('gitradar_github_token');
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

