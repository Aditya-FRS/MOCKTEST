/* ============================================
   Exam Taking - Timer, Fullscreen, Proctoring
   Now uses API for session management
   ============================================ */

function setupExamHandlers() {
    document.getElementById('submitExamBtn').addEventListener('click', () => submitExam(false));
}

// ─── Take Exam ───
async function takeExam(examId) {
    const exam = state.exams.find(e => e.id === examId);
    if (!exam) { showNotificationPopup('Error', 'Exam not found'); return; }

    // Check time window
    const now = new Date();
    const fromTime = exam.fromDateTime ? new Date(exam.fromDateTime) : null;
    const toTime = exam.toDateTime ? new Date(exam.toDateTime) : null;

    if (fromTime && toTime) {
        if (now < fromTime) { showExamNotAvailableModal(exam, 'not_started'); return; }
        if (now > toTime) { showExamNotAvailableModal(exam, 'expired'); return; }
    }

    try {
        await api.startExam(examId);
    } catch (e) {
        showNotificationPopup('Error', 'Failed to start exam: ' + e.message);
        return;
    }

    state.currentExam = exam;
    state.examStartTime = new Date();
    exam.status = 'in_progress';
    exam.answers = exam.answers || {};

    initExamTracking();
    showView('exam');
    renderExamInterface(exam);
    startExamTimer(exam.duration);
    enterFullscreen();
}

function showExamNotAvailableModal(exam, status) {
    const fromTime = new Date(exam.fromDateTime);
    const toTime = new Date(exam.toDateTime);
    const now = new Date();
    const fmt = d => d.toLocaleString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });

    if (status === 'not_started') {
        const timeDiff = Math.floor((fromTime - now) / 1000);
        showDynamicModal(`
            <div style="text-align:center;padding:24px;">
                <div style="font-size:64px;margin-bottom:16px;">\u23F0</div>
                <h2 style="color:var(--color-warning);margin-bottom:16px;">Exam Not Started Yet</h2>
                <p style="margin-bottom:24px;">This exam is scheduled from:</p>
                <div style="background:var(--color-bg-2);padding:16px;border-radius:8px;margin-bottom:24px;">
                    <strong>${fmt(fromTime)}</strong><br>to<br><strong>${fmt(toTime)}</strong>
                </div>
                <div class="countdown-timer">
                    <div style="font-size:18px;margin-bottom:8px;">Exam starts in:</div>
                    <div class="countdown-display" id="countdownDisplay">${formatCountdown(timeDiff)}</div>
                </div>
                <button class="btn btn-primary" onclick="closeDynamicModal()" style="margin-top:24px;">OK</button>
            </div>`);
        startCountdown(timeDiff);
    } else {
        showDynamicModal(`
            <div style="text-align:center;padding:24px;">
                <div style="font-size:64px;margin-bottom:16px;">\u23F0</div>
                <h2 style="color:var(--color-error);margin-bottom:16px;">Exam Time Expired</h2>
                <p style="margin-bottom:24px;">This exam was available from:</p>
                <div style="background:var(--color-bg-4);padding:16px;border-radius:8px;margin-bottom:24px;">
                    <strong>${fmt(fromTime)}</strong><br>to<br><strong>${fmt(toTime)}</strong>
                </div>
                <div style="padding:16px;background:var(--color-bg-4);border-radius:8px;border:2px solid var(--color-error);">
                    <strong style="color:var(--color-error);">\u274C EXAM CLOSED</strong><br>
                    <span style="color:var(--color-text-secondary);">Submissions no longer accepted</span>
                </div>
                <button class="btn btn-primary" onclick="closeDynamicModal()" style="margin-top:24px;">OK</button>
            </div>`);
    }
}

function startCountdown(initialSeconds) {
    let remaining = initialSeconds;
    if (window._countdownInterval) clearInterval(window._countdownInterval);
    window._countdownInterval = setInterval(() => {
        remaining--;
        const display = document.getElementById('countdownDisplay');
        if (display) display.textContent = formatCountdown(remaining);
        if (remaining <= 0) {
            clearInterval(window._countdownInterval);
            closeDynamicModal();
            showNotificationPopup('Exam Available', 'The exam is now available.');
        }
    }, 1000);
}

