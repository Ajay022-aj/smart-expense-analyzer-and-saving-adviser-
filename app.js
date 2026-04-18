let data = JSON.parse(localStorage.getItem("exp")) || [];
let currentChart = null;
let editingIndex = null;
let aiAnalysis = JSON.parse(localStorage.getItem("aiAnalysis")) || {};

const CATEGORIES = ["Food", "Transport", "Entertainment", "Utilities", "Healthcare", "Education", "Shopping", "Other"];

// AI Analysis Functions
async function analyzeWithAI() {
  try {
    showFeedback("🤖 Analyzing your expenses with AI...", "info");
    
    const analysisData = generateExpenseAnalysis();
    const prompt = createAnalysisPrompt(analysisData);
    
    // Try using Hugging Face API (free tier)
    const apiKey = localStorage.getItem("huggingfaceKey");
    
    if (apiKey) {
      const response = await fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1", {
        headers: { Authorization: `Bearer ${apiKey}` },
        method: "POST",
        body: JSON.stringify({ inputs: prompt }),
      });
      
      if (response.ok) {
        const result = await response.json();
        const insights = result[0]?.generated_text || null;
        if (insights) {
          aiAnalysis = {
            insights: insights.replace(prompt, "").trim(),
            timestamp: new Date().toLocaleDateString(),
            data: analysisData
          };
          localStorage.setItem("aiAnalysis", JSON.stringify(aiAnalysis));
          showFeedback("✅ AI Analysis complete!", "success");
          displayAIInsights();
          return;
        }
      }
    }
    
    // Fallback: Generate local analysis without external AI
    aiAnalysis = {
      insights: generateLocalInsights(analysisData),
      timestamp: new Date().toLocaleDateString(),
      data: analysisData
    };
    localStorage.setItem("aiAnalysis", JSON.stringify(aiAnalysis));
    showFeedback("✅ Analysis complete! (Local AI)", "success");
    displayAIInsights();
    
  } catch (error) {
    console.error("AI Analysis error:", error);
    showFeedback("Failed to analyze. Using local analysis...", "error");
    
    // Fallback to local analysis
    const analysisData = generateExpenseAnalysis();
    aiAnalysis = {
      insights: generateLocalInsights(analysisData),
      timestamp: new Date().toLocaleDateString(),
      data: analysisData
    };
    localStorage.setItem("aiAnalysis", JSON.stringify(aiAnalysis));
    displayAIInsights();
  }
}

function generateExpenseAnalysis() {
  const totalExpense = data.reduce((sum, e) => sum + e.amount, 0);
  const income = Number(localStorage.getItem("income")) || 0;
  const savings = income - totalExpense;
  
  const categoryTotals = {};
  data.forEach(expense => {
    const cat = expense.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
  });
  
  const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const averageExpense = data.length > 0 ? (totalExpense / data.length).toFixed(2) : 0;
  
  return {
    totalExpense: totalExpense.toFixed(2),
    income: income.toFixed(2),
    savings: savings.toFixed(2),
    savingsPercent: income > 0 ? ((savings / income) * 100).toFixed(1) : 0,
    expenseCount: data.length,
    averageExpense: averageExpense,
    highestCategory: highestCategory ? highestCategory[0] : "None",
    highestCategoryAmount: highestCategory ? highestCategory[1].toFixed(2) : 0,
    categoryTotals: categoryTotals
  };
}

function createAnalysisPrompt(analysisData) {
  return `Analyze this expense data and provide 3 key insights with actionable recommendations:
Total Income: ₹${analysisData.income}
Total Expenses: ₹${analysisData.totalExpense}
Savings: ₹${analysisData.savings} (${analysisData.savingsPercent}%)
Number of Expenses: ${analysisData.expenseCount}
Average Expense: ₹${analysisData.averageExpense}
Highest Spending Category: ${analysisData.highestCategory} (₹${analysisData.highestCategoryAmount})
Spending by Category: ${JSON.stringify(analysisData.categoryTotals)}

Please provide:
1. An analysis of the spending patterns
2. Two specific recommendations to improve savings
3. Budget suggestions for high-spending categories
Keep the response concise and practical.`;
}

