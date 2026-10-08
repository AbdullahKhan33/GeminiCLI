// ==========================================
// 1. APPLICATION STATE (MODEL)
// ==========================================
const State = {
  expenses: [
    { description: "Lunch", amount: 250, category: "Food" },
    { description: "Taxi", amount: 450, category: "Travel" },
    { description: "Coffee", amount: 150, category: "Food" }
  ],
  categories: ["Food", "Travel", "Shopping", "Bills", "Other"],

  addExpense(description, amount, category) {
    this.expenses.push({ description, amount, category });
  },

  deleteExpense(index) {
    this.expenses.splice(index, 1);
  },

  addCategory(name) {
    this.categories.push(name);
  },

  hasCategory(name) {
    return this.categories.some(cat => cat.toLowerCase() === name.toLowerCase());
  }
};

// ==========================================
// 2. DOM UTILITIES (VIEW HELPERS)
// ==========================================
const DOM = {
  // Ultra-safe and performant clearing of DOM nodes (replaces innerHTML = "")
  clear(element) {
    if (element) {
      element.replaceChildren();
    }
  },

  // Dry option creation logic
  createOption(value, text, disabled = false, selected = false) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = text;
    if (disabled) opt.disabled = true;
    if (selected) opt.selected = true;
    return opt;
  }
};

// ==========================================
// 3. RENDER FUNCTIONS
// ==========================================
function updateCategoryDropdowns() {

  const categorySelect = document.getElementById("category");
  const filterSelect = document.getElementById("categoryFilter");

  const currentCategory = categorySelect.value;
  const currentFilter = filterSelect.value;

  DOM.clear(categorySelect);
  DOM.clear(filterSelect);

  categorySelect.appendChild(DOM.createOption("", "Category", true, true));
  filterSelect.appendChild(DOM.createOption("All", "All"));

  State.categories.forEach(cat => {
    categorySelect.appendChild(DOM.createOption(cat, cat));
    filterSelect.appendChild(DOM.createOption(cat, cat));
  });

  if (State.categories.includes(currentCategory)) {
    categorySelect.value = currentCategory;
  }
  if (currentFilter === "All" || State.categories.includes(currentFilter)) {
    filterSelect.value = currentFilter;
  }
}

function renderExpenses() {

  const list = document.getElementById("expenseList");
  const filterElement = document.getElementById("categoryFilter");
  const filterValue = filterElement ? filterElement.value : "All";

  DOM.clear(list);
  let total = 0;

  State.expenses.forEach((expense, index) => {

    if (filterValue !== "All" && expense.category !== filterValue) {
      return;
    }

    total += expense.amount;

    const li = document.createElement("li");

    const textSpan = document.createElement("span");
    textSpan.textContent = `${expense.description} (${expense.category}) - ₹${expense.amount}`;
    li.appendChild(textSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = function() {
      deleteExpense(index);
    };
    li.appendChild(deleteBtn);

    list.appendChild(li);

  });

  document.getElementById("total").innerText = total;
}

// ==========================================
// 4. CONTROLLER / EVENT HANDLERS
// ==========================================
function createCategory() {

  const input = document.getElementById("newCategory");
  const catName = input.value.trim();

  if (!catName) {
    alert("Please enter a category name.");
    return;
  }

  if (State.hasCategory(catName)) {
    alert(`The category "${catName}" already exists.`);
    return;
  }

  State.addCategory(catName);
  input.value = "";

  updateCategoryDropdowns();
}

function addExpense() {

  const descriptionInput = document.getElementById("description");
  const amountInput = document.getElementById("amount");
  const categorySelect = document.getElementById("category");

  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  if (!description) {
    alert("Please enter an expense description.");
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid amount greater than 0.");
    return;
  }

  if (!category) {
    alert("Please select a category.");
    return;
  }

  State.addExpense(description, amount, category);

  descriptionInput.value = "";
  amountInput.value = "";
  categorySelect.value = "";

  renderExpenses();
}

function deleteExpense(index) {

  State.deleteExpense(index);
  renderExpenses();
}

// Initialize Application
updateCategoryDropdowns();
renderExpenses();