/**
 * @fileoverview UI Controls - Custom select dropdowns and number input handlers
 * Extracted from inline HTML for better organization
 */

const form = document.getElementById("quizOptions");
const startBtn = document.getElementById("startQuiz");
const questionsContainer = document.getElementById("questionsContainer");

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

class Question {
  constructor(data) {
    this.text = decodeURIComponent(data.question);
    this.correct = decodeURIComponent(data.correct_answer);
    this.category = decodeURIComponent(data.category);
    this.difficulty = data.difficulty;
    this.type = data.type;
    this.answers = [];
    this.timeLeft = 15;
    this.timer = null;
    this.answered = false;

    for (let i = 0; i < data.incorrect_answers.length; i++) {
      this.answers.push(decodeURIComponent(data.incorrect_answers[i]));
    }
    this.answers.push(this.correct);

    if (this.type === "boolean") {
      this.answers = ["True", "False"];
    } else {
      shuffle(this.answers);
    }
  }

  display(number, total, score, onFinish) {
    let answersHTML = "";
    for (let i = 0; i < this.answers.length; i++) {
      answersHTML += `
        <button class="answer-btn">
          <span class="answer-key">${i + 1}</span>
          <span class="answer-text">${this.answers[i]}</span>
        </button>
      `;
    }

    questionsContainer.innerHTML = `
      <div class="game-card question-card">
        <div class="xp-bar-container">
          <div class="xp-bar-header">
            <span class="xp-label"><i class="fa-solid fa-bolt"></i> Progress</span>
            <span class="xp-value">Round ${number}/${total}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-bar-fill" style="width: ${(number / total) * 100}%"></div>
          </div>
        </div>

        <div class="stats-row">
          <div class="stat-badge category">
            <i class="fa-solid fa-bookmark"></i>
            <span>${this.category}</span>
          </div>
          <div class="stat-badge difficulty ${this.difficulty}">
            <span>${this.difficulty}</span>
          </div>
          <div class="stat-badge timer">
            <i class="fa-solid fa-stopwatch"></i>
            <span class="timer-value">${this.timeLeft}</span>s
          </div>
          <div class="stat-badge counter">
            <i class="fa-solid fa-gamepad"></i>
            <span>${number}/${total}</span>
          </div>
        </div>

        <h2 class="question-text">${this.text}</h2>
        <div class="answers-grid">${answersHTML}</div>

        <p class="keyboard-hint">
          <i class="fa-regular fa-keyboard"></i> Press 1-${this.answers.length} to select
        </p>

        <div class="score-panel">
          <div class="score-item">
            <div class="score-item-label">Score</div>
            <div class="score-item-value">${score}</div>
          </div>
        </div>
      </div>
    `;

    let buttons = document.querySelectorAll(".answer-btn");
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", () => {
        this.selectAnswer(i, score, onFinish);
      });
    }

    this.startTimer(score, onFinish);
  }

  startTimer(score, onFinish) {
    let timerBadge = document.querySelector(".stat-badge.timer");
    let timerValue = document.querySelector(".timer-value");

    this.timer = setInterval(() => {
      this.timeLeft--;
      timerValue.textContent = this.timeLeft;

      if (this.timeLeft <= 5) {
        timerBadge.classList.add("warning");
      }

      if (this.timeLeft === 0) {
        document.querySelector(".question-card").insertAdjacentHTML(
          "beforeend",
          `<div class="time-up-message">
             <i class="fa-solid fa-clock"></i> TIME'S UP!
           </div>`
        );
        this.selectAnswer(-1, score, onFinish);
      }
    }, 1000);
  }

  selectAnswer(index, score, onFinish) {
    if (this.answered) return;
    this.answered = true;
    clearInterval(this.timer);

    let buttons = document.querySelectorAll(".answer-btn");
    let right = false;

    if (index !== -1) {
      let chosen = buttons[index].querySelector(".answer-text").textContent;
      right = chosen === this.correct;

      if (right) {
        buttons[index].classList.add("correct");
        document.querySelector(".score-item-value").textContent = score + 1;
      } else {
        buttons[index].classList.add("wrong");
      }
    }

    for (let j = 0; j < buttons.length; j++) {
      let text = buttons[j].querySelector(".answer-text").textContent;
      if (text === this.correct && !right) {
        buttons[j].classList.add("correct-reveal");
      } else if (j !== index && text !== this.correct) {
        buttons[j].classList.add("disabled");
      }
    }

    setTimeout(() => {
      onFinish(right);
    }, 1500);
  }
}

