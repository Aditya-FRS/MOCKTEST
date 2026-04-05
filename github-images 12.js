/* ============================================
   GitHub Image Storage Utility

   Stores question images on GitHub to reduce
   database/localStorage storage usage.

   Usage:
   1. Create a GitHub repo for images
   2. Generate a Personal Access Token (PAT) with repo scope
   3. Configure GITHUB_CONFIG below
   4. Call uploadImageToGitHub(base64Data, filename)
      to upload and get a raw URL back
   ============================================ */

const GITHUB_CONFIG = {
    // Configure these with your GitHub details
    owner: '',        // e.g., 'yourusername'
    repo: '',         // e.g., 'mock-test-images'
    branch: 'main',
    token: '',        // GitHub PAT - keep secure!
    imageFolder: 'exam-images'
};

/**
 * Check if GitHub storage is configured
 */
function isGitHubConfigured() {
    return GITHUB_CONFIG.owner && GITHUB_CONFIG.repo && GITHUB_CONFIG.token;
}

/**
 * Upload an image to GitHub repository
 * @param {string} base64Data - Base64 encoded image data (with or without data URI prefix)
 * @param {string} filename - Desired filename for the image
 * @returns {Promise<{success: boolean, url: string, error?: string}>}
 */
async function uploadImageToGitHub(base64Data, filename) {
    if (!isGitHubConfigured()) {
        console.warn('GitHub not configured. Storing image locally.');
        showNotificationPopup('⚠️ GitHub Not Configured', 'Image saved as base64. Go to ⚙️ Settings to configure GitHub.');
        return { success: false, url: base64Data, error: 'GitHub not configured' };
    }

    try {
        // Strip data URI prefix if present
        let cleanBase64 = base64Data;
        if (base64Data.includes(',')) {
            cleanBase64 = base64Data.split(',')[1];
        }

        const timestamp = Date.now();
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${GITHUB_CONFIG.imageFolder}/${timestamp}_${safeName}`;

        console.log('Uploading to GitHub:', GITHUB_CONFIG.owner + '/' + GITHUB_CONFIG.repo + '/' + path);

        // Support both classic tokens (ghp_) and fine-grained tokens (github_pat_)
        const authHeader = GITHUB_CONFIG.token.startsWith('github_pat_')
            ? `Bearer ${GITHUB_CONFIG.token}`
            : `token ${GITHUB_CONFIG.token}`;

        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Upload exam image: ${safeName}`,
                    content: cleanBase64,
                    branch: GITHUB_CONFIG.branch
                })
            }
        );

        if (!response.ok) {
            const errData = await response.json();
            const errMsg = errData.message || 'GitHub API error';
            console.error('GitHub API error:', response.status, errMsg);

            if (response.status === 401) {
                showNotificationPopup('❌ GitHub Auth Failed', 'Token is invalid or expired. Check ⚙️ Settings.');
            } else if (response.status === 404) {
                showNotificationPopup('❌ GitHub Repo Not Found', 'Check repo name and owner in ⚙️ Settings.');
            } else if (response.status === 403) {
                showNotificationPopup('❌ GitHub Permission Denied', 'Token needs "Contents: Read and write" permission.');
            } else {
                showNotificationPopup('❌ GitHub Upload Failed', errMsg);
            }

            throw new Error(errMsg);
        }

        const data = await response.json();
        // Use raw.githubusercontent.com URL for direct image access
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${path}`;

        console.log('GitHub upload success:', rawUrl);
        showNotificationPopup('✅ Image Uploaded', 'Saved to GitHub repository');
        return { success: true, url: rawUrl };
    } catch (error) {
        console.error('GitHub upload failed:', error);
        return { success: false, url: base64Data, error: error.message };
    }
}

/**
 * Delete an image from GitHub repository
 * @param {string} imageUrl - The raw GitHub URL of the image
 * @returns {Promise<boolean>}
 */
async function deleteImageFromGitHub(imageUrl) {
    if (!isGitHubConfigured()) return false;

    try {
        // Extract path from URL
        const urlParts = imageUrl.replace(
            `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/`,
            ''
        );

        // Get the file SHA first
        const getResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${urlParts}`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (!getResponse.ok) return false;
        const fileData = await getResponse.json();

        // Delete the file
        const deleteResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${urlParts}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${GITHUB_CONFIG.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: `Delete exam image: ${urlParts}`,
                    sha: fileData.sha,
                    branch: GITHUB_CONFIG.branch
                })
            }
        );

        return deleteResponse.ok;
    } catch (error) {
        console.error('GitHub delete failed:', error);
        return false;
    }
}

/**
 * Process an image for storage - tries GitHub first, falls back to base64
 * @param {string} base64Data - Base64 image data
 * @param {string} filename - Filename
 * @returns {Promise<string>} - URL or base64 data
 */
async function processImageForStorage(base64Data, filename) {
    if (isGitHubConfigured()) {
        const result = await uploadImageToGitHub(base64Data, filename);
        if (result.success) {
            return result.url;
        }
    }
    // Fallback: return base64 (stored in localStorage)
    return base64Data;
}

/**
 * Show GitHub configuration modal
 */
