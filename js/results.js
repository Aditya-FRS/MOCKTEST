/* ============================================
   Results View - Charts, Answers Review
   ============================================ */

function viewResults(examId) {
    const exam = state.exams.find(e => e.id === examId);
    if (!exam || !exam.result) return;

    showView('results');
    const r = exam.result;

    document.getElementById('resultsExamTitle').textContent = exam.title;
    document.getElementById('resultsScore').textContent = `${r.score}/${r.totalMarks}`;
    document.getElementById('resultsGrade').textContent = r.grade;
    document.getElementById('resultsPercentage').textContent = r.percentage + '%';
    document.getElementById('resultsAttempted').textContent = `${r.totalQuestions}/${r.totalQuestions}`;
    document.getElementById('resultsCorrect').textContent = r.correctAnswers;

    const minutes = Math.floor(r.timeTaken / 60);
    const seconds = r.timeTaken % 60;
    document.getElementById('resultsTime').textContent = `${minutes}m ${seconds}s`;

    // Behavioral metrics
    renderBehavioralMetrics(exam);
    renderPerformanceChart(r);
    renderAnswersReview(r);
}

function renderBehavioralMetrics(exam) {
    const section = document.getElementById('behavioralMetricsSection');
    if (!exam.behavioralMetrics) { section.innerHTML = ''; return; }

    const m = exam.behavioralMetrics;
    const tabCount = typeof m.tabSwitches === 'number' ? m.tabSwitches : (m.tabSwitchCount || (Array.isArray(m.tabSwitches) ? m.tabSwitches.length : 0));
    const tabLog = Array.isArray(m.tabSwitches) ? m.tabSwitches : (m.tabSwitchLog || []);
    section.innerHTML = `
        <div style="margin-bottom:24px;">
            <h3 style="margin-bottom:16px;">\u{1F50D} Behavioral Metrics</h3>
            <div class="performance-grid">
                <div class="performance-card">
                    <div class="stat-label">Tab Switches</div>
                    <div class="stat-value" style="color:${tabCount > 3 ? 'var(--color-error)' : 'var(--color-success)'}">${tabCount}</div>
                </div>
                <div class="performance-card">
                    <div class="stat-label">Copy Attempts</div>
                    <div class="stat-value" style="color:${m.copyAttempts > 0 ? 'var(--color-error)' : 'var(--color-success)'}">${m.copyAttempts}</div>
                </div>
                <div class="performance-card">
                    <div class="stat-label">Paste Attempts</div>
                    <div class="stat-value" style="color:${m.pasteAttempts > 0 ? 'var(--color-error)' : 'var(--color-success)'}">${m.pasteAttempts}</div>
                </div>
                <div class="performance-card">
                    <div class="stat-label">Idle Time</div>
                    <div class="stat-value">${Math.floor(m.idleTime/60)}m ${m.idleTime%60}s</div>
                </div>
                <div class="performance-card">
                    <div class="stat-label">Active Time</div>
                    <div class="stat-value" style="color:var(--color-success)">${Math.floor(m.activeTime/60)}m ${m.activeTime%60}s</div>
                </div>
                <div class="performance-card">
                    <div class="stat-label">Fullscreen Toggles</div>
                    <div class="stat-value">${m.fullscreenToggles}</div>
                </div>
            </div>
            ${tabLog.length > 0 ? `
                <div style="margin-top:16px;padding:16px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
                    <h4 style="margin-bottom:12px;">\u{1F4CB} Tab Switch Log</h4>
                    <div style="max-height:200px;overflow-y:auto;">
                        ${tabLog.map((log, i) => `
                            <div style="padding:8px;margin-bottom:4px;background:var(--color-bg-4);border-radius:6px;font-size:13px;">
                                <strong>Switch ${i+1}:</strong> Left at ${new Date(log.time).toLocaleTimeString()}${log.duration ? ` - Away for ${log.duration}s` : ''}
                            </div>`).join('')}
                    </div>
                </div>` : ''}
        </div>`;
}

function renderPerformanceChart(result) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if (window._perfChartInstance) window._perfChartInstance.destroy();

    window._perfChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Score', 'Percentage', 'Correct Answers'],
            datasets: [{
                label: 'Performance Metrics',
                data: [result.score, result.percentage, result.correctAnswers],
                backgroundColor: ['rgba(33,128,141,0.6)', 'rgba(50,184,198,0.6)', 'rgba(41,150,161,0.6)'],
                borderColor: ['rgba(33,128,141,1)', 'rgba(50,184,198,1)', 'rgba(41,150,161,1)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: true, text: 'Performance Overview' } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderAnswersReview(result) {
    const container = document.getElementById('answersReviewList');
    container.innerHTML = result.questionResults.map((qr, i) => {
        const q = qr.question;
        let answerDisplay = '';

        if (q.type === 'mcq' || q.type === 'truefalse') {
            const userText = qr.userAnswer !== null ? q.options[qr.userAnswer] : 'Not answered';
            const correctText = q.options[q.correct];
            answerDisplay = `<p><strong>Your Answer:</strong> ${escapeHtml(userText)}</p><p><strong>Correct Answer:</strong> ${escapeHtml(correctText)}</p>`;
        } else {
            answerDisplay = `<p><strong>Your Answer:</strong></p><p style="background:var(--color-bg-1);padding:12px;border-radius:8px;">${escapeHtml(qr.userAnswer || 'Not answered')}</p>`;
        }

        return `
            <div class="review-question">
                <h4>Question ${i+1}: ${escapeHtml(q.text)}</h4>
                ${q.imageUrl ? `<img src="${q.imageUrl}" alt="Question image" style="max-width:100%;max-height:200px;border-radius:8px;margin:8px 0;">` : ''}
                ${answerDisplay}
                <div style="margin-top:12px;">
                    <span class="answer-status ${qr.isCorrect ? 'answer-correct' : 'answer-incorrect'}">
                        ${qr.isCorrect ? '\u2713 Correct' : '\u2717 Incorrect'}
                    </span>
                    <span style="margin-left:16px;font-weight:bold;color:var(--color-primary);">${qr.earnedMarks}/${q.marks} marks</span>
                </div>
            </div>`;
    }).join('');
}
