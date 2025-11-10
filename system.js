let shuffledQuestions = [];
let currentQuestionIndex = 0;
let selectedOption = null;
let selectedOptions = new Set();
let fillInAnswer = "";
let totalAnswered = 0;
let correctAnswers = 0;

// ⭐ 儲存所有答錯題目的陣列（儲存原始題目物件）
let incorrectQuestions = [];

const questionNumberElement = document.getElementById('question-number');
const questionTextElement = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const feedbackElement = document.getElementById('feedback');
const submitButton = document.getElementById('submit-btn');
const nextButton = document.getElementById('next-btn');
const progressElement = document.getElementById('progress');
const totalAnsweredElement = document.getElementById('total-answered');
const accuracyElement = document.getElementById('accuracy');
const themeToggle = document.getElementById('theme-toggle');
const downloadErrorsButton = document.getElementById('download-errors-btn');

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function shuffleQuestionOptions(question) {
    if (question.type === "fill-in") return question;

    if (question.type === "multiple-choice") {
        const correctAnswerText = question.options[question.correctAnswer];
        const indices = question.options.map((_, i) => i);
        const shuffledIndices = shuffleArray(indices);
        const shuffledOptions = shuffledIndices.map(i => question.options[i]);
        const newCorrectAnswer = shuffledOptions.indexOf(correctAnswerText);

        return { ...question, options: shuffledOptions, correctAnswer: newCorrectAnswer };
    }

    if (question.type === "multi-select") {
        const correctAnswerTexts = question.correctAnswer.map(idx => question.options[idx]);
        const indices = question.options.map((_, i) => i);
        const shuffledIndices = shuffleArray(indices);
        const shuffledOptions = shuffledIndices.map(i => question.options[i]);
        const newCorrectAnswers = correctAnswerTexts.map(text => shuffledOptions.indexOf(text));

        return { ...question, options: shuffledOptions, correctAnswer: newCorrectAnswers };
    }

    return question;
}

function init() {
    loadTheme();
    shuffledQuestions = shuffleArray([...questions]);
    shuffledQuestions = shuffledQuestions.map(q => shuffleQuestionOptions(q));

    displayQuestion();
    updateStats();

    themeToggle.addEventListener('click', toggleTheme);
    submitButton.addEventListener('click', checkAnswer);
    nextButton.addEventListener('click', nextQuestion);
    downloadErrorsButton.addEventListener('click', downloadIncorrectQuestions);
}

function displayQuestion() {
    const question = shuffledQuestions[currentQuestionIndex];

    let typeBadge;
    if (question.type === "multiple-choice") {
        typeBadge = '<span class="question-type-badge multiple-choice">單選題</span>';
    } else if (question.type === "multi-select") {
        typeBadge = '<span class="question-type-badge multi-select">多選題</span>';
    } else {
        typeBadge = '<span class="question-type-badge fill-in">填充題</span>';
    }

    questionNumberElement.innerHTML = `題目 ${currentQuestionIndex + 1}/${shuffledQuestions.length} ${typeBadge}`;
    questionTextElement.textContent = question.question;
    progressElement.style.width = `${((currentQuestionIndex + 1) / shuffledQuestions.length) * 100}%`;

    optionsContainer.innerHTML = '';
    selectedOptions.clear();

    if (question.type === "multiple-choice") {
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.dataset.index = index;

            optionElement.addEventListener('click', () => {
                if (submitButton.style.display === 'none') return;

                document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
                optionElement.classList.add('selected');
                selectedOption = index;
                submitButton.disabled = false;
            });

            optionsContainer.appendChild(optionElement);
        });
    } else if (question.type === "multi-select") {
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.textContent = option;
            optionElement.dataset.index = index;

            optionElement.addEventListener('click', () => {
                if (submitButton.style.display === 'none') return;
                if (selectedOptions.has(index)) {
                    selectedOptions.delete(index);
                    optionElement.classList.remove('selected');
                } else {
                    selectedOptions.add(index);
                    optionElement.classList.add('selected');
                }
                submitButton.disabled = selectedOptions.size === 0;
            });

            optionsContainer.appendChild(optionElement);
        });
    } else {
        const inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'fill-in-input';
        inputElement.placeholder = '請輸入答案...';
        inputElement.id = 'fill-in-input';

        inputElement.addEventListener('input', (e) => {
            fillInAnswer = e.target.value.trim();
            submitButton.disabled = fillInAnswer.length === 0;
        });

        inputElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && fillInAnswer.length > 0) checkAnswer();
        });

        optionsContainer.appendChild(inputElement);

        const hintElement = document.createElement('div');
        hintElement.className = 'fill-in-hint';
        hintElement.textContent = '💡 提示：輸入完成後按 Enter 或點擊提交按鈕';
        optionsContainer.appendChild(hintElement);

        setTimeout(() => inputElement.focus(), 100);
    }

    feedbackElement.className = 'feedback';
    feedbackElement.textContent = '';
    submitButton.style.display = 'block';
    nextButton.style.display = 'none';
    downloadErrorsButton.style.display = incorrectQuestions.length > 0 ? 'block' : 'none';
    submitButton.disabled = true;
    selectedOption = null;
    fillInAnswer = "";
}