function generateLocalInsights(analysisData) {
  const insights = [];
  
  // Insight 1: Savings ratio
  const savingsPercent = parseFloat(analysisData.savingsPercent);
  if (savingsPercent >= 20) {
    insights.push(`💪 Great job! You're saving ${analysisData.savingsPercent}% of your income. Keep up this disciplined approach.`);
  } else if (savingsPercent >= 10) {
    insights.push(`✅ Good savings rate at ${analysisData.savingsPercent}%. Try to increase it by cutting discretionary spending.`);
  } else if (savingsPercent >= 0) {
    insights.push(`⚠️ You're saving only ${analysisData.savingsPercent}% of income. Consider reducing ${analysisData.highestCategory} expenses.`);
  } else {
    insights.push(`🚨 You're spending more than earning! Income: ₹${analysisData.income}, Expenses: ₹${analysisData.totalExpense}`);
  }
  
  // Insight 2: Spending pattern
  const avgSpend = parseFloat(analysisData.averageExpense);
  insights.push(`📊 Your average expense per transaction is ₹${analysisData.averageExpense}. You have ${analysisData.expenseCount} tracked expenses.`);
  
  // Insight 3: Category recommendation
  insights.push(`🎯 Your highest spending is in ${analysisData.highestCategory} (₹${analysisData.highestCategoryAmount}). Consider setting a budget limit for this category to optimize savings.`);
  
  return insights.join("\n\n");
}

function displayAIInsights() {
  const insightsContainer = document.getElementById("aiInsights");
  if (!insightsContainer) return;
  
  let html = `
    <div class="ai-insights-box">
      <h3>🤖 AI Expense Analysis</h3>
      <p class="insights-date">Analysis Date: ${aiAnalysis.timestamp}</p>
      <div class="insights-content">
  `;
  
  if (aiAnalysis.insights) {
    html += `<p class="insights-text">${aiAnalysis.insights.replace(/\n/g, '<br>')}</p>`;
  }
  
  if (aiAnalysis.data) {
    html += generateBudgetRecommendations(aiAnalysis.data);
  }
  
  html += `</div>
    <button onclick="analyzeWithAI()" class="refresh-analysis-btn">🔄 Refresh Analysis</button>
  </div>`;
  
  insightsContainer.innerHTML = html;
}

function generateBudgetRecommendations(data) {
  const income = parseFloat(data.income);
  if (income === 0) return "";
  
  const recommendations = `
    <div class="budget-recommendations">
      <h4>💡 Recommended Monthly Budget (50/30/20 Rule)</h4>
      <ul>
        <li>Essentials (50%): ₹${(income * 0.5).toFixed(2)}</li>
        <li>Discretionary (30%): ₹${(income * 0.3).toFixed(2)}</li>
        <li>Savings (20%): ₹${(income * 0.2).toFixed(2)}</li>
      </ul>
      <p style="font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 10px;">
        Current Savings Rate: ${data.savingsPercent}%
      </p>
    </div>
  `;
  
  return recommendations;
}

// Session verification
function verifySession() {
  if (!localStorage.getItem("login")) {
    window.location = "index.html";
  }
}

// Feedback system
function showFeedback(message, type = "success") {
  const feedback = document.getElementById("feedback");
  if (!feedback) return;
  feedback.innerText = message;
  feedback.className = "feedback " + type;
  feedback.style.display = "block";
  setTimeout(() => feedback.style.display = "none", 3000);
}

// Input validation
function validateInput(value, fieldName, minValue = null, maxValue = null) {
  if (value === null || value === undefined || String(value).trim().length === 0) {
    showFeedback(`${fieldName} cannot be empty`, "error");
    return false;
  }
  
  if (minValue !== null && Number(value) < minValue) {
    showFeedback(`${fieldName} must be at least ${minValue}`, "error");
    return false;
  }
  
  if (maxValue !== null && Number(value) > maxValue) {
    showFeedback(`${fieldName} must be at most ${maxValue}`, "error");
    return false;
  }
  
  return true;
}

// Initialize category selector
function initCategorySelector() {
  const categorySelect = document.getElementById("category");
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    CATEGORIES.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.innerText = cat;
      categorySelect.appendChild(option);
    });
  }
}

function add() {
  let name = document.getElementById("name").value;
  let amount = document.getElementById("amount").value;
  let category = document.getElementById("category").value || "Other";

  if (!validateInput(name, "Expense name", 1)) return;
  if (!validateInput(amount, "Amount", 0.01)) return;

  if (editingIndex !== null) {
    // Edit existing expense
    data[editingIndex] = {
      name: name.trim(),
      amount: Number(amount),
      category: category,
      date: data[editingIndex].date,
      editedDate: new Date().toLocaleDateString()
    };
    showFeedback("Expense updated successfully!", "success");
    editingIndex = null;
    document.querySelector("button[onclick='add()']").innerText = "Add Expense";
  } else {
    // Add new expense
    data.push({
      name: name.trim(),
      amount: Number(amount),
      category: category,
      date: new Date().toLocaleDateString(),
      editedDate: null
    });
    showFeedback("Expense added successfully!", "success");
  }

  localStorage.setItem("exp", JSON.stringify(data));
  
  document.getElementById("name").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("category").value = "";
  
  load();
}