// ─── Render Exam ───
function renderExamInterface(exam) {
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    document.getElementById('examInterfaceTitle').textContent = exam.title;
    document.getElementById('examInterfaceDescription').innerHTML = `
        <p>${escapeHtml(exam.description)}</p>
        <div style="display:flex;gap:20px;margin-top:12px;font-size:14px;">
            <span><strong>Total Marks:</strong> ${totalMarks}</span>
            <span><strong>Duration:</strong> ${exam.duration} minutes</span>
            <span><strong>Questions:</strong> ${exam.questions.length}</span>
        </div>`;

    document.getElementById('examQuestions').innerHTML = exam.questions.map((q, i) => {
        let optionsHtml = '';
        if (q.type === 'mcq' || q.type === 'truefalse') {
            optionsHtml = `<div class="answer-options">${q.options.map((opt, oi) => `
                <label class="answer-option">
                    <input type="radio" name="answer-${i}" value="${oi}" onchange="saveAnswerToFirestore(${i}, ${oi})">
                    <span>${escapeHtml(opt)}</span>
                </label>`).join('')}</div>`;
        } else {
            optionsHtml = `<textarea class="answer-textarea" id="answer-${i}" placeholder="Type your answer here..." onblur="saveAnswerToFirestore(${i}, this.value)"></textarea>`;
        }
        const imageHtml = q.imageUrl ? `<div style="margin:12px 0;"><img src="${q.imageUrl}" alt="Question image" style="max-width:100%;max-height:300px;border-radius:8px;"></div>` : '';
        return `
            <div class="question-card">
                <div class="question-text">
                    <strong>Question ${i+1}:</strong> ${escapeHtml(q.text)}
                    <span style="float:right;color:var(--color-primary);">Marks: ${q.marks}</span>
                </div>
                ${imageHtml}
                ${optionsHtml}
            </div>`;
    }).join('');
}

// Real-time answer save to Firestore
function saveAnswerToFirestore(questionSeq, value) {
    if (!state.currentExam) return;
    api.saveAnswer(state.currentExam.id, questionSeq, value).catch(() => {});
}

// ─── Timer ───
function startExamTimer(durationMinutes) {
    let timeRemaining = durationMinutes * 60;
    const timerDisplay = document.getElementById('timerDisplay');
    if (state.examTimer) clearInterval(state.examTimer);

    state.examTimer = setInterval(() => {
        timeRemaining--;
        const m = Math.floor(timeRemaining / 60);
        const s = timeRemaining % 60;
        timerDisplay.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        if (timeRemaining <= 0) { clearInterval(state.examTimer); submitExam(true); }
    }, 1000);
}

// ─── Submit Exam ───
async function submitExam(autoSubmit) {
    if (!autoSubmit && !confirm('Are you sure you want to submit the exam?')) return;

    clearInterval(state.examTimer);
    stopExamTracking();

    const exam = state.currentExam;
    const answers = collectAnswers(exam);
    const timeTaken = Math.floor((new Date() - new Date(state.examStartTime)) / 1000);
    const behavioralMetrics = buildBehavioralMetrics(timeTaken);

    try {
        const result = await api.submitExam(exam.id, {
            answers,
            behavioralMetrics: {
                tabSwitches: state.examMetrics.tabSwitches,
                tabSwitchCount: state.examMetrics.tabSwitches.length,
                copyAttempts: state.examMetrics.copyAttempts,
                pasteAttempts: state.examMetrics.pasteAttempts,
                fullscreenToggles: state.examMetrics.fullscreenToggles,
                idleTime: state.examMetrics.idleTime,
                activeTime: timeTaken - state.examMetrics.idleTime,
                warningsTriggered: state.examMetrics.copyAttempts + state.examMetrics.pasteAttempts
            },
            timeTaken,
            fullscreenExitSubmission: false
        });

        exam.answers = answers;
        exam.status = 'completed';
        exam.completedAt = new Date().toISOString();
        exam.timeTaken = timeTaken;
        exam.behavioralMetrics = behavioralMetrics;
        exam.result = result;
    } catch (e) {
        exam.answers = answers;
        exam.status = 'completed';
        exam.completedAt = new Date().toISOString();
        exam.timeTaken = timeTaken;
        exam.behavioralMetrics = behavioralMetrics;
        evaluateExamAnswersLocally(exam);
    }

    showNotificationPopup('Exam Submitted', `Your exam "${exam.title}" has been submitted successfully.`);

    // Exit fullscreen
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    document.removeEventListener('fullscreenchange', handleFullscreenExit);

    viewResults(exam.id);
}

