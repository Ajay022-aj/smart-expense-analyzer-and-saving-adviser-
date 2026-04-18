function showFeedback(message, type = "success") {
  const feedback = document.getElementById("feedback");
  feedback.innerText = message;
  feedback.className = "feedback " + type;
  feedback.style.display = "block";
  setTimeout(() => feedback.style.display = "none", 3000);
}

function validateInput(value, fieldName, minLength = 1) {
  if (!value || value.trim().length === 0) {
    showFeedback(`${fieldName} cannot be empty`, "error");
    return false;
  }
  if (value.trim().length < minLength) {
    showFeedback(`${fieldName} must be at least ${minLength} characters`, "error");
    return false;
  }
  return true;
}

function signup() {
  let username = document.getElementById("newUser").value;
  let password = document.getElementById("newPass").value;

  if (!validateInput(username, "Username", 3)) return;
  if (!validateInput(password, "Password", 4)) return;

  localStorage.setItem("user", username.trim());
  localStorage.setItem("pass", password.trim());
  
  showFeedback("Signup successful! Redirecting...", "success");
  setTimeout(() => window.location = "dashboard.html", 1500);
}

function login() {
  let u = document.getElementById("username").value;
  let p = document.getElementById("password").value;

  if (!validateInput(u, "Username")) return;
  if (!validateInput(p, "Password")) return;

  let storedUser = localStorage.getItem("user");
  let storedPass = localStorage.getItem("pass");

  if (!storedUser) {
    showFeedback("No account found. Please sign up first.", "error");
    return;
  }

  if (u.trim() === storedUser && p.trim() === storedPass) {
    localStorage.setItem("login", "true");
    showFeedback("Login successful! Redirecting...", "success");
    setTimeout(() => window.location = "dashboard.html", 1500);
  } else {
    showFeedback("Invalid username or password", "error");
  }
}