function checkAnswer() {
    const question = shuffledQuestions[currentQuestionIndex];
    let isCorrect = false;
    let currentCorrectAnswerDisplay = "";

    if (question.type === "multiple-choice") {
        if (selectedOption === null) return;
        isCorrect = selectedOption === question.correctAnswer;
        currentCorrectAnswerDisplay = question.options[question.correctAnswer];
    } else if (question.type === "multi-select") {
        if (selectedOptions.size === 0) return;
        const correctSet = new Set(question.correctAnswer);
        isCorrect = selectedOptions.size === correctSet.size &&
            [...selectedOptions].every(idx => correctSet.has(idx));
        currentCorrectAnswerDisplay = question.correctAnswer.map(idx => question.options[idx]).join('、');
    } else {
        if (fillInAnswer.length === 0) return;
        const normalizedAnswer = fillInAnswer.toLowerCase().replace(/\s+/g, '');
        isCorrect = question.acceptableAnswers.some(answer =>
            answer.toLowerCase().replace(/\s+/g, '') === normalizedAnswer
        );
        const originalQuestion = questions.find(q => q.question === question.question);
        currentCorrectAnswerDisplay = originalQuestion.correctAnswer;
    }

    totalAnswered++;
    if (isCorrect) correctAnswers++;
    else {
        const originalQuestion = questions.find(q => q.question === question.question);
        if (originalQuestion && !incorrectQuestions.some(q => q.question === originalQuestion.question)) {
            incorrectQuestions.push(originalQuestion);
        }
    }
    updateStats();

    feedbackElement.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackElement.textContent = isCorrect ? '✓ 回答正確！' : `✗ 回答錯誤。正確答案是：${currentCorrectAnswerDisplay}`;

    if (question.type === "multiple-choice") {
        document.querySelectorAll('.option').forEach((option, index) => {
            option.style.pointerEvents = 'none';
            if (index === question.correctAnswer) option.classList.add('correct');
            else if (index === selectedOption && !isCorrect) option.classList.add('incorrect');
        });
    } else if (question.type === "multi-select") {
        const correctSet = new Set(question.correctAnswer);
        document.querySelectorAll('.option').forEach((option, index) => {
            option.style.pointerEvents = 'none';
            if (correctSet.has(index)) option.classList.add('correct');
            else if (selectedOptions.has(index)) option.classList.add('incorrect');
        });
    } else {
        const inputElement = document.getElementById('fill-in-input');
        inputElement.disabled = true;
        inputElement.classList.add(isCorrect ? 'correct' : 'incorrect');
    }

    submitButton.style.display = 'none';
    nextButton.style.display = 'block';
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= shuffledQuestions.length) {
        currentQuestionIndex = 0;
        shuffledQuestions = shuffleArray([...questions]).map(q => shuffleQuestionOptions(q));
    }
    displayQuestion();
}

function updateStats() {
    totalAnsweredElement.textContent = totalAnswered;
    const accuracy = totalAnswered > 0 ? Math.round((correctAnswers / totalAnswered) * 100) : 0;
    accuracyElement.textContent = `${accuracy}%`;
    downloadErrorsButton.style.display = incorrectQuestions.length > 0 ? 'block' : 'none';
}

// ⭐ 下載錯題本（僅 JSON，支援 iOS / Android，檔名依 <title>）
function downloadIncorrectQuestions() {
    if (incorrectQuestions.length === 0) {
        alert("目前沒有錯誤題目可以下載！");
        return;
    }

    const pageTitle = document.title || "錯題本";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const fileName = `${pageTitle}_${dateStr}.json`;
    const jsonData = JSON.stringify(incorrectQuestions, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    if (navigator.userAgent.match(/ipad|iphone|ipod/i)) {
        const reader = new FileReader();
        reader.onloadend = function () {
            const dataUrl = reader.result;
            const popup = window.open();
            if (popup) {
                popup.document.write('<pre>' + dataUrl.split(',')[1] + '</pre>');
                popup.document.title = `${fileName}`;
            } else {
                alert("請允許彈出視窗以查看錯題內容");
            }
        };
        reader.readAsDataURL(blob);
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

window.onload = init;