function collectAnswers(exam) {
    const answers = {};
    exam.questions.forEach((q, i) => {
        if (q.type === 'mcq' || q.type === 'truefalse') {
            const sel = document.querySelector(`input[name="answer-${i}"]:checked`);
            answers[i] = sel ? parseInt(sel.value) : null;
        } else {
            const ta = document.getElementById(`answer-${i}`);
            answers[i] = ta ? ta.value : '';
        }
    });
    return answers;
}

function buildBehavioralMetrics(timeTaken) {
    return {
        tabSwitches: state.examMetrics.tabSwitches.length,
        tabSwitchLog: state.examMetrics.tabSwitches,
        copyAttempts: state.examMetrics.copyAttempts,
        pasteAttempts: state.examMetrics.pasteAttempts,
        fullscreenToggles: state.examMetrics.fullscreenToggles,
        idleTime: state.examMetrics.idleTime,
        activeTime: timeTaken - state.examMetrics.idleTime,
        warningsTriggered: state.examMetrics.copyAttempts + state.examMetrics.pasteAttempts
    };
}

// ─── Local Evaluate (fallback) ───
function evaluateExamAnswersLocally(exam) {
    let score = 0, totalMarks = 0, correctAnswers = 0;
    const questionResults = [];

    exam.questions.forEach((q, i) => {
        totalMarks += q.marks;
        const userAnswer = exam.answers[i];
        let isCorrect = false, earnedMarks = 0;

        if (q.type === 'mcq' || q.type === 'truefalse') {
            isCorrect = userAnswer === q.correct;
            earnedMarks = isCorrect ? q.marks : 0;
            score += earnedMarks;
            if (isCorrect) correctAnswers++;
        } else {
            if (userAnswer && userAnswer.trim().length > 10) {
                earnedMarks = Math.floor(q.marks * 0.7);
                score += earnedMarks;
                isCorrect = true;
                correctAnswers++;
            }
        }
        questionResults.push({ question: q, userAnswer, isCorrect, earnedMarks });
    });

    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    exam.result = { score, totalMarks, percentage, grade, correctAnswers, totalQuestions: exam.questions.length, questionResults, timeTaken: exam.timeTaken };
    exam.status = 'evaluated';
}

// ─── Fullscreen ───
function enterFullscreen() {
    const elem = document.documentElement;
    const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
    if (req) req.call(elem).catch(() => {});
    document.addEventListener('fullscreenchange', handleFullscreenExit);
    document.addEventListener('webkitfullscreenchange', handleFullscreenExit);
}

function handleFullscreenExit() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (state.currentExam && state.currentExam.status === 'in_progress') {
            autoSubmitExamOnFullscreenExit();
        }
    }
}