function showGitHubConfigModal() {
    const currentConfig = GITHUB_CONFIG;
    const html = `
        <div style="padding:24px;">
            <h3 style="margin-bottom:16px;">GitHub Image Storage Configuration</h3>
            <p style="color:var(--color-text-secondary);margin-bottom:20px;font-size:14px;">
                Configure GitHub repository to store exam images. This reduces local storage usage.
                Images will be stored as files in your GitHub repo and referenced by URL.
            </p>
            <div class="form-group">
                <label class="form-label">GitHub Username / Owner</label>
                <input type="text" class="form-input" id="ghOwner" value="${currentConfig.owner}" placeholder="e.g., yourusername">
            </div>
            <div class="form-group">
                <label class="form-label">Repository Name</label>
                <input type="text" class="form-input" id="ghRepo" value="${currentConfig.repo}" placeholder="e.g., mock-test-images">
            </div>
            <div class="form-group">
                <label class="form-label">Branch</label>
                <input type="text" class="form-input" id="ghBranch" value="${currentConfig.branch}" placeholder="main">
            </div>
            <div class="form-group">
                <label class="form-label">Personal Access Token (PAT)</label>
                <input type="password" class="form-input" id="ghToken" value="${currentConfig.token}" placeholder="ghp_xxxxxxxxxxxxx">
                <span style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;display:block;">
                    Generate at GitHub Settings > Developer settings > Personal access tokens. Needs 'repo' scope.
                </span>
            </div>
            <div id="ghTestResult" style="display:none;margin-top:12px;padding:12px;border-radius:8px;font-size:13px;"></div>
            <div style="display:flex;gap:12px;justify-content:flex-end;flex-wrap:wrap;margin-top:20px;">
                <button class="btn btn-outline" onclick="closeGitHubConfigModal()">Cancel</button>
                <button class="btn btn-secondary" style="width:auto;" onclick="testGitHubConnection()">🔗 Test Connection</button>
                <button class="btn btn-secondary" style="width:auto;" onclick="testGitHubUpload()">📤 Test Upload</button>
                <button class="btn btn-primary" style="width:auto;" onclick="saveGitHubConfig()">Save Configuration</button>
            </div>
        </div>
    `;
    showDynamicModal(html);
}

async function testGitHubConnection() {
    const owner = document.getElementById('ghOwner').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const token = document.getElementById('ghToken').value.trim();
    const resultEl = document.getElementById('ghTestResult');

    if (!owner || !repo || !token) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'var(--color-bg-4)';
        resultEl.style.color = 'var(--color-error)';
        resultEl.textContent = '❌ Please fill in Owner, Repo, and Token first.';
        return;
    }

    resultEl.style.display = 'block';
    resultEl.style.background = 'var(--color-bg-3)';
    resultEl.style.color = 'var(--color-text-secondary)';
    resultEl.textContent = '⏳ Testing connection...';

    try {
        const authHeader = token.startsWith('github_pat_') ? `Bearer ${token}` : `token ${token}`;

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            resultEl.style.background = 'var(--color-bg-3)';
            resultEl.style.color = 'var(--color-success)';
            resultEl.innerHTML = `✅ <strong>Connected!</strong> Repo: ${data.full_name} (${data.private ? 'Private' : 'Public'})<br>Permissions: ${data.permissions ? (data.permissions.push ? '✅ Write access' : '❌ Read-only') : 'Unknown'}`;
        } else if (response.status === 401) {
            resultEl.style.background = 'var(--color-bg-4)';
            resultEl.style.color = 'var(--color-error)';
            resultEl.textContent = '❌ Authentication failed. Token is invalid or expired.';
        } else if (response.status === 404) {
            resultEl.style.background = 'var(--color-bg-4)';
            resultEl.style.color = 'var(--color-error)';
            resultEl.textContent = '❌ Repository not found. Check owner and repo name.';
        } else if (response.status === 403) {
            resultEl.style.background = 'var(--color-bg-4)';
            resultEl.style.color = 'var(--color-error)';
            resultEl.textContent = '❌ Permission denied. Token needs "Contents: Read and write" scope.';
        } else {
            resultEl.style.background = 'var(--color-bg-4)';
            resultEl.style.color = 'var(--color-error)';
            resultEl.textContent = `❌ Error: ${response.status} ${response.statusText}`;
        }
    } catch (e) {
        resultEl.style.background = 'var(--color-bg-4)';
        resultEl.style.color = 'var(--color-error)';
        resultEl.textContent = '❌ Network error: ' + e.message;
    }
}

