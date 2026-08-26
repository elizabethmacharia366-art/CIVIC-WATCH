
class AdminModule {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api/admin';
    this.currentUser = null;
    this.users = [];
    this.submissions = [];
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
    if (!this.requirePassword('admin')) return;

    this.setupEventListeners();
    this.loadCurrentUser();
    this.setupNavigationMenus();
    this.handleAdminDashboardLoad();
    // Load users/submissions for pages that include those lists
    if (document.getElementById('usersList')) {
      this.loadUsers();
    }
    if (document.getElementById('submissionsList')) {
      this.loadSubmissions();
    }
  }

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
        if (pw === null) break; 
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
    window.location.href = '/';
    return false;
  }

  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.handleAdminDashboardLoad();
    });

    const userForm = document.getElementById('userForm');
    if (userForm) {
      userForm.addEventListener('submit', (e) => this.handleUserFormSubmit(e));
    }

    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
      addUserBtn.addEventListener('click', () => this.openUserForm());
    }

    const cancelBtn = document.getElementById('cancelUserForm');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const form = document.getElementById('userForm');
        if (form) form.style.display = 'none';
      });
    }

    const submissionFilters = document.querySelectorAll('.submissionFilter');
    submissionFilters.forEach(filter => {
      filter.addEventListener('change', () => this.filterSubmissions());
    });

    const contentForm = document.getElementById('contentForm');
    if (contentForm) {
      contentForm.addEventListener('submit', (e) => this.handleContentFormSubmit(e));
    }
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

  async loadCurrentUser() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        this.redirectToLogin();
        return;
      }

      const response = await fetch(`${this.apiBaseUrl}/current-user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load user');
      
      this.currentUser = await response.json();
      this.updateUserDisplay();
    } catch (error) {
      console.error('Error loading current user:', error);
      this.redirectToLogin();
    }
  }

  updateUserDisplay() {
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay && this.currentUser) {
      userDisplay.innerHTML = `
        <span>${this.currentUser.name}</span>
        <span class="role">${this.currentUser.role}</span>
      `;
    }
  }

  async handleAdminDashboardLoad() {
    const dashboardContainer = document.getElementById('adminDashboard');
    if (dashboardContainer) {
      await this.loadDashboardData();
    }
  }

  async loadDashboardData() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard`);
      if (!response.ok) throw new Error('Failed to load dashboard');
      
      const data = await response.json();
      this.displayDashboard(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.showNotification('Failed to load dashboard', 'error');
    }
  }

  displayDashboard(data) {
    const dashboard = document.getElementById('adminDashboard');
    if (!dashboard) return;

    dashboard.innerHTML = `
      <div class="dashboardGrid">
        <div class="statCard">
          <h3>Total Users</h3>
          <p class="statValue">${data.totalUsers || 0}</p>
        </div>
        <div class="statCard">
          <h3>Active Submissions</h3>
          <p class="statValue">${data.activeSubmissions || 0}</p>
        </div>
        <div class="statCard">
          <h3>Departments</h3>
          <p class="statValue">${data.departmentCount || 0}</p>
        </div>
        <div class="statCard">
          <h3>Pending Reviews</h3>
          <p class="statValue">${data.pendingReviews || 0}</p>
        </div>
        <div class="statCard">
          <h3>System Health</h3>
          <p class="statValue">${data.systemHealth || 'Good'}</p>
        </div>
        <div class="statCard">
          <h3>User Growth</h3>
          <p class="statValue">${data.userGrowth || '+0%'}</p>
        </div>
      </div>
    `;
    // Render charts if the backend provided series data
    (async () => {
      try {
        if (data.userGrowthSeries || data.submissionsByDept || data.submissionsByStatus) {
          await this.loadChartJS();
          this.drawAdminCharts(data);
        }
      } catch (e) {
        console.warn('Admin charts skipped', e);
      }
    })();
  }

  // Load Chart.js dynamically
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

  // Draw admin charts (user growth, submissions by dept/status)
  drawAdminCharts(data) {
    const dashboard = document.getElementById('adminDashboard');
    if (!dashboard) return;

    // User growth line chart
    if (data.userGrowthSeries && Array.isArray(data.userGrowthSeries.labels)) {
      let canvas = document.getElementById('adminUserGrowthChart');
      if (!canvas) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chartCard';
        wrapper.innerHTML = '<h4>User Growth</h4><canvas id="adminUserGrowthChart" width="600" height="250"></canvas>';
        dashboard.appendChild(wrapper);
        canvas = document.getElementById('adminUserGrowthChart');
      }
      try {
        new Chart(canvas.getContext('2d'), {
          type: 'line',
          data: { labels: data.userGrowthSeries.labels, datasets: [{ label: 'Users', data: data.userGrowthSeries.values, borderColor: '#4caf50', fill: false }] }
        });
      } catch (e) { console.warn(e); }
    }

    // Submissions by department (pie)
    if (data.submissionsByDept) {
      let canvas = document.getElementById('adminSubByDeptChart');
      if (!canvas) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chartCard';
        wrapper.innerHTML = '<h4>Submissions by Department</h4><canvas id="adminSubByDeptChart" width="400" height="200"></canvas>';
        dashboard.appendChild(wrapper);
        canvas = document.getElementById('adminSubByDeptChart');
      }
      try {
        const labels = Object.keys(data.submissionsByDept);
        const values = Object.values(data.submissionsByDept);
        new Chart(canvas.getContext('2d'), { type: 'pie', data: { labels, datasets: [{ data: values, backgroundColor: ['#2196f3', '#ff9800', '#4caf50', '#f44336'] }] } });
      } catch (e) { console.warn(e); }
    }

    // Submissions by status (bar)
    if (data.submissionsByStatus) {
      let canvas = document.getElementById('adminSubByStatusChart');
      if (!canvas) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chartCard';
        wrapper.innerHTML = '<h4>Submissions by Status</h4><canvas id="adminSubByStatusChart" width="400" height="200"></canvas>';
        dashboard.appendChild(wrapper);
        canvas = document.getElementById('adminSubByStatusChart');
      }
      try {
        const labels = Object.keys(data.submissionsByStatus);
        const values = Object.values(data.submissionsByStatus);
        new Chart(canvas.getContext('2d'), { type: 'bar', data: { labels, datasets: [{ label: 'Count', data: values, backgroundColor: '#673ab7' }] } });
      } catch (e) { console.warn(e); }
    }
  }

  async loadUsers() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users`);
      if (!response.ok) throw new Error('Failed to load users');
      
      this.users = await response.json();
      this.displayUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      this.showNotification('Failed to load users', 'error');
    }
  }

  displayUsers() {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    usersList.innerHTML = '';
    this.users.forEach(user => {
      const userRow = document.createElement('tr');
      userRow.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.status}</td>
        <td>${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</td>
        <td>
          <button class="btn btn-edit" onclick="adminModule.editUser('${user.id}')">Edit</button>
          <button class="btn btn-suspend" onclick="adminModule.suspendUser('${user.id}')">${user.status === 'suspended' ? 'Activate' : 'Suspend'}</button>
          <button class="btn btn-delete" onclick="adminModule.deleteUser('${user.id}')">Delete</button>
        </td>
      `;
      usersList.appendChild(userRow);
    });
  }

  openUserForm() {
    const form = document.getElementById('userForm');
    if (form) {
      form.reset();
      form.querySelector('[name="id"]').value = '';
      form.style.display = 'block';
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async handleUserFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData);

    try {
      const url = userData.id 
        ? `${this.apiBaseUrl}/users/${userData.id}`
        : `${this.apiBaseUrl}/users`;
      
      const method = userData.id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Failed to save user');
      
      this.showNotification('User saved successfully', 'success');
      this.loadUsers();
      e.target.reset();
      const form = document.getElementById('userForm');
      if (form) form.style.display = 'none';
    } catch (error) {
      console.error('Error saving user:', error);
      this.showNotification('Failed to save user', 'error');
    }
  }

  async editUser(userId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${userId}`);
      if (!response.ok) throw new Error('Failed to load user');
      
      const user = await response.json();
      const form = document.getElementById('userForm');
      if (form) {
        form.querySelector('[name="id"]').value = user.id;
        form.querySelector('[name="name"]').value = user.name;
        form.querySelector('[name="email"]').value = user.email;
        form.querySelector('[name="role"]').value = user.role;
        form.querySelector('[name="status"]').value = user.status;
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      this.showNotification('Failed to load user', 'error');
    }
  }

  async deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete user');
      
      this.showNotification('User deleted successfully', 'success');
      this.loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      this.showNotification('Failed to delete user', 'error');
    }
  }

  async suspendUser(userId) {
    if (!confirm('Toggle suspension for this user?')) return;

    try {
      // Try an explicit suspend endpoint first
      let response = await fetch(`${this.apiBaseUrl}/users/${userId}/suspend`, { method: 'PATCH' });

      if (response.ok) {
        this.showNotification('User suspension toggled', 'success');
        this.loadUsers();
        return;
      }

      // Fallback: toggle status via user PUT
      const user = this.users.find(u => u.id === userId);
      if (!user) throw new Error('User not found');
      const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
      response = await fetch(`${this.apiBaseUrl}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update user status');

      this.showNotification('User status updated', 'success');
      this.loadUsers();
    } catch (error) {
      console.error('Error suspending user:', error);
      // Local fallback
      const idx = this.users.findIndex(u => u.id === userId);
      if (idx >= 0) {
        this.users[idx].status = this.users[idx].status === 'suspended' ? 'active' : 'suspended';
        this.displayUsers();
        this.showNotification('User status updated (local)', 'info');
      } else {
        this.showNotification('Failed to suspend user', 'error');
      }
    }
  }

  async loadSubmissions() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/submissions`);
      if (!response.ok) throw new Error('Failed to load submissions');
      
      this.submissions = await response.json();
      this.displaySubmissions();
    } catch (error) {
      console.error('Error loading submissions:', error);
      this.showNotification('Failed to load submissions', 'error');
    }
  }

  displaySubmissions() {
    const submissionsList = document.getElementById('submissionsList');
    if (!submissionsList) return;

    submissionsList.innerHTML = '';
    this.submissions.forEach(submission => {
      const submissionCard = document.createElement('div');
      submissionCard.className = 'submissionCard';
      submissionCard.innerHTML = `
        <h4>${submission.title}</h4>
        <p><strong>Submitter:</strong> ${submission.submitterName}</p>
        <p><strong>Status:</strong> ${submission.status}</p>
        <p><strong>Date:</strong> ${new Date(submission.createdAt).toLocaleDateString()}</p>
        <button onclick="adminModule.reviewSubmission('${submission.id}')">Review</button>
      `;
      submissionsList.appendChild(submissionCard);
    });
  }

  async filterSubmissions() {
    const statusFilter = document.getElementById('submissionStatus')?.value;
    const dateFilter = document.getElementById('submissionDate')?.value;

    try {
      let url = `${this.apiBaseUrl}/submissions?`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (dateFilter) url += `date=${dateFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to filter submissions');
      
      this.submissions = await response.json();
      this.displaySubmissions();
    } catch (error) {
      console.error('Error filtering submissions:', error);
      this.showNotification('Failed to filter submissions', 'error');
    }
  }

  async reviewSubmission(submissionId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/submissions/${submissionId}`);
      if (!response.ok) throw new Error('Failed to load submission');
      
      const submission = await response.json();
      this.displayReviewModal(submission);
    } catch (error) {
      console.error('Error loading submission:', error);
      this.showNotification('Failed to load submission', 'error');
    }
  }

  displayReviewModal(submission) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent">
        <span class="closeBtn" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <h2>Review Submission</h2>
        <div class="submissionDetails">
          <p><strong>Title:</strong> ${submission.title}</p>
          <p><strong>Submitter:</strong> ${submission.submitterName}</p>
          <p><strong>Email:</strong> ${submission.submitterEmail}</p>
          <p><strong>Description:</strong> ${submission.description}</p>
          <p><strong>Status:</strong> ${submission.status}</p>
        </div>
        <div class="reviewActions">
          <textarea id="reviewComments" placeholder="Add review comments..."></textarea>
          <div class="actionButtons">
            <button onclick="adminModule.approveSubmission('${submission.id}')">Approve</button>
            <button onclick="adminModule.rejectSubmission('${submission.id}')">Reject</button>
            <button onclick="adminModule.assignSubmission('${submission.id}')">Assign</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async approveSubmission(submissionId) {
    const comments = document.getElementById('reviewComments')?.value || '';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/submissions/${submissionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', comments })
      });

      if (!response.ok) throw new Error('Failed to approve submission');
      
      this.showNotification('Submission approved', 'success');
      document.querySelector('.modal').remove();
      this.loadSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      this.showNotification('Failed to approve submission', 'error');
    }
  }

  async rejectSubmission(submissionId) {
    const comments = document.getElementById('reviewComments')?.value || '';
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/submissions/${submissionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', comments })
      });

      if (!response.ok) throw new Error('Failed to reject submission');
      
      this.showNotification('Submission rejected', 'success');
      document.querySelector('.modal').remove();
      this.loadSubmissions();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      this.showNotification('Failed to reject submission', 'error');
    }
  }

  async assignSubmission(submissionId) {
    const modal = document.querySelector('.modal');
    const assigneeSelect = modal.querySelector('[name="assignee"]');
    
    if (!assigneeSelect) {
      const input = document.createElement('input');
      input.name = 'assignee';
      input.placeholder = 'Enter assignee ID';
      modal.querySelector('.actionButtons').parentElement.insertBefore(input, modal.querySelector('.actionButtons'));
      return;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/submissions/${submissionId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: assigneeSelect.value })
      });

      if (!response.ok) throw new Error('Failed to assign submission');
      
      this.showNotification('Submission assigned', 'success');
      modal.remove();
      this.loadSubmissions();
    } catch (error) {
      console.error('Error assigning submission:', error);
      this.showNotification('Failed to assign submission', 'error');
    }
  }

  async handleContentFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const contentData = Object.fromEntries(formData);

    try {
      const response = await fetch(`${this.apiBaseUrl}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentData)
      });

      if (!response.ok) throw new Error('Failed to save content');
      
      this.showNotification('Content saved successfully', 'success');
      e.target.reset();
    } catch (error) {
      console.error('Error saving content:', error);
      this.showNotification('Failed to save content', 'error');
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

  redirectToLogin() {
    // The Admin dashboard has no dedicated login page. Redirecting to
    // INDEX.HTML reloads this same page forever when a session is missing.
    window.location.href = '/';
  }

  logout() {
    // Remove auth token and any page access flags
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
          departmentId: taskData.departmentId
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
      const response = await fetch('/api/tasks/stats', {
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

  async changeTaskStatus(taskId, newStatus) {
    try {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error(`Failed to change task status: ${response.statusText}`);
      }

      const updatedTask = await response.json();
      this.showNotification('Task status updated successfully', 'success');
      return updatedTask;
    } catch (error) {
      console.error('Error changing task status:', error);
      this.showNotification('Failed to change task status', 'error');
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
          <th>Department</th>
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
            <td>${task.departmentId?.name || 'All Departments'}</td>
            <td>${task.assignedTo?.name || 'Unassigned'}</td>
            <td>
              <button class="btn-small" onclick="adminModule.editTask('${task.id}')">Edit</button>
              <button class="btn-small" onclick="adminModule.deleteTask('${task.id}')">Delete</button>
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

const adminModule = new AdminModule();