class Quiz {
  constructor(amount, category, difficulty) {
    this.amount = amount;
    this.category = category;
    this.difficulty = difficulty;
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
  }

  async getQuestions() {
    let url = `https://opentdb.com/api.php?amount=${this.amount}&difficulty=${this.difficulty}&encode=url3986`;
    if (this.category !== "") {
      url += `&category=${this.category}`;
    }

    let response = await fetch(url);
    let data = await response.json();

    if (data.response_code !== 0) {
      throw new Error("No questions");
    }

    for (let i = 0; i < data.results.length; i++) {
      this.questions.push(new Question(data.results[i]));
    }
  }

  showQuestion() {
    let question = this.questions[this.currentIndex];

    question.display(
      this.currentIndex + 1,
      this.questions.length,
      this.score,
      (right) => {
        if (right) this.score++;
        this.nextQuestion();
      }
    );
  }

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex < this.questions.length) {
      this.showQuestion();
    } else {
      this.showResults();
    }
  }

  showResults() {
    let percentage = Math.round((this.score / this.questions.length) * 100);

    questionsContainer.innerHTML = `
      <div class="game-card results-card">
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score-display">${this.score}/${this.questions.length}</p>
        <p class="results-percentage">${percentage}% Accuracy</p>
        <div class="action-buttons">
          <button class="btn-restart" id="restartBtn">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
        </div>
      </div>
    `;

    document.getElementById("restartBtn").addEventListener("click", function () {
      location.reload();
    });
  }
}

function showError() {
  questionsContainer.innerHTML = `
    <div class="game-card error-card">
      <div class="error-icon">
        <i class="fa-solid fa-triangle-exclamation"></i>
      </div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">Failed to load questions. Please try again.</p>
      <button class="btn-play retry-btn" id="retryBtn">
        <i class="fa-solid fa-rotate-right"></i> Try Again
      </button>
    </div>
  `;

  document.getElementById("retryBtn").addEventListener("click", function () {
    location.reload();
  });
}

startBtn.addEventListener("click", async function () {
  let category = document.getElementById("categoryMenu").value;
  let difficulty = document.getElementById("difficultyOptions").value;
  let amount = document.getElementById("questionsNumber").value;

  form.style.display = "none";

  questionsContainer.innerHTML = `
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading Questions...</p>
    </div>
  `;

  let quiz = new Quiz(amount, category, difficulty);

  try {
    await quiz.getQuestions();
    quiz.showQuestion();
  } catch (error) {
    showError();
  }
});




const numberInput = document.getElementById("questionsNumber");
const numberBtns = document.querySelectorAll(".number-btn");

for (let i = 0; i < numberBtns.length; i++) {
  numberBtns[i].addEventListener("click", function () {
    let value = Number(numberInput.value) || 1;

    if (numberBtns[i].dataset.action === "increment" && value < 50) {
      value++;
    } else if (numberBtns[i].dataset.action === "decrement" && value > 1) {
      value--;
    }
    numberInput.value = value;
  });
}


const selects = document.querySelectorAll(".custom-select");

for (let i = 0; i < selects.length; i++) {
  let select = selects[i];
  let trigger = select.querySelector(".custom-select-trigger");
  let options = select.querySelectorAll(".custom-select-option");
  let hiddenInput = select.parentElement.querySelector('input[type="hidden"]');

  trigger.addEventListener("click", function () {
    select.classList.toggle("open");
  });

  for (let j = 0; j < options.length; j++) {
    options[j].addEventListener("click", function () {
      hiddenInput.value = options[j].dataset.value;
      trigger.querySelector(".custom-select-text").textContent = options[j].textContent.trim();
      trigger.querySelector(".custom-select-icon").innerHTML = options[j].querySelector("i").outerHTML;
      select.classList.remove("open");
    });
  }
}