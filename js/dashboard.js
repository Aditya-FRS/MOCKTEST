/* ============================================
   Dashboard - Stats, KPI, Assigned Exams, History
   ============================================ */

function setupDashboardHandlers() {
    document.getElementById('createExamBtn').addEventListener('click', () => openCreateExamModal());
    document.getElementById('viewExamsBtn').addEventListener('click', () => {
        switchTab('dashboard');
        setTimeout(() => {
            const s = document.querySelector('.exams-section');
            if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    });
    document.getElementById('viewResultsTab').addEventListener('click', () => switchTab('results'));
    document.getElementById('analyticsCard').addEventListener('click', () => switchTab('analytics'));

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('backToDashboardBtn').addEventListener('click', () => {
        showView('dashboard');
        loadDashboard();
    });
}

function loadDashboard() {
    showView('dashboard');
    const user = state.currentUser;
    document.getElementById('dashboardTitle').textContent = `Welcome back, ${user.name.split(' ')[0]}!`;
    document.getElementById('dashboardSubtitle').textContent = "Here's what's happening with your exams";

    updateStatistics();
    loadScheduledExams();
    loadPerformanceKPITiles();
    loadAssignedExams();
    loadExamHistoryGrid();
}

// ─── Statistics ───
function updateStatistics() {
    const user = state.currentUser;
    const userExams = state.exams.filter(e =>
        e.student === user.username || e.examiner === user.username
    );
    const completedExams = userExams.filter(e => e.status === 'evaluated' || e.status === 'completed');
    const pendingExams = userExams.filter(e => e.status === 'scheduled');

    let totalScore = 0, scoredExams = 0;
    completedExams.forEach(exam => {
        if (exam.result && exam.result.percentage !== undefined) {
            totalScore += exam.result.percentage;
            scoredExams++;
        }
    });
    const avgScore = scoredExams > 0 ? Math.round(totalScore / scoredExams) : 0;

    document.getElementById('statTotalExams').textContent = userExams.length;
    document.getElementById('statCompletedExams').textContent = completedExams.length;
    document.getElementById('statPendingExams').textContent = pendingExams.length;
    document.getElementById('statAvgScore').textContent = avgScore + '%';
}

// ─── Scheduled Exams ───
function loadScheduledExams() {
    const user = state.currentUser;
    const scheduledExams = state.exams.filter(e =>
        (e.student === user.username || e.examiner === user.username) &&
        (e.status === 'scheduled' || e.status === 'in_progress')
    );
    const container = document.getElementById('scheduledExamsList');

    if (scheduledExams.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u{1F4ED}</div><p>No scheduled exams</p></div>';
        return;
    }

    container.innerHTML = scheduledExams.map(exam => {
        const isExaminer = exam.examiner === user.username;
        const otherUser = state.users.find(u => u.username === (isExaminer ? exam.student : exam.examiner));

        const now = new Date();
        const fromTime = exam.fromDateTime ? new Date(exam.fromDateTime) : null;
        const toTime = exam.toDateTime ? new Date(exam.toDateTime) : null;

        let availabilityStatus = '';
        let canTakeExam = true;

        if (fromTime && toTime) {
            if (now < fromTime) {
                availabilityStatus = '<span class="exam-status-badge status-coming-soon">\u{1F7E1} Coming Soon</span>';
                canTakeExam = false;
            } else if (now > toTime) {
                availabilityStatus = '<span class="exam-status-badge status-expired">\u{1F534} Expired</span>';
                canTakeExam = false;
            } else {
                availabilityStatus = '<span class="exam-status-badge status-available">\u{1F7E2} Available Now</span>';
            }
        }

        const dateDisplay = exam.fromDateTime
            ? `${new Date(exam.fromDateTime).toLocaleDateString()} ${new Date(exam.fromDateTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} - ${new Date(exam.toDateTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`
            : `${exam.date} at ${exam.time}`;

        return `
            <div class="exam-card">
                <div class="exam-info">
                    <div class="exam-title">${escapeHtml(exam.title)}</div>
                    <div class="exam-meta">
                        <span>\u{1F4C5} ${dateDisplay}</span>
                        <span>\u{23F1}\u{FE0F} ${exam.duration} minutes</span>
                        <span>${isExaminer ? '\u{1F468}\u200D\u{1F393}' : '\u{1F468}\u200D\u{1F3EB}'} ${escapeHtml(otherUser.name)}</span>
                        ${availabilityStatus}
                    </div>
                </div>
                <div class="exam-actions">
                    ${!isExaminer && exam.status === 'scheduled' && canTakeExam
                        ? `<button class="btn btn-primary" style="width:auto" onclick="takeExam('${exam.id}')">Take Exam</button>` : ''}
                    ${!isExaminer && exam.status === 'in_progress'
                        ? `<button class="btn btn-primary" style="width:auto" onclick="takeExam('${exam.id}')">Continue Exam</button>` : ''}
                    ${isExaminer
                        ? `<button class="btn btn-secondary" onclick="showMetricsModal('${exam.id}')">View Details</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

// ─── Performance KPI Tiles ───
function loadPerformanceKPITiles() {
    const user = state.currentUser;
    const completedExams = state.exams.filter(e => e.student === user.username && e.result);
    const container = document.getElementById('performanceKPITiles');

    if (completedExams.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--color-text-secondary);"><div style="font-size:48px;margin-bottom:16px;opacity:0.5;">\u{1F4CA}</div><p>Complete exams to see your performance metrics</p></div>';
        return;
    }

    let totalScore = 0, totalMarks = 0, totalCorrect = 0, totalQuestions = 0, bestScore = 0;
    completedExams.forEach(exam => {
        totalScore += exam.result.score;
        totalMarks += exam.result.totalMarks;
        totalCorrect += exam.result.correctAnswers;
        totalQuestions += exam.result.totalQuestions;
        if (exam.result.percentage > bestScore) bestScore = exam.result.percentage;
    });

    const avgPercentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;
    const passRate = Math.round((completedExams.filter(e => e.result.percentage >= 40).length / completedExams.length) * 100);
    const latestExam = completedExams[completedExams.length - 1];

    let trend = '\u2192 Stable', trendColor = 'var(--color-text-secondary)';
    if (completedExams.length >= 2) {
        const recent = completedExams[completedExams.length - 1].result.percentage;
        const previous = completedExams[completedExams.length - 2].result.percentage;
        if (recent > previous) { trend = '\u2197 Improving'; trendColor = 'var(--color-success)'; }
        else if (recent < previous) { trend = '\u2198 Declining'; trendColor = 'var(--color-error)'; }
    }

    const assignedCount = state.exams.filter(e => e.examiner === user.username).length;
    const receivedCount = state.exams.filter(e => e.student === user.username).length;

    const tiles = [
        { icon: '\u{1F4DA}', title: 'Total Exams Taken', value: completedExams.length, color: '#3498db' },
        { icon: '\u2B50', title: 'Average Score', value: avgPercentage + '%', color: avgPercentage >= 70 ? '#2ecc71' : avgPercentage >= 50 ? '#f39c12' : '#e74c3c' },
        { icon: '\u2705', title: 'Pass Rate', value: passRate + '%', color: passRate >= 70 ? '#27ae60' : passRate >= 50 ? '#f39c12' : '#e74c3c' },
        { icon: '\u{1F3C6}', title: 'Best Score', value: bestScore + '%', color: '#f39c12' },
        { icon: '\u{1F3AF}', title: 'Latest Score', value: latestExam ? latestExam.result.percentage + '%' : 'N/A', trend: latestExam ? new Date(latestExam.completedAt).toLocaleDateString() : '', color: '#9b59b6' },
        { icon: '\u{1F4C8}', title: 'Improvement Trend', value: trend, color: trendColor },
        { icon: '\u{1F4E4}', title: 'Exams Assigned', value: assignedCount, trend: 'By you', color: '#e67e22' },
        { icon: '\u{1F4E5}', title: 'Exams Received', value: receivedCount, trend: 'To you', color: '#3498db' }
    ];

    container.innerHTML = tiles.map(t => `
        <div class="kpi-tile">
            <div class="kpi-tile-icon">${t.icon}</div>
            <div class="kpi-tile-title">${t.title}</div>
            <div class="kpi-tile-value" style="color:${t.color};">${t.value}</div>
            ${t.trend ? `<div class="kpi-tile-trend" style="color:var(--color-text-secondary);">${t.trend}</div>` : ''}
        </div>`).join('');
}

// ─── Assigned Exams ───
function loadAssignedExams() {
    const user = state.currentUser;
    const assignedExams = state.exams.filter(e =>
        e.examiner === user.username || e.student === user.username
    );
    const container = document.getElementById('assignedExamsList');
    const summaryContainer = document.getElementById('assignedExamsSummary');

    if (assignedExams.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u{1F4ED}</div><p>No exams assigned yet</p></div>';
        summaryContainer.innerHTML = '';
        return;
    }

    // Summary stats
    const completed = assignedExams.filter(e => e.status === 'completed' || e.status === 'evaluated').length;
    const pending = assignedExams.filter(e => e.status === 'scheduled').length;
    const inProgress = assignedExams.filter(e => e.status === 'in_progress').length;
    const withResults = assignedExams.filter(e => e.result);
    const avgScore = withResults.length > 0 ? Math.round(withResults.reduce((s, e) => s + e.result.percentage, 0) / withResults.length) : 0;
    const passRate = withResults.length > 0 ? Math.round(withResults.filter(e => e.result.percentage >= 40).length / withResults.length * 100) : 0;

    summaryContainer.innerHTML = `
        <div style="padding:20px;background:var(--color-bg-1);border:1px solid var(--color-card-border);border-radius:12px;">
            <h4 style="margin-bottom:16px;">\u{1F4CA} Summary Statistics</h4>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;">
                <div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:var(--color-primary);">${assignedExams.length}</div><div style="font-size:12px;color:var(--color-text-secondary);">Total Exams</div></div>
                <div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:var(--color-success);">${completed}</div><div style="font-size:12px;color:var(--color-text-secondary);">Completed</div></div>
                <div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:var(--color-warning);">${pending}</div><div style="font-size:12px;color:var(--color-text-secondary);">Pending</div></div>
                <div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:var(--color-info);">${inProgress}</div><div style="font-size:12px;color:var(--color-text-secondary);">In Progress</div></div>
                <div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:var(--color-primary);">${avgScore}%</div><div style="font-size:12px;color:var(--color-text-secondary);">Average Score</div></div>
                <div style="text-align:center;"><div style="font-size:24px;font-weight:bold;color:var(--color-success);">${passRate}%</div><div style="font-size:12px;color:var(--color-text-secondary);">Pass Rate</div></div>
            </div>
        </div>`;

    renderAssignedExamsList(assignedExams);
    setupAssignedExamsFilters();
}

function renderAssignedExamsList(exams) {
    const user = state.currentUser;
    const container = document.getElementById('assignedExamsList');

    if (exams.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><p>No exams found matching your criteria</p></div>';
        return;
    }

    container.innerHTML = exams.map(exam => {
        const isExaminer = exam.examiner === user.username;
        const otherUser = state.users.find(u => u.username === (isExaminer ? exam.student : exam.examiner));
        const fullscreenExit = exam.fullscreenExitSubmission || false;

        let fullscreenBadge = '';
        if (fullscreenExit) {
            fullscreenBadge = '<span class="status-badge" style="background:var(--color-bg-4);color:var(--color-error);border-color:var(--color-error);">\u{1F6AA} Fullscreen Exit</span>';
        }

        let statusBadge = '';
        if (exam.status === 'scheduled') statusBadge = '<span class="status-badge status-scheduled">\u{1F7E1} Pending</span>';
        else if (exam.status === 'in_progress') statusBadge = '<span class="status-badge status-in-progress">\u{1F535} In Progress</span>';
        else if (exam.status === 'completed' || exam.status === 'evaluated') statusBadge = '<span class="status-badge status-completed">\u2705 Completed</span>';

        const dateAssigned = exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : exam.date;
        const scheduledTime = exam.fromDateTime
            ? `${new Date(exam.fromDateTime).toLocaleDateString()} ${new Date(exam.fromDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} - ${new Date(exam.toDateTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`
            : `${exam.date} at ${exam.time}`;

        return `
            <div class="exam-card" style="flex-direction:column;align-items:stretch;">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
                    <div class="exam-title" style="font-size:18px;font-weight:600;">${escapeHtml(exam.title)}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">${statusBadge} ${fullscreenBadge}</div>
                </div>
                <div class="exam-meta" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;color:var(--color-text-secondary);">
                    <div><strong>Assigned ${isExaminer ? 'To' : 'By'}:</strong> ${escapeHtml(otherUser.name)}</div>
                    <div><strong>Date Assigned:</strong> ${dateAssigned}</div>
                    <div><strong>Scheduled:</strong> ${scheduledTime}</div>
                    <div><strong>Duration:</strong> ${exam.duration} minutes</div>
                    ${exam.result ? `
                        <div><strong>Score:</strong> <span style="color:var(--color-primary);font-weight:bold;">${exam.result.score}/${exam.result.totalMarks}</span></div>
                        <div><strong>Completed:</strong> ${new Date(exam.completedAt).toLocaleString()}</div>
                        ${fullscreenExit ? '<div style="grid-column:1/-1;"><strong style="color:var(--color-error);">\u26A0\uFE0F Submitted Early:</strong> Fullscreen exited during exam</div>' : ''}
                    ` : exam.status === 'in_progress' ? `
                        <div style="grid-column:1/-1;color:var(--color-warning);"><strong>\u23F3 Currently in progress...</strong></div>
                    ` : `
                        <div style="grid-column:1/-1;color:var(--color-info);"><strong>Waiting for student to take exam</strong></div>
                    `}
                </div>
                <div class="exam-actions" style="margin-top:16px;">
                    <button class="btn btn-primary" style="width:auto" onclick="showMetricsModal('${exam.id}')">View Details</button>
                    ${!isExaminer && exam.status === 'scheduled' ? `<button class="btn btn-secondary" onclick="takeExam('${exam.id}')">Take Exam</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

function setupAssignedExamsFilters() {
    const search = document.getElementById('assignedExamsSearch');
    const filter = document.getElementById('assignedExamsFilter');
    const sort = document.getElementById('assignedExamsSort');
    if (search) search.addEventListener('input', applyAssignedExamsFilters);
    if (filter) filter.addEventListener('change', applyAssignedExamsFilters);
    if (sort) sort.addEventListener('change', applyAssignedExamsFilters);
}

function applyAssignedExamsFilters() {
    const searchTerm = document.getElementById('assignedExamsSearch').value.toLowerCase();
    const filterStatus = document.getElementById('assignedExamsFilter').value;
    const sortBy = document.getElementById('assignedExamsSort').value;
    const user = state.currentUser;

    let exams = state.exams.filter(e => e.examiner === user.username || e.student === user.username);
    if (searchTerm) exams = exams.filter(e => e.title.toLowerCase().includes(searchTerm));
    if (filterStatus !== 'all') {
        if (filterStatus === 'pending') exams = exams.filter(e => e.status === 'scheduled');
        else if (filterStatus === 'in_progress') exams = exams.filter(e => e.status === 'in_progress');
        else if (filterStatus === 'completed') exams = exams.filter(e => e.status === 'completed' || e.status === 'evaluated');
    }
    if (sortBy === 'recent') exams.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
    else if (sortBy === 'score_high') exams.sort((a, b) => (b.result?.percentage || 0) - (a.result?.percentage || 0));
    else if (sortBy === 'score_low') exams.sort((a, b) => (a.result?.percentage || 0) - (b.result?.percentage || 0));
    else if (sortBy === 'by_status') {
        const order = { 'in_progress': 0, 'scheduled': 1, 'completed': 2, 'evaluated': 2 };
        exams.sort((a, b) => (order[a.status] || 3) - (order[b.status] || 3));
    }

    renderAssignedExamsList(exams);
}

// ─── Exam History Grid ───
function loadExamHistoryGrid() {
    const user = state.currentUser;
    const allExams = state.exams.filter(e => e.student === user.username);
    const container = document.getElementById('examHistoryGrid');

    if (allExams.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--color-text-secondary);"><div style="font-size:48px;margin-bottom:16px;opacity:0.5;">\u{1F4CB}</div><p>No exam history available</p></div>';
        return;
    }

    container.innerHTML = allExams.map(exam => {
        let statusBadge = '', statusColor = 'var(--color-info)';
        if (exam.status === 'scheduled') { statusBadge = '\u{1F7E1} Upcoming'; statusColor = 'var(--color-warning)'; }
        else if (exam.status === 'in_progress') { statusBadge = '\u23F3 In Progress'; statusColor = 'var(--color-warning)'; }
        else if (exam.status === 'completed' || exam.status === 'evaluated') { statusBadge = '\u2705 Completed'; statusColor = 'var(--color-success)'; }

        const dateDisplay = exam.completedAt ? new Date(exam.completedAt).toLocaleDateString()
            : (exam.fromDateTime ? new Date(exam.fromDateTime).toLocaleDateString() : exam.date);

        return `
            <div class="history-card">
                <div class="history-card-header">
                    <div>
                        <div class="history-card-title">${escapeHtml(exam.title)}</div>
                        <div style="font-size:12px;color:${statusColor};font-weight:600;">${statusBadge}</div>
                    </div>
                </div>
                <div class="history-card-meta">
                    <span>\u{1F4C5} ${dateDisplay}</span>
                    <span>\u{23F1}\u{FE0F} ${exam.duration} minutes</span>
                    ${exam.timeTaken ? `<span>\u23F0 Took: ${Math.floor(exam.timeTaken/60)}m ${exam.timeTaken%60}s</span>` : ''}
                </div>
                ${exam.result ? `
                    <div class="history-card-score">
                        ${exam.result.score}/${exam.result.totalMarks}
                        <div style="font-size:14px;color:var(--color-text-secondary);margin-top:4px;">${exam.result.percentage}% \u00B7 Grade ${exam.result.grade}</div>
                    </div>
                    <div style="padding:8px;background:${exam.result.percentage>=40?'var(--color-bg-3)':'var(--color-bg-4)'};border-radius:6px;text-align:center;font-size:13px;font-weight:600;color:${exam.result.percentage>=40?'var(--color-success)':'var(--color-error)'}">
                        ${exam.result.percentage>=40?'\u2705 PASS':'\u274C FAIL'}
                    </div>
                ` : ''}
                <div class="history-card-actions">
                    ${exam.result
                        ? `<button class="btn btn-primary" style="width:100%;" onclick="viewResults('${exam.id}')">View Details</button>`
                        : exam.status === 'scheduled'
                            ? `<button class="btn btn-primary" style="width:100%;" onclick="takeExam('${exam.id}')">Take Exam</button>`
                            : '<span style="color:var(--color-text-secondary);font-size:13px;text-align:center;width:100%;">Exam not available</span>'}
                </div>
            </div>`;
    }).join('');
}

// ─── Results Tab ───
function loadResultsTab() {
    const user = state.currentUser;
    const completedExams = state.exams.filter(e => e.student === user.username && e.result);
    const container = document.getElementById('resultsTabContent');

    if (completedExams.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u{1F4ED}</div><h3>\u274C No exam results available</h3><p style="color:var(--color-text-secondary);margin-top:8px;">Take an exam to see your results here</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="section-header"><h3 class="section-title">\u{1F4CA} Your Exam Results</h3></div>
        <div class="exams-list">
            ${completedExams.map(exam => {
                const r = exam.result;
                const d = new Date(exam.completedAt || exam.date);
                return `
                    <div class="exam-card">
                        <div class="exam-info">
                            <div class="exam-title">${escapeHtml(exam.title)}</div>
                            <div class="exam-meta">
                                <span>\u{1F4C5} ${d.toLocaleDateString()}</span>
                                <span>\u{1F4CA} ${r.score}/${r.totalMarks} (${r.percentage}%)</span>
                                <span>\u2705 ${r.correctAnswers}/${r.totalQuestions} correct</span>
                                <span class="status-badge" style="background:${r.grade==='F'?'var(--color-bg-4)':'var(--color-bg-3)'};color:${r.grade==='F'?'var(--color-error)':'var(--color-success)'};">Grade: ${r.grade}</span>
                            </div>
                        </div>
                        <div class="exam-actions">
                            <button class="btn btn-primary" style="width:auto" onclick="viewResults('${exam.id}')">View Details</button>
                        </div>
                    </div>`;
            }).join('')}
        </div>`;
}

// ─── Analytics Tab ───
function loadAnalyticsTab() {
    const user = state.currentUser;
    const completedExams = state.exams.filter(e => e.student === user.username && e.result);
    const container = document.getElementById('analyticsTabContent');

    if (completedExams.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><h3>\u274C No analytics data available yet</h3><p style="color:var(--color-text-secondary);margin-top:8px;">Complete more exams to see detailed analytics</p></div>';
        return;
    }

    const avg = Math.round(completedExams.reduce((s, e) => s + e.result.percentage, 0) / completedExams.length);
    const best = Math.max(...completedExams.map(e => e.result.percentage));

    container.innerHTML = `
        <div class="section-header"><h3 class="section-title">\u{1F50D} Detailed Analytics</h3></div>
        <div class="chart-container"><canvas id="analyticsChart"></canvas></div>
        <div style="margin-top:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
            <h4 style="margin-bottom:16px;">\u{1F4CA} Insights</h4>
            <ul style="list-style:none;padding:0;">
                <li style="padding:8px 0;">\u2713 You've completed ${completedExams.length} exam(s)</li>
                <li style="padding:8px 0;">\u2713 Average performance: ${avg}%</li>
                <li style="padding:8px 0;">\u2713 Best score: ${best}%</li>
                <li style="padding:8px 0;">\u2713 Keep practicing to improve!</li>
            </ul>
        </div>`;

    setTimeout(() => {
        const canvas = document.getElementById('analyticsChart');
        if (!canvas) return;
        new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: completedExams.map(e => e.title),
                datasets: [
                    { label: 'Score', data: completedExams.map(e => e.result.score), backgroundColor: 'rgba(33,128,141,0.6)' },
                    { label: 'Total Marks', data: completedExams.map(e => e.result.totalMarks), backgroundColor: 'rgba(50,184,198,0.6)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Score Comparison' } } }
        });
    }, 100);
}