function editExpense(index) {
  const expense = data[index];
  document.getElementById("name").value = expense.name;
  document.getElementById("amount").value = expense.amount;
  document.getElementById("category").value = expense.category || "Other";
  
  editingIndex = index;
  document.querySelector("button[onclick='add()']").innerText = "Update Expense";
  
  // Scroll to form
  document.getElementById("add").scrollIntoView({ behavior: "smooth" });
  document.getElementById("name").focus();
}

function cancelEdit() {
  editingIndex = null;
  document.getElementById("name").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("category").value = "";
  document.querySelector("button[onclick='add()']").innerText = "Add Expense";
}

function load() {
  let total = 0;
  let list = document.getElementById("list");
  list.innerHTML = "";

  if (data.length === 0) {
    list.innerHTML = "<li class='empty-state'>No expenses yet. Start adding!</li>";
  } else {
    data.forEach((e, index) => {
      total += e.amount;
      let li = document.createElement("li");
      li.className = "expense-item";
      li.innerHTML = `
        <div class="expense-info">
          <div class="expense-header">
            <span class="expense-name">${e.name}</span>
            <span class="expense-category">${e.category || "Other"}</span>
          </div>
          <div class="expense-amount">₹${e.amount.toFixed(2)}</div>
          <span class="expense-date">${e.date}${e.editedDate ? ' (edited)' : ''}</span>
        </div>
        <div class="expense-actions">
          <button class="edit-btn" onclick="editExpense(${index})">Edit</button>
          <button class="delete-btn" onclick="deleteExpense(${index})">Delete</button>
        </div>
      `;
      list.appendChild(li);
    });
  }

  document.getElementById("total").innerText = "Total Expenses: ₹" + total.toFixed(2);
  makeChart(total);
}

function deleteExpense(index) {
  if (confirm("Are you sure you want to delete this expense?")) {
    data.splice(index, 1);
    localStorage.setItem("exp", JSON.stringify(data));
    showFeedback("Expense deleted", "info");
    cancelEdit();
    load();
  }
}

function makeChart(total) {
  let ctx = document.getElementById("chart");
  
  // Destroy previous chart if it exists
  if (currentChart) {
    currentChart.destroy();
  }

  // Create category breakdown
  const categoryTotals = {};
  data.forEach(expense => {
    const cat = expense.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
  });

  const categories = Object.keys(categoryTotals);
  const amounts = Object.values(categoryTotals);

  // Only create chart if total > 0
  if (total > 0) {
    currentChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: categories.length > 0 ? categories : ["No Data"],
        datasets: [{
          label: "Expenses by Category (₹)",
          data: amounts.length > 0 ? amounts : [0],
          backgroundColor: [
            "rgba(99, 102, 241, 0.7)",
            "rgba(168, 85, 247, 0.7)",
            "rgba(236, 72, 153, 0.7)",
            "rgba(59, 130, 246, 0.7)",
            "rgba(16, 185, 129, 0.7)",
            "rgba(245, 158, 11, 0.7)",
            "rgba(239, 68, 68, 0.7)",
            "rgba(107, 114, 128, 0.7)"
          ],
          borderColor: "rgba(30, 41, 59, 0.5)",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }
    });
  }
}

function saveProfile() {
  let income = document.getElementById("income").value;

  if (!validateInput(income, "Income", 0.01)) return;

  localStorage.setItem("income", Number(income).toFixed(2));
  showFeedback("Income saved successfully!", "success");
  document.getElementById("income").value = "";
}

function showSaving() {
  let income = Number(localStorage.getItem("income")) || 0;
  let total = data.reduce((s, e) => s + e.amount, 0);

  let save = income - total;
  let savingPercent = income > 0 ? ((save / income) * 100).toFixed(1) : 0;

  // Category breakdown
  const categoryTotals = {};
  data.forEach(expense => {
    const cat = expense.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
  });

  let categoryBreakdown = "<h3>Spending by Category</h3><ul>";
  if (Object.keys(categoryTotals).length === 0) {
    categoryBreakdown += "<li>No expenses yet</li>";
  } else {
    Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amount]) => {
        const percentage = ((amount / total) * 100).toFixed(1);
        categoryBreakdown += `<li>${cat}: ₹${amount.toFixed(2)} (${percentage}%)</li>`;
      });
  }
  categoryBreakdown += "</ul>";

  document.getElementById("saveText").innerHTML = `
    <div class="savings-summary">
      <div class="summary-item">
        <label>Monthly Income:</label>
        <p class="amount">₹${income.toFixed(2)}</p>
      </div>
      <div class="summary-item">
        <label>Total Expenses:</label>
        <p class="amount">₹${total.toFixed(2)}</p>
      </div>
      <div class="summary-item ${save >= 0 ? 'positive-box' : 'negative-box'}">
        <label>Savings:</label>
        <p class="amount large ${save >= 0 ? 'positive' : 'negative'}">₹${save.toFixed(2)} (${savingPercent}%)</p>
      </div>
    </div>
    ${categoryBreakdown}
  `;
}

