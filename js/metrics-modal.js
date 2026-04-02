/* ============================================
   Comprehensive Metrics Modal
   ============================================ */

function showMetricsModal(examId) {
    const exam = state.exams.find(e => e.id === examId);
    if (!exam) return;

    const user = state.currentUser;
    const isExaminer = exam.examiner === user.username;
    const student = state.users.find(u => u.username === exam.student);
    const examiner = state.users.find(u => u.username === exam.examiner);

    document.getElementById('metricsModalTitle').textContent = `Exam Details: ${exam.title}`;
    document.getElementById('metricsModalSubtitle').textContent =
        `Assigned To: ${student.name} | Status: ${exam.status === 'completed' || exam.status === 'evaluated' ? '\u2705 Completed' : exam.status === 'in_progress' ? '\u{1F535} In Progress' : '\u{1F7E1} Pending'}`;

    const content = document.getElementById('metricsModalContent');
    let html = '';

    // ─── Quick Metrics ───
    if (exam.result) {
        const r = exam.result;
        const tt = exam.timeTaken || 0;
        const m = Math.floor(tt / 60), s = tt % 60;
        const accuracy = Math.round((r.correctAnswers / r.totalQuestions) * 100);

        html += `
            <div style="margin-bottom:24px;">
                <h3 style="margin-bottom:16px;">\u{1F4CA} Quick Metrics</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
                    <div style="background:var(--color-bg-3);padding:16px;border-radius:12px;text-align:center;border:2px solid var(--color-success);">
                        <div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:8px;">Score</div>
                        <div style="font-size:32px;font-weight:bold;color:var(--color-success);">${r.score}/${r.totalMarks}</div>
                        <div style="font-size:16px;color:var(--color-text-secondary);">(${r.percentage}%)</div>
                    </div>
                    <div style="background:var(--color-bg-2);padding:16px;border-radius:12px;text-align:center;border:2px solid var(--color-warning);">
                        <div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:8px;">Grade</div>
                        <div style="font-size:32px;font-weight:bold;color:var(--color-warning);">${r.grade}</div>
                        <div style="font-size:16px;color:var(--color-text-secondary);">${r.percentage>=70?'\u2B50 Excellent':r.percentage>=40?'\u{1F44D} Pass':'\u274C Fail'}</div>
                    </div>
                    <div style="background:var(--color-bg-1);padding:16px;border-radius:12px;text-align:center;border:2px solid var(--color-primary);">
                        <div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:8px;">Time Taken</div>
                        <div style="font-size:32px;font-weight:bold;color:var(--color-primary);">${m}:${String(s).padStart(2,'0')}</div>
                        <div style="font-size:16px;color:var(--color-text-secondary);">of ${exam.duration} min</div>
                    </div>
                    <div style="background:var(--color-bg-5);padding:16px;border-radius:12px;text-align:center;border:2px solid var(--color-info);">
                        <div style="font-size:14px;color:var(--color-text-secondary);margin-bottom:8px;">Accuracy</div>
                        <div style="font-size:32px;font-weight:bold;color:var(--color-info);">${accuracy}%</div>
                        <div style="font-size:16px;color:var(--color-text-secondary);">${r.correctAnswers}/${r.totalQuestions} correct</div>
                    </div>
                </div>
            </div>`;
    }

    // ─── Exam Information ───
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    const scheduledTime = exam.fromDateTime
        ? `${new Date(exam.fromDateTime).toLocaleString()} - ${new Date(exam.toDateTime).toLocaleTimeString()}`
        : `${exam.date} at ${exam.time}`;

    html += `
        <div style="margin-bottom:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
            <h3 style="margin-bottom:16px;">\u{1F4CB} Exam Information</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
                <div><strong>Exam Name:</strong> ${escapeHtml(exam.title)}</div>
                <div><strong>Total Marks:</strong> ${totalMarks}</div>
                <div style="grid-column:1/-1;"><strong>Description:</strong> ${escapeHtml(exam.description)}</div>
                <div><strong>Scheduled:</strong> ${scheduledTime}</div>
                <div><strong>Duration:</strong> ${exam.duration} minutes</div>
                <div><strong>Questions:</strong> ${exam.questions.length}</div>
                <div><strong>Created:</strong> ${exam.createdAt ? new Date(exam.createdAt).toLocaleString() : 'N/A'}</div>
            </div>
        </div>`;

    // ─── Student Information ───
    html += `
        <div style="margin-bottom:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
            <h3 style="margin-bottom:16px;">\u{1F468}\u200D\u{1F393} Student Information</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
                <div><strong>Student:</strong> ${escapeHtml(student.name)}</div>
                <div><strong>Email:</strong> ${student.email}</div>
                <div><strong>Assigned By:</strong> ${escapeHtml(examiner.name)}</div>
                <div><strong>Duration:</strong> ${exam.duration} minutes</div>
                ${exam.completedAt ? `<div><strong>Taken On:</strong> ${new Date(exam.completedAt).toLocaleString()}</div>` : '<div style="grid-column:1/-1;color:var(--color-warning);"><strong>Status:</strong> Not yet taken</div>'}
            </div>
        </div>`;

    // ─── Fullscreen Exit Warning ───
    if (exam.fullscreenExitSubmission) {
        html += `
            <div style="margin-bottom:24px;padding:20px;background:var(--color-bg-4);border:2px solid var(--color-error);border-radius:12px;">
                <h3 style="margin-bottom:16px;color:var(--color-error);">\u26A0\uFE0F Fullscreen Exit - Early Submission</h3>
                <div style="font-size:14px;">
                    <div style="padding:12px;background:var(--color-surface);border-radius:6px;margin-bottom:8px;"><strong style="color:var(--color-error);">Reason:</strong> User exited fullscreen mode</div>
                    <div style="padding:12px;background:var(--color-surface);border-radius:6px;margin-bottom:8px;"><strong>Time:</strong> ${exam.completedAt ? new Date(exam.completedAt).toLocaleString() : 'N/A'}</div>
                    <div style="padding:12px;background:var(--color-surface);border-radius:6px;"><strong>Answers:</strong> ${Object.keys(exam.answers || {}).length}/${exam.questions.length}</div>
                </div>
            </div>`;
    }

    // ─── Behavioral Metrics ───
    if (exam.behavioralMetrics) {
        const bm = exam.behavioralMetrics;
        const bmTabCount = typeof bm.tabSwitches === 'number' ? bm.tabSwitches : (bm.tabSwitchCount || (Array.isArray(bm.tabSwitches) ? bm.tabSwitches.length : 0));
        const bmTabLog = Array.isArray(bm.tabSwitches) ? bm.tabSwitches : (bm.tabSwitchLog || []);
        html += `
            <div style="margin-bottom:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
                <h3 style="margin-bottom:16px;">\u{1F50D} Behavioral Metrics</h3>
                <div style="display:flex;flex-direction:column;gap:8px;font-size:14px;">
                    <div style="display:flex;justify-content:space-between;padding:8px;background:${bmTabCount>3?'var(--color-bg-4)':'var(--color-bg-3)'};border-radius:6px;">
                        <span>Tab Switches:</span>
                        <strong style="color:${bmTabCount>3?'var(--color-error)':'var(--color-success)'};">${bmTabCount} times ${bmTabCount>3?'\u26A0\uFE0F':'\u2705'}</strong>
                    </div>
                    ${bmTabLog.length > 0 ? `
                        <div style="padding:12px;background:var(--color-bg-1);border-radius:6px;max-height:200px;overflow-y:auto;">
                            ${bmTabLog.map((log, i) => `
                                <div style="padding:6px;margin-bottom:4px;background:var(--color-bg-4);border-radius:4px;font-size:12px;">
                                    <strong>Switch ${i+1}:</strong> At ${new Date(log.time).toLocaleTimeString()} ${log.duration ? `- Away for ${log.duration}s` : ''}
                                </div>`).join('')}
                        </div>` : ''}
                    <div style="display:flex;justify-content:space-between;padding:8px;background:${bm.copyAttempts>0?'var(--color-bg-4)':'var(--color-bg-3)'};border-radius:6px;">
                        <span>Copy Attempts:</span><strong style="color:${bm.copyAttempts>0?'var(--color-error)':'var(--color-success)'};">${bm.copyAttempts} ${bm.copyAttempts===0?'\u2705':'\u26A0\uFE0F'}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px;background:${bm.pasteAttempts>0?'var(--color-bg-4)':'var(--color-bg-3)'};border-radius:6px;">
                        <span>Paste Attempts:</span><strong style="color:${bm.pasteAttempts>0?'var(--color-error)':'var(--color-success)'};">${bm.pasteAttempts} ${bm.pasteAttempts===0?'\u2705':'\u26A0\uFE0F'}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:8px;background:var(--color-bg-1);border-radius:6px;">
                        <span>Fullscreen Toggles:</span><strong>${bm.fullscreenToggles} times</strong>
                    </div>
                </div>
            </div>`;
    }

    // ─── Question-wise Breakdown ───
    if (exam.result && exam.result.questionResults) {
        html += `
            <div style="margin-bottom:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
                <h3 style="margin-bottom:16px;">\u{1F4DD} Question-wise Breakdown</h3>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:14px;">
                        <thead><tr style="background:var(--color-bg-1);">
                            <th style="padding:12px;text-align:left;border:1px solid var(--color-card-border);">Q#</th>
                            <th style="padding:12px;text-align:left;border:1px solid var(--color-card-border);">Question</th>
                            <th style="padding:12px;text-align:left;border:1px solid var(--color-card-border);">Type</th>
                            <th style="padding:12px;text-align:center;border:1px solid var(--color-card-border);">Status</th>
                            <th style="padding:12px;text-align:center;border:1px solid var(--color-card-border);">Score</th>
                        </tr></thead>
                        <tbody>
                            ${exam.result.questionResults.map((qr, i) => `
                                <tr style="background:${i%2===0?'var(--color-surface)':'var(--color-bg-1)'};cursor:pointer;" onclick="toggleQuestionDetail(${i})">
                                    <td style="padding:12px;border:1px solid var(--color-card-border);">${i+1}</td>
                                    <td style="padding:12px;border:1px solid var(--color-card-border);">${escapeHtml(qr.question.text.substring(0,50))}${qr.question.text.length>50?'...':''}</td>
                                    <td style="padding:12px;border:1px solid var(--color-card-border);">${qr.question.type.toUpperCase()}</td>
                                    <td style="padding:12px;text-align:center;border:1px solid var(--color-card-border);">${qr.isCorrect?'\u2705':'\u274C'}</td>
                                    <td style="padding:12px;text-align:center;border:1px solid var(--color-card-border);"><strong>${qr.earnedMarks}/${qr.question.marks}</strong></td>
                                </tr>
                                <tr id="question-detail-${i}" style="display:none;">
                                    <td colspan="5" style="padding:16px;background:var(--color-bg-2);border:1px solid var(--color-card-border);">
                                        <div><strong>Full Question:</strong> ${escapeHtml(qr.question.text)}</div>
                                        ${qr.question.type === 'mcq' || qr.question.type === 'truefalse' ? `
                                            <div style="margin-top:8px;"><strong>Student's Answer:</strong> ${qr.userAnswer !== null ? escapeHtml(qr.question.options[qr.userAnswer]) : 'Not answered'}</div>
                                            <div style="margin-top:4px;"><strong>Correct Answer:</strong> ${escapeHtml(qr.question.options[qr.question.correct])}</div>
                                        ` : `
                                            <div style="margin-top:8px;"><strong>Student's Answer:</strong></div>
                                            <div style="padding:8px;background:var(--color-surface);border-radius:6px;margin-top:4px;">${escapeHtml(qr.userAnswer || 'Not answered')}</div>
                                        `}
                                        <div style="margin-top:8px;"><strong>Marks:</strong> ${qr.earnedMarks}/${qr.question.marks}</div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    // ─── Teacher Feedback ───
    if (exam.result && isExaminer) {
        html += `
            <div style="margin-bottom:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
                <h3 style="margin-bottom:16px;">\u{1F4AC} Grade & Feedback</h3>
                <div style="margin-bottom:16px;">
                    <div style="display:inline-block;padding:12px 24px;background:${exam.result.percentage>=70?'var(--color-bg-3)':exam.result.percentage>=40?'var(--color-bg-2)':'var(--color-bg-4)'};border-radius:12px;font-size:24px;font-weight:bold;color:${exam.result.percentage>=70?'var(--color-success)':exam.result.percentage>=40?'var(--color-warning)':'var(--color-error)'};">
                        Grade: ${exam.result.grade} ${exam.result.percentage>=70?'\u2B50':''}
                    </div>
                </div>
                <div>
                    <label style="display:block;margin-bottom:8px;font-weight:600;">Teacher Feedback:</label>
                    <textarea id="teacherFeedback" class="form-textarea" style="min-height:100px;" placeholder="Enter feedback...">${exam.feedback || ''}</textarea>
                    <button class="btn btn-primary" style="margin-top:12px;width:auto;" onclick="saveFeedback('${exam.id}')">\u{1F4BE} Save Feedback</button>
                </div>
            </div>`;
    } else if (exam.result && exam.feedback) {
        html += `
            <div style="margin-bottom:24px;padding:20px;background:var(--color-surface);border:1px solid var(--color-card-border);border-radius:12px;">
                <h3 style="margin-bottom:16px;">\u{1F4AC} Teacher Feedback</h3>
                <div style="padding:16px;background:var(--color-bg-1);border-radius:8px;">${escapeHtml(exam.feedback)}</div>
            </div>`;
    }

    content.innerHTML = html;
    document.getElementById('metricsModal').classList.add('active');
}

function toggleQuestionDetail(index) {
    const row = document.getElementById(`question-detail-${index}`);
    if (row) row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

async function saveFeedback(examId) {
    const exam = state.exams.find(e => e.id === examId);
    if (!exam) return;
    const feedback = document.getElementById('teacherFeedback').value;
    try {
        await api.updateExam(examId, { feedback });
        exam.feedback = feedback;
        showNotificationPopup('\u2705 Feedback Saved', 'Your feedback has been saved successfully.');
    } catch (e) {
        exam.feedback = feedback; // save locally anyway
        showNotificationPopup('\u26A0\uFE0F Warning', 'Feedback saved locally but server sync failed.');
    }
}
