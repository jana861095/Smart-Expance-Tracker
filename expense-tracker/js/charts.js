class ChartManager {
    constructor() {
        this.pieChart = null;
        this.barChart = null;
        
        // Premium color palette for categories
        this.colors = [
            '#6366f1', // Indigo
            '#10b981', // Emerald
            '#f59e0b', // Amber
            '#ef4444', // Red
            '#8b5cf6', // Violet
            '#06b6d4', // Cyan
            '#ec4899', // Pink
            '#f97316'  // Orange
        ];
    }

    updateCharts(expenses, settings) {
        this._updatePieChart(expenses);
        this._updateBarChart(expenses, settings);
    }

    _updatePieChart(expenses) {
        const ctx = document.getElementById('pieChart').getContext('2d');
        
        // Aggregate by category
        const categoryData = {};
        expenses.forEach(exp => {
            categoryData[exp.category] = (categoryData[exp.category] || 0) + parseFloat(exp.amount);
        });

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        if (this.pieChart) {
            this.pieChart.destroy();
        }

        if (data.length === 0) {
            return; // Don't render empty chart
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#1f2937';

        this.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: this.colors.slice(0, labels.length),
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: textColor, font: { family: 'Outfit' } }
                    }
                },
                cutout: '70%'
            }
        });
    }

    _updateBarChart(expenses, settings) {
        const ctx = document.getElementById('barChart').getContext('2d');
        
        // Aggregate by last 6 months
        const monthsData = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // Initialize last 6 months with 0
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substr(-2)}`;
            monthsData[key] = 0;
        }

        expenses.forEach(exp => {
            const expDate = new Date(exp.date);
            const key = `${monthNames[expDate.getMonth()]} ${expDate.getFullYear().toString().substr(-2)}`;
            if (monthsData[key] !== undefined) {
                monthsData[key] += parseFloat(exp.amount);
            }
        });

        const labels = Object.keys(monthsData);
        const data = Object.values(monthsData);

        if (this.barChart) {
            this.barChart.destroy();
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#f8fafc' : '#1f2937';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Spending (${settings.currency})`,
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderRadius: 6,
                    hoverBackgroundColor: '#818cf8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: 'Outfit' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    updateTheme() {
        // Redraw charts to update text colors on theme switch
        const expenses = Storage.getExpenses();
        const settings = Storage.getSettings();
        if(expenses.length > 0) {
            this.updateCharts(expenses, settings);
        }
    }
}