async function autoSubmitExamOnFullscreenExit() {
    const exam = state.currentExam;
    if (!exam) return;

    clearInterval(state.examTimer);
    stopExamTracking();

    const answers = collectAnswers(exam);
    const timeTaken = Math.floor((new Date() - new Date(state.examStartTime)) / 1000);
    const behavioralMetrics = {
        tabSwitches: state.examMetrics.tabSwitches,
        tabSwitchCount: state.examMetrics.tabSwitches.length,
        copyAttempts: state.examMetrics.copyAttempts,
        pasteAttempts: state.examMetrics.pasteAttempts,
        fullscreenToggles: state.examMetrics.fullscreenToggles,
        idleTime: state.examMetrics.idleTime,
        activeTime: timeTaken - state.examMetrics.idleTime,
        warningsTriggered: state.examMetrics.copyAttempts + state.examMetrics.pasteAttempts,
        fullscreenExit: true
    };

    try {
        const result = await api.submitExam(exam.id, {
            answers, behavioralMetrics, timeTaken,
            fullscreenExitSubmission: true
        });

        exam.answers = answers;
        exam.status = 'completed';
        exam.completedAt = new Date().toISOString();
        exam.fullscreenExitSubmission = true;
        exam.timeTaken = timeTaken;
        exam.behavioralMetrics = behavioralMetrics;
        exam.result = result;
    } catch (e) {
        exam.answers = answers;
        exam.status = 'completed';
        exam.completedAt = new Date().toISOString();
        exam.fullscreenExitSubmission = true;
        exam.timeTaken = timeTaken;
        exam.behavioralMetrics = behavioralMetrics;
        evaluateExamAnswersLocally(exam);
    }

    // Remove listeners
    document.removeEventListener('fullscreenchange', handleFullscreenExit);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenExit);

    // Show warning
    showDynamicModal(`
        <div style="text-align:center;padding:32px;">
            <div style="font-size:72px;margin-bottom:20px;">\u26A0\uFE0F</div>
            <h2 style="color:var(--color-error);margin-bottom:16px;font-size:28px;">Exam Submitted - Fullscreen Exited</h2>
            <div style="background:var(--color-bg-4);padding:20px;border-radius:12px;margin:24px 0;border:2px solid var(--color-error);">
                <p style="font-size:16px;margin-bottom:12px;">You exited fullscreen mode during the exam.</p>
                <p style="font-size:16px;font-weight:bold;">The exam has been automatically submitted.</p>
            </div>
            <button class="btn btn-primary" onclick="closeDynamicModal();viewResults('${exam.id}');" style="margin-top:20px;padding:12px 32px;font-size:16px;">View Results</button>
        </div>`);
}

// ─── Proctoring / Tracking ───
function initExamTracking() {
    state.examMetrics = {
        tabSwitches: [], copyAttempts: 0, pasteAttempts: 0,
        fullscreenToggles: 0, idleTime: 0, lastActivityTime: Date.now(),
        questionStartTimes: {}, isTabActive: true
    };
    document.addEventListener('visibilitychange', _handleVisibility);
    document.addEventListener('copy', _handleCopy);
    document.addEventListener('paste', _handlePaste);
    _startIdleTracking();
}

function stopExamTracking() {
    document.removeEventListener('visibilitychange', _handleVisibility);
    document.removeEventListener('copy', _handleCopy);
    document.removeEventListener('paste', _handlePaste);
    if (state.idleTimer) clearTimeout(state.idleTimer);
    if (state.activityTimer) clearInterval(state.activityTimer);
}

function _handleVisibility() {
    const now = Date.now();
    if (document.hidden) {
        state.examMetrics.isTabActive = false;
        const event = { time: new Date().toISOString(), type: 'left', timestamp: now };
        state.examMetrics.tabSwitches.push(event);
        // Report to Firestore
        if (state.currentExam) {
            api.sendProctoringEvent(state.currentExam.id, 'tab_switch', event).catch(() => {});
        }
    } else {
        const last = state.examMetrics.tabSwitches[state.examMetrics.tabSwitches.length - 1];
        if (last && last.type === 'left') {
            last.duration = Math.floor((now - last.timestamp) / 1000);
            last.returnTime = new Date().toISOString();
        }
        state.examMetrics.isTabActive = true;
    }
}

function _handleCopy() {
    if (state.currentExam) {
        state.examMetrics.copyAttempts++;
        showNotificationPopup('\u26A0\uFE0F Warning', 'Copy action detected during exam');
        api.sendProctoringEvent(state.currentExam.id, 'copy', { time: new Date().toISOString() }).catch(() => {});
    }
}

function _handlePaste() {
    if (state.currentExam) {
        state.examMetrics.pasteAttempts++;
        showNotificationPopup('\u26A0\uFE0F Warning', 'Paste action detected during exam');
        api.sendProctoringEvent(state.currentExam.id, 'paste', { time: new Date().toISOString() }).catch(() => {});
    }
}

function _startIdleTracking() {
    let idleStart = null;
    const resetIdle = () => {
        if (idleStart) {
            state.examMetrics.idleTime += Math.floor((Date.now() - idleStart) / 1000);
            idleStart = null;
        }
        state.examMetrics.lastActivityTime = Date.now();
        if (state.idleTimer) clearTimeout(state.idleTimer);
        state.idleTimer = setTimeout(() => { idleStart = Date.now(); }, 30000);
    };
    document.addEventListener('mousemove', resetIdle);
    document.addEventListener('keypress', resetIdle);
    document.addEventListener('click', resetIdle);
    resetIdle();
}
