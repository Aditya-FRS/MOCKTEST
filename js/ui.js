/* ============================================
   UI Utility Functions
   ============================================ */

// Show/hide views
function showView(viewName) {
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('examInterface').classList.add('hidden');
    document.getElementById('resultsView').classList.add('hidden');

    if (viewName === 'dashboard') {
        document.getElementById('dashboard').classList.remove('hidden');
    } else if (viewName === 'exam') {
        document.getElementById('examInterface').classList.remove('hidden');
    } else if (viewName === 'results') {
        document.getElementById('resultsView').classList.remove('hidden');
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.dataset.content === tabName);
    });

    if (tabName === 'results') loadResultsTab();
    else if (tabName === 'analytics') loadAnalyticsTab();
    else if (tabName === 'calendar') loadCalendarTab();
}

// Notification popup
function showNotificationPopup(title, body) {
    const popup = document.getElementById('notificationPopup');
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationBody').textContent = body;
    popup.classList.add('show');
    setTimeout(() => popup.classList.remove('show'), 5000);
}

// Modal helpers
function showDynamicModal(html) {
    const modal = document.getElementById('createExamModal');
    const content = document.getElementById('createExamModalContent');
    window._originalModalContent = content.innerHTML;
    content.innerHTML = html;
    modal.classList.add('active');
}

function closeDynamicModal() {
    const modal = document.getElementById('createExamModal');
    modal.classList.remove('active');
    if (window._originalModalContent) {
        document.getElementById('createExamModalContent').innerHTML = window._originalModalContent;
        window._originalModalContent = null;
        // Re-bind modal event listeners after restoring
        setupModalHandlers();
    }
}

function closeGitHubConfigModal() {
    closeDynamicModal();
}

// Format countdown helper
function formatCountdown(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