function show(id) {
  document.querySelectorAll(".card").forEach(c => c.classList.add("hide"));
  document.querySelectorAll(".sidebar button").forEach(b => b.classList.remove("active"));
  document.getElementById(id).classList.remove("hide");
  event.target.classList.add("active");

  if (id === "saving") showSaving();
  if (id === "home") makeChart(data.reduce((s, e) => s + e.amount, 0));
  if (id === "add") cancelEdit();
  if (id === "analysis") {
    generateSpendingTrends();
    if (Object.keys(aiAnalysis).length > 0) {
      displayAIInsights();
    }
  }
  if (id === "settings") {
    document.getElementById("apiKey").value = localStorage.getItem("huggingfaceKey") || "";
  }
}

function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("login");
    showFeedback("Logged out successfully!", "success");
    setTimeout(() => window.location = "index.html", 1000);
  }
}

// Settings & API Functions
function saveAPIKey() {
  const apiKey = document.getElementById("apiKey").value.trim();
  
  if (!apiKey) {
    showFeedback("API Key cannot be empty", "error");
    return;
  }
  
  localStorage.setItem("huggingfaceKey", apiKey);
  showFeedback("✅ API Key saved successfully!", "success");
}

function clearAPIKey() {
  if (confirm("Are you sure you want to clear the API key?")) {
    localStorage.removeItem("huggingfaceKey");
    document.getElementById("apiKey").value = "";
    showFeedback("API Key cleared", "info");
  }
}

function exportData() {
  const exportData = {
    expenses: data,
    income: localStorage.getItem("income"),
    exportDate: new Date().toLocaleString()
  };
  
  const json = JSON.stringify(exportData, null, 2);
  downloadFile(json, "expenses_" + new Date().getTime() + ".json", "application/json");
  showFeedback("📥 Data exported as JSON", "success");
}

function downloadCSV() {
  let csv = "Date,Expense Name,Category,Amount\n";
  
  data.forEach(expense => {
    csv += `"${expense.date}","${expense.name}","${expense.category || 'Other'}",${expense.amount}\n`;
  });
  
  // Add summary
  const total = data.reduce((sum, e) => sum + e.amount, 0);
  const income = localStorage.getItem("income") || 0;
  csv += "\n,,,\n";
  csv += `"Summary",,"Total Expenses",${total}\n`;
  csv += `"","","Income",${income}\n`;
  csv += `"","","Savings",${(income - total).toFixed(2)}\n`;
  
  downloadFile(csv, "expenses_" + new Date().getTime() + ".csv", "text/csv");
  showFeedback("📊 Data exported as CSV", "success");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function clearAllData() {
  if (confirm("⚠️ This will delete ALL your data permanently. Are you sure?")) {
    if (confirm("This action cannot be undone. Click OK to confirm.")) {
      data = [];
      localStorage.setItem("exp", JSON.stringify(data));
      localStorage.removeItem("income");
      localStorage.removeItem("aiAnalysis");
      showFeedback("All data cleared", "info");
      load();
    }
  }
}

function generateSpendingTrends() {
  const trendsContainer = document.getElementById("spendingTrends");
  if (!trendsContainer) return;
  
  if (data.length === 0) {
    trendsContainer.innerHTML = "<p style='color: rgba(255,255,255,0.6);'>No expense data yet. Add expenses to see trends.</p>";
    return;
  }
  
  // Calculate trends by category
  const categoryTotals = {};
  data.forEach(expense => {
    const cat = expense.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + expense.amount;
  });
  
  const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
  
  let html = `
    <div class="spending-trends">
      <h3>📈 Spending Breakdown by Category</h3>
      <div class="trends-chart">
  `;
  
  Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount]) => {
      const percentage = ((amount / totalSpent) * 100).toFixed(1);
      const barWidth = percentage;
      html += `
        <div class="trend-item">
          <div class="trend-label">${category}</div>
          <div class="trend-bar-container">
            <div class="trend-bar" style="width: ${barWidth}%"></div>
          </div>
          <div class="trend-value">₹${amount.toFixed(2)} (${percentage}%)</div>
        </div>
      `;
    });
  
  html += `</div></div>`;
  
  trendsContainer.innerHTML = html;
}

window.onload = function() {
  verifySession();
  initCategorySelector();
  load();
};