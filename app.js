class App {
    constructor() {
        this.settings = null;
        this.expenses = null;
        this.chartManager = null;
        this.currentView = 'dashboard';
        this.appListenersBound = false;
        
        this.init();
    }

    init() {
        this.setupAuthEventListeners();
        
        const user = Storage.getCurrentUser();
        if (user) {
            this.showApp();
        } else {
            this.showLogin();
        }
    }

    showApp() {
        this.settings = Storage.getSettings();
        this.expenses = Storage.getExpenses();
        
        if (!this.chartManager) {
            this.chartManager = new ChartManager();
        }
        
        this.applyTheme(this.settings.theme);
        this.updateSettingsUI();
        this.updateDashboard();
        this.setupAppEventListeners();
        
        // Initial setup for current month filter
        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('filter-month').value = monthStr;
        
        this.renderAllExpenses();

        // Switch UI visibility
        document.getElementById('login-container').classList.add('hidden');
        document.querySelector('.app-container').classList.remove('hidden');
        
        // Clear forms
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
    }

    showLogin() {
        document.getElementById('login-container').classList.remove('hidden');
        document.querySelector('.app-container').classList.add('hidden');
    }

    setupAuthEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        }

        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
        }
    }

    switchAuthTab(mode) {
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('login-form');
        const formRegister = document.getElementById('register-form');

        if (mode === 'login') {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.remove('hidden');
            formRegister.classList.add('hidden');
        } else {
            tabLogin.classList.remove('active');
            tabRegister.classList.add('active');
            formLogin.classList.add('hidden');
            formRegister.classList.remove('hidden');
        }
    }

    handleLoginSubmit(e) {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const rememberInput = document.getElementById('login-remember');

        const username = usernameInput.value;
        const password = passwordInput.value;
        const rememberMe = rememberInput.checked;

        const authResult = Storage.authenticateUser(username, password);
        if (authResult.success) {
            Storage.login(username, rememberMe);
            this.showToast(`Welcome back, ${authResult.user.name}!`, 'success');
            this.showApp();
        } else {
            this.showToast(authResult.message, 'danger');
        }
    }

    handleRegisterSubmit(e) {
        e.preventDefault();
        const nameInput = document.getElementById('register-name');
        const emailInput = document.getElementById('register-email');
        const usernameInput = document.getElementById('register-username');
        const passwordInput = document.getElementById('register-password');
        const confirmInput = document.getElementById('register-confirm');

        const name = nameInput.value;
        const email = emailInput.value;
        const username = usernameInput.value;
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        if (password !== confirm) {
            this.showToast('Passwords do not match!', 'danger');
            return;
        }

        const registerResult = Storage.registerUser(username, name, email, password);
        if (registerResult.success) {
            this.showToast('Registration successful! Please sign in.', 'success');
            this.switchAuthTab('login');
            document.getElementById('login-username').value = username;
            document.getElementById('login-password').value = '';
        } else {
            this.showToast(registerResult.message, 'danger');
        }
    }

    handleLogout() {
        if (confirm('Are you sure you want to log out?')) {
            Storage.logout();
            this.showToast('Logged out successfully.', 'info');
            this.switchView('dashboard');
            this.showLogin();
        }
    }

    setupAppEventListeners() {
        if (this.appListenersBound) return;

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView(e.currentTarget.dataset.view);
            });
        });

        // Theme Toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
            this.applyTheme(this.settings.theme);
            Storage.saveSettings(this.settings);
            this.chartManager.updateTheme();
        });

        // Modal
        const modal = document.getElementById('expense-modal');
        document.getElementById('add-expense-btn').addEventListener('click', () => this.openModal());
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal());
        });
        document.querySelector('.modal-backdrop').addEventListener('click', () => this.closeModal());

        // Expense Form
        document.getElementById('expense-form').addEventListener('submit', (e) => this.handleExpenseSubmit(e));

        // Settings Form
        document.getElementById('settings-form').addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        document.getElementById('clear-data-btn').addEventListener('click', () => this.handleWipeData());

        // Filters
        document.getElementById('search-input').addEventListener('input', () => this.renderAllExpenses());
        document.getElementById('filter-category').addEventListener('change', () => this.renderAllExpenses());
        document.getElementById('filter-month').addEventListener('change', () => this.renderAllExpenses());
        document.getElementById('clear-filters').addEventListener('click', () => {
            document.getElementById('search-input').value = '';
            document.getElementById('filter-category').value = 'all';
            document.getElementById('filter-month').value = '';
            this.renderAllExpenses();
        });

        // Export
        document.getElementById('export-btn').addEventListener('click', () => this.exportData());
        
        // View All Link
        document.getElementById('view-all-link').addEventListener('click', () => this.switchView('expenses'));
        
        // View All Savings Button
        document.getElementById('view-savings-btn').addEventListener('click', () => {
            this.switchView('insights');
            setTimeout(() => {
                const container = document.getElementById('savings-history-container');
                if(container) container.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        });

        // Logout Button
        document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

        this.appListenersBound = true;
    }

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        
        document.querySelectorAll('.nav-item').forEach(item => {
            if(item.dataset.view === viewId) item.classList.add('active');
            else item.classList.remove('active');
        });

        const titles = {
            'dashboard': 'Dashboard',
            'expenses': 'All Expenses',
            'insights': 'Smart Insights',
            'settings': 'Preferences'
        };
        document.getElementById('page-title').textContent = titles[viewId];
        this.currentView = viewId;

        if (viewId === 'dashboard') this.updateDashboard();
        if (viewId === 'expenses') this.renderAllExpenses();
        if (viewId === 'insights') this.generateInsights();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = document.querySelector('#theme-toggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    updateSettingsUI() {
        document.getElementById('display-name').textContent = this.settings.name;
        document.getElementById('settings-name').value = this.settings.name;
        document.getElementById('settings-email').value = this.settings.email || '';
        document.getElementById('settings-currency').value = this.settings.currency;
        document.getElementById('settings-budget').value = this.settings.budget;
        document.getElementById('settings-categories').value = this.settings.categories.join(', ');
        
        document.querySelectorAll('.currency-addon').forEach(el => el.textContent = this.settings.currency);

        this.populateCategorySelects();
    }

    populateCategorySelects() {
        const selects = ['expense-category', 'filter-category'];
        
        selects.forEach(id => {
            const select = document.getElementById(id);
            const isFilter = id === 'filter-category';
            const currentValue = select.value;
            
            select.innerHTML = isFilter ? '<option value="all">All Categories</option>' : '';
            
            this.settings.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            });

            if (currentValue && this.settings.categories.includes(currentValue)) {
                select.value = currentValue;
            }
        });
    }

    formatMoney(amount) {
        return `${this.settings.currency}${parseFloat(amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }

    formatDate(dateStr) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateStr).toLocaleDateString(undefined, options);
    }

    // --- Dashboard Updates ---
    updateDashboard() {
        this.expenses = Storage.getExpenses();
        
        // Calculate current month spending
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        let totalMonthly = 0;
        let lastMonthTotal = 0;
        let categoryTotals = {};

        this.expenses.forEach(exp => {
            const expDate = new Date(exp.date);
            const amt = parseFloat(exp.amount);

            if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
                totalMonthly += amt;
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
            } else if ((currentMonth > 0 && expDate.getMonth() === currentMonth - 1 && expDate.getFullYear() === currentYear) || 
                       (currentMonth === 0 && expDate.getMonth() === 11 && expDate.getFullYear() === currentYear - 1)) {
                lastMonthTotal += amt;
            }
        });

        document.getElementById('total-spending').textContent = this.formatMoney(totalMonthly);

        // Budget tracking
        const budget = parseFloat(this.settings.budget);
        document.getElementById('budget-display').textContent = this.formatMoney(budget);
        
        // Previous Month Savings
        const prevSavingsEl = document.getElementById('prev-month-savings');
        if (prevSavingsEl) {
            const prevSavings = budget > 0 ? budget - lastMonthTotal : 0;
            
            if (prevSavings > 0) {
                prevSavingsEl.textContent = '+' + this.formatMoney(prevSavings);
                prevSavingsEl.style.color = 'var(--success)';
            } else if (prevSavings < 0) {
                prevSavingsEl.textContent = '-' + this.formatMoney(Math.abs(prevSavings));
                prevSavingsEl.style.color = 'var(--danger)';
            } else {
                prevSavingsEl.textContent = this.formatMoney(0);
                prevSavingsEl.style.color = 'var(--text-main)';
            }
        }
        
        const progressEl = document.getElementById('budget-progress');
        const statusEl = document.getElementById('budget-status');
        const budgetCard = document.getElementById('budget-card');
        
        if (budget > 0) {
            const percent = Math.min((totalMonthly / budget) * 100, 100).toFixed(1);
            progressEl.style.width = `${percent}%`;
            statusEl.textContent = `${percent}% used`;
            
            // Remove previous classes
            progressEl.style.backgroundColor = '';
            statusEl.className = 'status-badge';
            
            if (percent >= 100) {
                progressEl.style.backgroundColor = 'var(--danger)';
                statusEl.classList.add('status-danger');
                statusEl.textContent = 'Exceeded!';
            } else if (percent >= 80) {
                progressEl.style.backgroundColor = 'var(--warning)';
                statusEl.classList.add('status-warning');
            } else {
                statusEl.classList.add('status-normal');
            }
        } else {
            progressEl.style.width = '0%';
            statusEl.textContent = 'No budget set';
            statusEl.className = 'status-badge';
        }

        // Top Category
        let topCat = '-';
        let maxAmt = 0;
        for (const [cat, amt] of Object.entries(categoryTotals)) {
            if (amt > maxAmt) {
                maxAmt = amt;
                topCat = cat;
            }
        }
        document.getElementById('top-category').textContent = topCat !== '-' ? topCat : '-';

        this.renderRecentExpenses();
        this.chartManager.updateCharts(this.expenses, this.settings);
    }

    renderRecentExpenses() {
        const list = document.getElementById('recent-expense-list');
        const emptyState = document.getElementById('no-recent-expenses');
        list.innerHTML = '';
        
        const recent = this.expenses.slice(0, 5); // top 5
        
        if (recent.length === 0) {
            list.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        list.classList.remove('hidden');
        emptyState.classList.add('hidden');

        recent.forEach(exp => {
            const li = this.createExpenseListItem(exp);
            list.appendChild(li);
        });
    }

    renderAllExpenses() {
        const list = document.getElementById('all-expense-list');
        const emptyState = document.getElementById('no-all-expenses');
        list.innerHTML = '';

        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const filterCat = document.getElementById('filter-category').value;
        const filterMonth = document.getElementById('filter-month').value; // YYYY-MM

        let filtered = this.expenses.filter(exp => {
            const matchSearch = exp.description.toLowerCase().includes(searchTerm);
            const matchCat = filterCat === 'all' || exp.category === filterCat;
            const matchMonth = !filterMonth || exp.date.startsWith(filterMonth);
            return matchSearch && matchCat && matchMonth;
        });

        if (filtered.length === 0) {
            list.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        list.classList.remove('hidden');
        emptyState.classList.add('hidden');

        filtered.forEach(exp => {
            const li = this.createExpenseListItem(exp);
            list.appendChild(li);
        });
    }

    createExpenseListItem(exp) {
        const li = document.createElement('li');
        li.className = 'expense-item';
        li.innerHTML = `
            <div class="expense-desc">${exp.description}</div>
            <div class="expense-cat">${exp.category}</div>
            <div class="expense-date">${this.formatDate(exp.date)}</div>
            <div class="expense-amount">${this.formatMoney(exp.amount)}</div>
            <div class="item-actions">
                <button class="action-btn edit" onclick="app.editExpense('${exp.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn delete" onclick="app.deleteExpense('${exp.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        return li;
    }

    // --- Modal Logic ---
    openModal(expense = null) {
        const modal = document.getElementById('expense-modal');
        const form = document.getElementById('expense-form');
        const title = document.getElementById('modal-title');
        
        form.reset();
        
        if (expense) {
            title.textContent = 'Edit Expense';
            document.getElementById('expense-id').value = expense.id;
            document.getElementById('expense-amount').value = expense.amount;
            document.getElementById('expense-category').value = expense.category;
            document.getElementById('expense-date').value = expense.date;
            document.getElementById('expense-description').value = expense.description;
        } else {
            title.textContent = 'Add Expense';
            document.getElementById('expense-id').value = '';
            document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
        }
        
        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('expense-modal').classList.add('hidden');
    }

    handleExpenseSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('expense-id').value;
        const amount = document.getElementById('expense-amount').value;
        const category = document.getElementById('expense-category').value;
        const date = document.getElementById('expense-date').value;
        const description = document.getElementById('expense-description').value;

        const expense = { id, amount, category, date, description };

        if (id) {
            Storage.updateExpense(expense);
            this.showToast('Expense updated successfully!', 'success');
        } else {
            Storage.addExpense(expense);
            this.showToast('Expense added successfully!', 'success');
        }

        this.closeModal();
        this.updateDashboard();
        if (this.currentView === 'expenses') this.renderAllExpenses();
        if (this.currentView === 'insights') this.generateInsights();
    }

    editExpense(id) {
        const expense = this.expenses.find(e => e.id === id);
        if (expense) this.openModal(expense);
    }

    deleteExpense(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            Storage.deleteExpense(id);
            this.showToast('Expense deleted.', 'warning');
            this.updateDashboard();
            if (this.currentView === 'expenses') this.renderAllExpenses();
        }
    }

    // --- Settings & Data ---
    handleSettingsSubmit(e) {
        e.preventDefault();
        
        this.settings.name = document.getElementById('settings-name').value;
        this.settings.email = document.getElementById('settings-email').value;
        this.settings.currency = document.getElementById('settings-currency').value;
        this.settings.budget = parseFloat(document.getElementById('settings-budget').value) || 0;
        
        const catInput = document.getElementById('settings-categories').value;
        this.settings.categories = catInput.split(',').map(c => c.trim()).filter(c => c);

        Storage.saveSettings(this.settings);
        this.updateSettingsUI();
        this.updateDashboard();
        this.showToast('Settings saved successfully!', 'success');
    }

    handleWipeData() {
        if (confirm('WARNING: This will permanently delete all your data. Proceed?')) {
            if (confirm('Are you absolutely sure?')) {
                Storage.wipeData();
                location.reload();
            }
        }
    }

    exportData() {
        const uri = Storage.exportToCSV();
        if (!uri) {
            this.showToast('No data to export', 'warning');
            return;
        }
        
        const link = document.createElement("a");
        link.setAttribute("href", uri);
        link.setAttribute("download", `expenses_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Data exported to CSV', 'success');
    }

    // --- Insights Generation ---
    generateInsights() {
        const container = document.getElementById('insights-container');
        container.innerHTML = '';
        
        if (this.expenses.length === 0) {
            container.innerHTML = `<p class="text-muted">Not enough data to generate insights. Add some expenses first!</p>`;
            return;
        }

        const insights = [];
        
        // 1. Budget insight
        const today = new Date();
        const currentMonth = today.getMonth();
        let monthTotal = 0;
        let lastMonthTotal = 0;
        
        const categoryTotals = {};

        this.expenses.forEach(exp => {
            const d = new Date(exp.date);
            const amt = parseFloat(exp.amount);
            
            if (d.getMonth() === currentMonth) {
                monthTotal += amt;
                categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + amt;
            } else if (d.getMonth() === currentMonth - 1 || (currentMonth === 0 && d.getMonth() === 11)) {
                lastMonthTotal += amt;
            }
        });

        // Budget check
        if (this.settings.budget > 0) {
            const ratio = monthTotal / this.settings.budget;
            if (ratio > 1) {
                insights.push({
                    title: 'Budget Exceeded 🚨',
                    desc: `You have exceeded your monthly budget of ${this.formatMoney(this.settings.budget)} by ${this.formatMoney(monthTotal - this.settings.budget)}. Try to minimize non-essential spending.`,
                    type: 'danger'
                });
            } else if (ratio > 0.8) {
                insights.push({
                    title: 'Nearing Budget Limit ⚠️',
                    desc: `You have used ${(ratio * 100).toFixed(0)}% of your monthly budget. Slow down on spending!`,
                    type: 'warning'
                });
            } else {
                insights.push({
                    title: 'On Track! 🎯',
                    desc: `You've only used ${(ratio * 100).toFixed(0)}% of your budget. Keep up the good financial habits!`,
                    type: 'success'
                });
            }
        }

        // 2. Month over Month
        if (lastMonthTotal > 0) {
            const diff = monthTotal - lastMonthTotal;
            const pct = (diff / lastMonthTotal * 100).toFixed(1);
            if (diff > 0) {
                insights.push({
                    title: 'Spending Increased 📈',
                    desc: `Your spending has increased by ${pct}% (${this.formatMoney(Math.abs(diff))}) compared to last month.`,
                    type: 'warning'
                });
            } else {
                insights.push({
                    title: 'Spending Decreased 📉',
                    desc: `Great job! Your spending decreased by ${Math.abs(pct)}% (${this.formatMoney(Math.abs(diff))}) compared to last month.`,
                    type: 'success'
                });
            }
        }

        // 3. Highest category
        let topCat = null;
        let topAmt = 0;
        for (const [cat, amt] of Object.entries(categoryTotals)) {
            if (amt > topAmt) { topAmt = amt; topCat = cat; }
        }

        if (topCat) {
            const pct = ((topAmt / monthTotal) * 100).toFixed(0);
            insights.push({
                title: `Highest Expense: ${topCat} 📊`,
                desc: `${topCat} accounts for ${pct}% of your spending this month (${this.formatMoney(topAmt)}). Review your ${topCat.toLowerCase()} expenses to see where you can cut back.`,
                type: 'info'
            });
        }

        insights.forEach(ins => {
            const div = document.createElement('div');
            div.className = `insight-card ${ins.type === 'info' ? 'warning' : ins.type}`;
            div.innerHTML = `<h4>${ins.title}</h4><p>${ins.desc}</p>`;
            container.appendChild(div);
        });

        this.generateSavingsHistory();
    }

    generateSavingsHistory() {
        const container = document.getElementById('savings-history-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.expenses.length === 0) {
            container.innerHTML = `<p class="text-muted">No expenses recorded yet.</p>`;
            return;
        }

        // Group expenses by YYYY-MM
        const monthlyTotals = {};
        this.expenses.forEach(exp => {
            const dateObj = new Date(exp.date);
            const monthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            const amt = parseFloat(exp.amount);
            
            if (!monthlyTotals[monthStr]) {
                monthlyTotals[monthStr] = 0;
            }
            monthlyTotals[monthStr] += amt;
        });

        // Sort months descending
        const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => b.localeCompare(a));
        const budget = parseFloat(this.settings.budget) || 0;

        const listHTML = sortedMonths.map(month => {
            const totalSpent = monthlyTotals[month];
            const savings = budget > 0 ? budget - totalSpent : 0;
            
            // Format month display (e.g., "Jan 2024")
            const [year, m] = month.split('-');
            const monthName = new Date(year, parseInt(m) - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
            
            let savingsText = this.formatMoney(0);
            let colorClass = '';
            
            if (budget > 0) {
                if (savings > 0) {
                    savingsText = '+' + this.formatMoney(savings);
                    colorClass = 'text-success';
                } else if (savings < 0) {
                    savingsText = '-' + this.formatMoney(Math.abs(savings));
                    colorClass = 'text-danger';
                }
            } else {
                 savingsText = 'No budget set';
                 colorClass = 'text-muted';
            }

            return `
                <div class="expense-item" style="grid-template-columns: 2fr 1fr 1fr;">
                    <div class="expense-desc"><i class="fas fa-calendar-alt mr-2 text-muted"></i>${monthName}</div>
                    <div class="expense-amount">Spent: ${this.formatMoney(totalSpent)}</div>
                    <div class="expense-amount ${colorClass}" style="text-align: right;">Savings: ${savingsText}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = listHTML;
    }

    // --- Toasts ---
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'check-circle';
        if(type === 'danger') icon = 'times-circle';
        if(type === 'warning') icon = 'exclamation-triangle';

        toast.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize App
const app = new App();
