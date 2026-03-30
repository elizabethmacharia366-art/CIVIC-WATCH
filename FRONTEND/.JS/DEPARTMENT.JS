
class DepartmentModule {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api/departments';
    this.currentDepartment = null;
    this.departments = [];
    this.reports = [];
    this.init();
    if (!window.clearAccess) {
      window.clearAccess = (role) => { localStorage.removeItem(`cw_access_${role}`); location.reload(); };
    }
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
  }

  onDOMReady() {
    // Require password before initializing department page
    if (!this.requirePassword('department')) return;

    this.setupEventListeners();
    this.loadDepartments();
    this.setupNavigationMenus();
    this.handleDashboardLoad();
    // Load tasks if we're on the task management page
    if (document.getElementById('tasksList')) {
      this.loadTasks();
    }
  }

  // Require a simple client-side password (3 attempts). Stores approval in localStorage.
  requirePassword(role) {
    try {
      const key = `cw_access_${role}`;
      // support forcing re-auth via URL: add ?reauth=1 to clear stored flag
      try { if (new URLSearchParams(window.location.search).get('reauth') === '1') localStorage.removeItem(key); } catch(e){}
      const stored = localStorage.getItem(key);
      if (stored) return true;

      let attempts = 3;
      while (attempts > 0) {
        const pw = prompt(`Enter password to access ${role} page:`);
        if (pw === null) break; // user cancelled
        if (pw === '106276') {
          localStorage.setItem(key, JSON.stringify({ authorized: true, at: Date.now() }));
          return true;
        }
        attempts -= 1;
        alert(`Incorrect password. ${attempts} attempt(s) left.`);
      }
    } catch (e) {
      console.error('Password check failed', e);
    }
    this.showNotification('Access denied', 'error');
    // If denied, redirect to index
    window.location.href = 'INDEX.HTML';
    return false;
  }

  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.handleDashboardLoad();
    });

    const departmentForm = document.getElementById('departmentForm');
    if (departmentForm) {
      departmentForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
      taskForm.addEventListener('submit', (e) => this.handleTaskFormSubmit(e));
    }

    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => this.openTaskForm());
    }

    const cancelTaskBtn = document.getElementById('cancelTaskForm');
    if (cancelTaskBtn) {
      cancelTaskBtn.addEventListener('click', () => {
        const form = document.getElementById('taskForm');
        if (form) form.style.display = 'none';
      });
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => this.filterTasks());
    }

    const officerFilter = document.getElementById('officerFilter');
    if (officerFilter) {
      officerFilter.addEventListener('change', () => this.filterTasks());
    }

    const taskAssignBtn = document.getElementById('assignTaskBtn');
    if (taskAssignBtn) {
      taskAssignBtn.addEventListener('click', () => this.assignTask());
    }

    const reportFilters = document.querySelectorAll('.reportFilter');
    reportFilters.forEach(filter => {
      filter.addEventListener('change', () => this.filterReports());
    });
  }

  setupNavigationMenus() {
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('href');
        this.navigateTo(page);
      });
    });
  }

  // Load all departments
  async loadDepartments() {
    try {
      const response = await fetch(this.apiBaseUrl);
      if (!response.ok) throw new Error('Failed to load departments');
      
      this.departments = await response.json();
      this.updateDepartmentList();
    } catch (error) {
      console.error('Error loading departments:', error);
      this.showNotification('Failed to load departments', 'error');
    }
  }

  updateDepartmentList() {
    const deptList = document.getElementById('departmentList');
    if (!deptList) return;

    deptList.innerHTML = '';
    this.departments.forEach(dept => {
      const deptItem = document.createElement('div');
      deptItem.className = 'departmentItem';
      deptItem.innerHTML = `
        <h3>${dept.name}</h3>
        <p>${dept.description || 'No description'}</p>
        <p>Head: ${dept.head || 'Unassigned'}</p>
        <button onclick="departmentModule.selectDepartment('${dept.id}')">View Details</button>
      `;
      deptList.appendChild(deptItem);
    });
  }

  selectDepartment(deptId) {
    this.currentDepartment = this.departments.find(d => d.id === deptId);
    if (this.currentDepartment) {
      this.loadDepartmentDetails(deptId);
    }
  }

  async loadDepartmentDetails(deptId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/${deptId}`);
      if (!response.ok) throw new Error('Failed to load department details');
      
      const details = await response.json();
      this.displayDepartmentDetails(details);
    } catch (error) {
      console.error('Error loading department details:', error);
      this.showNotification('Failed to load department details', 'error');
    }
  }
  displayDepartmentDetails(details) {
    const detailsPanel = document.getElementById('departmentDetails');
    if (!detailsPanel) return;

    detailsPanel.innerHTML = `
      <div class="detailsCard">
        <h2>${details.name}</h2>
        <div class="detailsContent">
          <p><strong>Description:</strong> ${details.description || 'N/A'}</p>
          <p><strong>Department Head:</strong> ${details.head || 'Unassigned'}</p>
          <p><strong>Contact:</strong> ${details.contact || 'N/A'}</p>
          <p><strong>Total Staff:</strong> ${details.staffCount || 0}</p>
          <p><strong>Active Reports:</strong> ${details.activeReports || 0}</p>
        </div>
        <div class="actionButtons">
          <button onclick="departmentModule.editDepartment('${details.id}')">Edit</button>
          <button onclick="departmentModule.manageTasks('${details.id}')">Manage Tasks</button>
          <button onclick="departmentModule.viewAnalytics('${details.id}')">View Analytics</button>
        </div>
      </div>
    `;
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const url = data.id 
        ? `${this.apiBaseUrl}/${data.id}`
        : this.apiBaseUrl;
      
      const method = data.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to save department');
      
      this.showNotification('Department saved successfully', 'success');
      this.loadDepartments();
      e.target.reset();
    } catch (error) {
      console.error('Error saving department:', error);
      this.showNotification('Failed to save department', 'error');
    }
  }

  async assignTask() {
    const taskForm = document.getElementById('taskForm');
    if (!taskForm) return;

    const formData = new FormData(taskForm);
    const task = {
      ...Object.fromEntries(formData),
      departmentId: this.currentDepartment?.id,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });

      if (!response.ok) throw new Error('Failed to assign task');
      
      this.showNotification('Task assigned successfully', 'success');
      taskForm.reset();
      this.loadDepartmentDetails(this.currentDepartment.id);
    } catch (error) {
      console.error('Error assigning task:', error);
      this.showNotification('Failed to assign task', 'error');
    }
  }

  async filterReports() {
    const statusFilter = document.getElementById('statusFilter')?.value;
    const priorityFilter = document.getElementById('priorityFilter')?.value;

    try {
      let url = `http://localhost:3000/api/reports?departmentId=${this.currentDepartment?.id}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (priorityFilter) url += `&priority=${priorityFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to filter reports');
      
      this.reports = await response.json();
      this.displayReports();
    } catch (error) {
      console.error('Error filtering reports:', error);
      this.showNotification('Failed to filter reports', 'error');
    }
  }

  displayReports() {
    const reportsContainer = document.getElementById('reportsList');
    if (!reportsContainer) return;

    reportsContainer.innerHTML = '';
    this.reports.forEach(report => {
      const reportCard = document.createElement('div');
      reportCard.className = `reportCard priority-${report.priority}`;
      reportCard.innerHTML = `
        <h4>${report.title}</h4>
        <p><strong>Status:</strong> ${report.status}</p>
        <p><strong>Priority:</strong> ${report.priority}</p>
        <p><strong>Submitted:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
        <button onclick="departmentModule.viewReport('${report.id}')">View Details</button>
      `;
      reportsContainer.appendChild(reportCard);
    });
  }

  async viewReport(reportId) {
    try {
      const response = await fetch(`http://localhost:3000/api/reports/${reportId}`);
      if (!response.ok) throw new Error('Failed to load report');
      
      const report = await response.json();
      this.displayReportModal(report);
    } catch (error) {
      console.error('Error loading report:', error);
      this.showNotification('Failed to load report', 'error');
    }
  }

  displayReportModal(report) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent">
        <span class="closeBtn" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <h2>${report.title}</h2>
        <p><strong>Description:</strong> ${report.description}</p>
        <p><strong>Status:</strong> ${report.status}</p>
        <p><strong>Priority:</strong> ${report.priority}</p>
        <p><strong>Location:</strong> ${report.location}</p>
        <p><strong>Submitted By:</strong> ${report.submittedBy}</p>
        <p><strong>Date:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
        ${report.attachments ? `<p><strong>Attachments:</strong> ${report.attachments.length} file(s)</p>` : ''}
      </div>
    `;
    document.body.appendChild(modal);
  }

  editDepartment(deptId) {
    const dept = this.departments.find(d => d.id === deptId);
    if (!dept) return;

    const form = document.getElementById('departmentForm');
    if (form) {
      form.querySelector('[name="id"]').value = dept.id;
      form.querySelector('[name="name"]').value = dept.name;
      form.querySelector('[name="description"]').value = dept.description;
      form.querySelector('[name="head"]').value = dept.head;
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  manageTasks(deptId) {
    this.navigateTo('TASKMANAGEMENT.HTML');
  }

  viewAnalytics(deptId) {
    this.navigateTo('ANALYTICS.HTML');
  }

  handleDashboardLoad() {
    const dashboardStats = document.getElementById('dashboardStats');
    if (dashboardStats) {
      this.updateDashboardStats();
    }
  }

  async updateDashboardStats() {
    try {
      const response = await fetch(`http://localhost:3000/api/statistics/department`);
      if (!response.ok) throw new Error('Failed to load stats');
      
      const stats = await response.json();
      const statsContainer = document.getElementById('dashboardStats');
      
      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="statCard">
            <h3>Total Reports</h3>
            <p class="statValue">${stats.totalReports || 0}</p>
          </div>
          <div class="statCard">
            <h3>Pending Tasks</h3>
            <p class="statValue">${stats.pendingTasks || 0}</p>
          </div>
          <div class="statCard">
            <h3>Active Issues</h3>
            <p class="statValue">${stats.activeIssues || 0}</p>
          </div>
          <div class="statCard">
            <h3>Completion Rate</h3>
            <p class="statValue">${stats.completionRate || 0}%</p>
          </div>
        `;
        // Render charts if there is chart data
        if (stats.reportByStatus || stats.reportByPriority) {
          await this.loadChartJS();
          this.drawDepartmentCharts(stats);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  // Dynamically load Chart.js from CDN if not already present
  loadChartJS() {
    if (window.Chart) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  // Draw simple charts for the department dashboard
  drawDepartmentCharts(stats) {
    const statsContainer = document.getElementById('dashboardStats');
    if (!statsContainer) return;

    // Insert canvas containers (remove existing if any)
    let statusCanvas = document.getElementById('deptStatusChart');
    if (!statusCanvas) {
      const wrapper = document.createElement('div');
      wrapper.className = 'chartCard';
      wrapper.innerHTML = '<h4>Reports by Status</h4><canvas id="deptStatusChart" width="400" height="200"></canvas>';
      statsContainer.appendChild(wrapper);
      statusCanvas = document.getElementById('deptStatusChart');
    }

    let priorityCanvas = document.getElementById('deptPriorityChart');
    if (!priorityCanvas) {
      const wrapper = document.createElement('div');
      wrapper.className = 'chartCard';
      wrapper.innerHTML = '<h4>Reports by Priority</h4><canvas id="deptPriorityChart" width="400" height="200"></canvas>';
      statsContainer.appendChild(wrapper);
      priorityCanvas = document.getElementById('deptPriorityChart');
    }

    try {
      if (stats.reportByStatus) {
        const labels = Object.keys(stats.reportByStatus);
        const values = Object.values(stats.reportByStatus);
        new Chart(statusCanvas.getContext('2d'), {
          type: 'doughnut',
          data: { labels, datasets: [{ data: values, backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#2196f3'] }] },
        });
      }

      if (stats.reportByPriority) {
        const labels = Object.keys(stats.reportByPriority);
        const values = Object.values(stats.reportByPriority);
        new Chart(priorityCanvas.getContext('2d'), {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Count', data: values, backgroundColor: '#2196f3' }] },
        });
      }
    } catch (e) {
      console.warn('Chart rendering failed', e);
    }
  }

  navigateTo(page) {
    window.location.href = page;
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('cw_access_admin');
    localStorage.removeItem('cw_access_department');
    window.location.href = 'LOGOUT.HTML';
  }

  // Task Management Functions
  async getTasks(filters = {}) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }

      let tasks = await response.json();

      // Apply filters
      if (filters.status) {
        tasks = tasks.filter(t => t.status === filters.status);
      }
      if (filters.priority) {
        tasks = tasks.filter(t => t.priority === filters.priority);
      }
      if (filters.assignedTo) {
        tasks = tasks.filter(t => t.assignedTo === filters.assignedTo);
      }

      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      this.showNotification('Failed to load tasks', 'error');
      return [];
    }
  }

  async createTask(taskData) {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority || 'medium',
          status: taskData.status || 'pending',
          dueDate: taskData.dueDate,
          assignedTo: taskData.assignedTo,
          departmentId: this.currentDepartment?.id
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create task: ${response.statusText}`);
      }

      const newTask = await response.json();
      this.showNotification('Task created successfully', 'success');
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      this.showNotification('Failed to create task', 'error');
      return null;
    }
  }

  async updateTask(taskId, updateData) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const updatedTask = await response.json();
      this.showNotification('Task updated successfully', 'success');
      return updatedTask;
    } catch (error) {
      console.error('Error updating task:', error);
      this.showNotification('Failed to update task', 'error');
      return null;
    }
  }

  async deleteTask(taskId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }

      this.showNotification('Task deleted successfully', 'success');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      this.showNotification('Failed to delete task', 'error');
      return false;
    }
  }

  async getTaskStats() {
    try {
      const response = await fetch(`/api/tasks/stats?departmentId=${this.currentDepartment?.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch task stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching task stats:', error);
      return {};
    }
  }

  async assignTask(taskId, userId) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignedTo: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to assign task: ${response.statusText}`);
      }

      const updatedTask = await response.json();
      this.showNotification('Task assigned successfully', 'success');
      return updatedTask;
    } catch (error) {
      console.error('Error assigning task:', error);
      this.showNotification('Failed to assign task', 'error');
      return null;
    }
  }

  renderTaskList(tasks, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (tasks.length === 0) {
      container.innerHTML = '<p class="empty-state">No tasks found</p>';
      return;
    }

    const taskTable = document.createElement('table');
    taskTable.className = 'task-table';
    taskTable.innerHTML = `
      <thead>
        <tr>
          <th>Title</th>
          <th>Priority</th>
          <th>Status</th>
          <th>Due Date</th>
          <th>Assigned To</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${tasks.map(task => `
          <tr>
            <td>${task.title}</td>
            <td><span class="priority-badge ${task.priority}">${task.priority}</span></td>
            <td><span class="status-badge ${task.status}">${task.status}</span></td>
            <td>${new Date(task.dueDate).toLocaleDateString()}</td>
            <td>${task.assignedTo?.name || 'Unassigned'}</td>
            <td>
              <button class="btn-small" onclick="departmentModule.editTask('${task.id}')">Edit</button>
              <button class="btn-small btn-danger" onclick="departmentModule.deleteTask('${task.id}')">Delete</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;

    container.appendChild(taskTable);
  }

  editTask(taskId) {
    // Open task editing modal/form
    console.log('Editing task:', taskId);
    // Implementation depends on your modal/form system
  }
}

const departmentModule = new DepartmentModule();
