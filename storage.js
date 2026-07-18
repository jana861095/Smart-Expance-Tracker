class Storage {
    // --- Session & Scoping ---
    static getCurrentUser() {
        return sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    }

    static getUserKey(baseKey) {
        const user = this.getCurrentUser();
        return user ? `${baseKey}_${user}` : baseKey;
    }

    // --- Users Management ---
    static getUsers() {
        return JSON.parse(localStorage.getItem('tracker_users') || '{}');
    }

    static saveUsers(users) {
        localStorage.setItem('tracker_users', JSON.stringify(users));
    }

    static hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = (hash * 31) + password.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }

    static registerUser(username, name, email, password) {
        const users = this.getUsers();
        const userKey = username.toLowerCase().trim();
        
        if (!userKey || !name.trim() || !email.trim() || !password) {
            return { success: false, message: 'All fields are required.' };
        }
        
        if (users[userKey]) {
            return { success: false, message: 'Username already exists!' };
        }

        users[userKey] = {
            username: username.trim(),
            name: name.trim(),
            email: email.trim(),
            passwordHash: this.hashPassword(password)
        };
        this.saveUsers(users);

        // Pre-create settings for this user
        const defaultSettings = this.getDefaultSettings();
        defaultSettings.name = name.trim();
        defaultSettings.email = email.trim();
        const settingsKey = `settings_${userKey}`;
        localStorage.setItem(settingsKey, JSON.stringify(defaultSettings));

        return { success: true };
    }

    static authenticateUser(username, password) {
        const users = this.getUsers();
        const userKey = username.toLowerCase().trim();
        const user = users[userKey];

        if (!user || user.passwordHash !== this.hashPassword(password)) {
            return { success: false, message: 'Invalid username or password!' };
        }

        return { success: true, user: user };
    }

    static login(username, rememberMe) {
        const userKey = username.toLowerCase().trim();
        if (rememberMe) {
            localStorage.setItem('currentUser', userKey);
        } else {
            sessionStorage.setItem('currentUser', userKey);
        }
    }

    static logout() {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
    }

    // --- Expenses ---
    static getExpenses() {
        const key = this.getUserKey('expenses');
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    static saveExpenses(expenses) {
        const key = this.getUserKey('expenses');
        localStorage.setItem(key, JSON.stringify(expenses));
    }

    static addExpense(expense) {
        const expenses = this.getExpenses();
        expense.id = Date.now().toString(); // unique ID
        expenses.push(expense);
        // Sort by date descending
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
        this.saveExpenses(expenses);
        return expense;
    }

    static updateExpense(updatedExpense) {
        const expenses = this.getExpenses();
        const index = expenses.findIndex(e => e.id === updatedExpense.id);
        if (index !== -1) {
            expenses[index] = updatedExpense;
            expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.saveExpenses(expenses);
            return true;
        }
        return false;
    }

    static deleteExpense(id) {
        let expenses = this.getExpenses();
        expenses = expenses.filter(e => e.id !== id);
        this.saveExpenses(expenses);
    }

    // --- Settings ---
    static getDefaultSettings() {
        return {
            name: 'User',
            email: '',
            currency: '₹',
            budget: 10000,
            theme: 'dark',
            categories: ['Food', 'Travel', 'Bills', 'Shopping', 'Entertainment', 'Others']
        };
    }

    static getSettings() {
        const key = this.getUserKey('settings');
        const settings = localStorage.getItem(key);
        if (settings) {
            return JSON.parse(settings);
        }
        const defaultSettings = this.getDefaultSettings();
        this.saveSettings(defaultSettings);
        return defaultSettings;
    }

    static saveSettings(settings) {
        const key = this.getUserKey('settings');
        localStorage.setItem(key, JSON.stringify(settings));
    }

    // --- Data Export ---
    static exportToCSV() {
        const expenses = this.getExpenses();
        const settings = this.getSettings();
        
        if (expenses.length === 0) return null;

        // Prepend UTF-8 BOM (\uFEFF) to make Excel parse UTF-8 characters and columns correctly
        let csvContent = "\uFEFF";
        csvContent += `User Name,"${(settings.name || '').replace(/"/g, '""')}"\n`;
        csvContent += `User Email,"${(settings.email || '').replace(/"/g, '""')}"\n\n`;
        csvContent += "Date,Description,Category,Amount (" + settings.currency + ")\n";

        expenses.forEach(row => {
            const date = `"${row.date || ''} "`;
            const desc = `"${(row.description || '').replace(/"/g, '""')}"`;
            const cat = `"${row.category || ''}"`;
            const amount = row.amount || 0;
            csvContent += `${date},${desc},${cat},${amount}\n`;
        });

        return "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    }

    // --- Utilities ---
    static wipeData() {
        const expensesKey = this.getUserKey('expenses');
        const settingsKey = this.getUserKey('settings');
        localStorage.removeItem(expensesKey);
        localStorage.removeItem(settingsKey);
    }
}