async function testGitHubUpload() {
    const owner = document.getElementById('ghOwner').value.trim();
    const repo = document.getElementById('ghRepo').value.trim();
    const branch = document.getElementById('ghBranch').value.trim() || 'main';
    const token = document.getElementById('ghToken').value.trim();
    const resultEl = document.getElementById('ghTestResult');

    if (!owner || !repo || !token) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'var(--color-bg-4)';
        resultEl.style.color = 'var(--color-error)';
        resultEl.textContent = '❌ Please fill in Owner, Repo, and Token first.';
        return;
    }

    resultEl.style.display = 'block';
    resultEl.style.background = 'var(--color-bg-3)';
    resultEl.style.color = 'var(--color-text-secondary)';
    resultEl.textContent = '⏳ Uploading test image...';

    try {
        const authHeader = token.startsWith('github_pat_') ? `Bearer ${token}` : `token ${token}`;

        // Create a tiny 1x1 red pixel PNG (68 bytes) as base64
        const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const testPath = `exam-images/test_${Date.now()}.png`;

        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${testPath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    message: 'Test upload from Mock Test Platform',
                    content: testBase64,
                    branch: branch
                })
            }
        );

        if (response.ok) {
            const data = await response.json();
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${testPath}`;
            resultEl.style.background = 'var(--color-bg-3)';
            resultEl.style.color = 'var(--color-success)';
            resultEl.innerHTML = `✅ <strong>Upload successful!</strong><br>
                Test image created at: <a href="${rawUrl}" target="_blank" style="color:var(--color-primary);">${testPath}</a><br>
                <span style="font-size:12px;color:var(--color-text-secondary);">You can delete this test file from your repo later.</span>`;
        } else {
            const errData = await response.json();
            const errMsg = errData.message || 'Unknown error';
            resultEl.style.background = 'var(--color-bg-4)';
            resultEl.style.color = 'var(--color-error)';

            if (response.status === 401) {
                resultEl.innerHTML = `❌ <strong>Auth Failed (401)</strong><br>Your token is invalid or expired.<br>Generate a new one at GitHub → Settings → Developer settings → Personal access tokens.`;
            } else if (response.status === 404) {
                resultEl.innerHTML = `❌ <strong>Repo Not Found (404)</strong><br>Check that "<strong>${owner}/${repo}</strong>" exists and the token has access to it.<br>Error: ${errMsg}`;
            } else if (response.status === 403) {
                resultEl.innerHTML = `❌ <strong>Permission Denied (403)</strong><br>Your token doesn't have write permission.<br>
                    <strong>For Classic token (ghp_):</strong> needs <code>repo</code> scope<br>
                    <strong>For Fine-grained token (github_pat_):</strong> needs <code>Contents: Read and write</code><br>
                    Error: ${errMsg}`;
            } else if (response.status === 422) {
                resultEl.innerHTML = `❌ <strong>Branch Error (422)</strong><br>Branch "<strong>${branch}</strong>" may not exist. Check your repo's default branch name.<br>Error: ${errMsg}`;
            } else {
                resultEl.innerHTML = `❌ <strong>Error ${response.status}</strong><br>${errMsg}`;
            }
        }
    } catch (e) {
        resultEl.style.display = 'block';
        resultEl.style.background = 'var(--color-bg-4)';
        resultEl.style.color = 'var(--color-error)';
        resultEl.textContent = '❌ Network error: ' + e.message;
    }
}

async function saveGitHubConfig() {
    GITHUB_CONFIG.owner = document.getElementById('ghOwner').value.trim();
    GITHUB_CONFIG.repo = document.getElementById('ghRepo').value.trim();
    GITHUB_CONFIG.branch = document.getElementById('ghBranch').value.trim() || 'main';
    GITHUB_CONFIG.token = document.getElementById('ghToken').value.trim();

    // Save to Firestore
    try {
        if (state.currentUser) {
            await api.saveGitHubConfig(state.currentUser.username, {
                owner: GITHUB_CONFIG.owner,
                repo: GITHUB_CONFIG.repo,
                branch: GITHUB_CONFIG.branch,
                token: GITHUB_CONFIG.token,
                imageFolder: GITHUB_CONFIG.imageFolder
            });
        }
    } catch (e) {
        console.warn('Failed to save GitHub config:', e);
    }

    closeDynamicModal();
    showNotificationPopup('GitHub Config Saved', 'Images will now be stored on GitHub.');
}

async function loadGitHubConfig() {
    try {
        if (state.currentUser) {
            const config = await api.getGitHubConfig(state.currentUser.username);
            if (config) {
                GITHUB_CONFIG.owner = config.owner || '';
                GITHUB_CONFIG.repo = config.repo || '';
                GITHUB_CONFIG.branch = config.branch || 'main';
                GITHUB_CONFIG.token = config.token || '';
                GITHUB_CONFIG.imageFolder = config.imageFolder || 'exam-images';
            }
        }
    } catch (e) {
        console.warn('Failed to load GitHub config:', e);
    }
}
Eventhough the timer completes the exam is not auto submitting need to fix it
After creating the exam there is no feasibilty to change the exam  means editing again
in doraemon user both asigned by me andd assigned to you showing nobitha user name in nobitha login both showing doraemon name
After starter=d the exam the timer is only on top while i scroll down timer is not visible becasue on top so while scrlling down it sshould be right of scrrren on top and for last 5 mins one warning sound and last 1 min one warning sound for last second count for every count small waring tick tick sound should play

big change we'll upload a file then it should segregate and should ask user how many questins and other related stuff which is common and ther it should prepare the question paper keeping the present functionality there should be auto mode in that it should make this change we'll upload this from github repo or local storage 

 need to make some UX changes keeeping the functionality same 
