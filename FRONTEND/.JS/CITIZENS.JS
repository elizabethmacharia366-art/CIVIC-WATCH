
class CitizenModule {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api/citizens';
    this.currentUser = null;
    this.userReports = [];
    this.notifications = [];
    this.feedbackList = [];
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    } else {
      this.onDOMReady();
    }
  }

  onDOMReady() {
    // Ensure user is authenticated before allowing access to citizen pages
    if (!this.isAuthenticated()) {
      window.location.replace('/login.html?role=citizen');
      return;
    }

    this.setupEventListeners();
    this.loadCurrentUser();
    this.setupNavigationMenus();
    this.handleDashboardLoad();
  }

  // Check whether user is authenticated (token present)
  isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  // Show registration / login modal
  showAuthModal() {
    // Avoid duplicate modals
    if (document.getElementById('citizenAuthModal')) return;

    const modal = document.createElement('div');
    modal.id = 'citizenAuthModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent authModal">
        <h2>Citizen Access</h2>
        <div class="authTabs">
          <button id="authTabLogin">Login</button>
          <button id="authTabRegister">Register</button>
        </div>
        <div id="authForms">
          <form id="loginForm" class="authForm">
            <div><label>Email</label><input name="email" type="email" required></div>
            <div><label>Password</label><input name="password" type="password" required></div>
            <div><button type="submit">Login</button></div>
          </form>
          <form id="registerForm" class="authForm" style="display:none;">
            <div><label>Name</label><input name="name" type="text" required></div>
            <div><label>Email</label><input name="email" type="email" required></div>
            <div><label>Password</label><input name="password" type="password" required></div>
            <div><button type="submit">Create Account</button></div>
          </form>
        </div>
        <div><button id="authClose">Cancel</button></div>
      </div>
    `;

    document.body.appendChild(modal);

    // Tab handlers
    document.getElementById('authTabLogin').addEventListener('click', () => {
      document.getElementById('loginForm').style.display = '';
      document.getElementById('registerForm').style.display = 'none';
    });
    document.getElementById('authTabRegister').addEventListener('click', () => {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = '';
    });

    document.getElementById('authClose').addEventListener('click', () => {
      modal.remove();
      // redirect away if user cancels
      window.location.href = 'INDEX.HTML';
    });

    // Form handlers
    document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
    document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
  }

  // Handle registration: try backend, fallback to localStorage mock
  async handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch(`${this.apiBaseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const body = await res.json();
        // backend should return token and user
        this.saveAuth(body.token || body.authToken || 'token', body.user || body);
        document.getElementById('citizenAuthModal')?.remove();
        this.onDOMReady();
        return;
      }
    } catch (err) {
      console.warn('Register backend failed, falling back to local mock', err);
    }

    // Fallback: store user locally
    const localUsers = JSON.parse(localStorage.getItem('local_citizens') || '{}');
    const id = 'local_' + Date.now();
    const user = { id, name: data.name, email: data.email };
    localUsers[data.email] = { ...user, password: data.password };
    localStorage.setItem('local_citizens', JSON.stringify(localUsers));
    this.saveAuth('local-token-' + id, user);
    document.getElementById('citizenAuthModal')?.remove();
    this.onDOMReady();
  }

  // Handle login: try backend, fallback to localStorage mock
  async handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch(`${this.apiBaseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const body = await res.json();
        this.saveAuth(body.token || body.authToken || 'token', body.user || body);
        document.getElementById('citizenAuthModal')?.remove();
        this.onDOMReady();
        return;
      }
    } catch (err) {
      console.warn('Login backend failed, falling back to local mock', err);
    }

    // Fallback: verify against local_citizens
    const localUsers = JSON.parse(localStorage.getItem('local_citizens') || '{}');
    const entry = localUsers[data.email];
    if (entry && entry.password === data.password) {
      const user = { id: entry.id || ('local_' + Date.now()), name: entry.name, email: entry.email };
      this.saveAuth('local-token-' + (entry.id || Date.now()), user);
      document.getElementById('citizenAuthModal')?.remove();
      this.onDOMReady();
      return;
    }

    alert('Login failed. Please check credentials or register.');
  }

  // Save auth token and user to localStorage
  saveAuth(token, user) {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUser = user;
      // ensure page is visible after auth
      try { this.unlockPageAfterAuth(); } catch(e){}
    } catch (e) {
      console.error('Failed to persist auth', e);
    }
  }

  setupEventListeners() {
    document.addEventListener('DOMContentLoaded', () => {
      this.handleDashboardLoad();
    });

    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
    }

    const fileInput = document.getElementById('attachmentInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    const reportFilters = document.querySelectorAll('.reportFilter');
    reportFilters.forEach(filter => {
      filter.addEventListener('change', () => this.filterReports());
    });

    const mapBtn = document.getElementById('mapViewBtn');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => this.showMapView());
    }

    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
      feedbackForm.addEventListener('submit', (e) => this.handleFeedbackSubmit(e));
    }

    const notificationSettings = document.getElementById('notificationSettings');
    if (notificationSettings) {
      notificationSettings.addEventListener('change', () => this.updateNotificationSettings());
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
        // No token: show auth modal to register/login
        this.openAuthModal();
        return;
      }

      const response = await fetch(`${this.apiBaseUrl}/current-user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load user');

      this.currentUser = await response.json();
      // persist current user
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      this.updateUserProfile();
      this.loadUserReports();
      this.loadNotifications();
    } catch (error) {
      console.error('Error loading current user:', error);
      // Fallback: if backend fails but we have a local user saved, use it
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
        this.updateUserProfile();
        this.loadUserReports();
        this.loadNotifications();
        return;
      }
      this.openAuthModal();
    }
  }

  // --- Authentication UI & logic ---
  openAuthModal() {
    // If already shown, don't duplicate
    if (document.getElementById('cwAuthModal')) return;
    const modal = document.createElement('div');
    modal.id = 'cwAuthModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent">
        <span class="closeBtn" onclick="document.getElementById('cwAuthModal')?.remove()">&times;</span>
        <h2>Citizen Access</h2>
        <div id="authForms">
          <div id="loginFormWrapper">
            <h3>Login</h3>
            <form id="cwLoginForm">
              <div class="formGroup"><label>Email</label><input type="email" name="email" required></div>
              <div class="formGroup"><label>Password</label><input type="password" name="password" required></div>
              <button type="submit">Login</button>
            </form>
            <p>Don't have an account? <a href="#" id="showRegisterLink">Register</a></p>
          </div>
          <div id="registerFormWrapper" style="display:none;">
            <h3>Register</h3>
            <form id="cwRegisterForm">
              <div class="formGroup"><label>Name</label><input type="text" name="name" required></div>
              <div class="formGroup"><label>Email</label><input type="email" name="email" required></div>
              <div class="formGroup"><label>Password</label><input type="password" name="password" required></div>
              <button type="submit">Create Account</button>
            </form>
            <p>Have an account? <a href="#" id="showLoginLink">Login</a></p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // wire up events
    document.getElementById('cwLoginForm').addEventListener('submit', (e) => this.handleLoginSubmit(e));
    document.getElementById('cwRegisterForm').addEventListener('submit', (e) => this.handleRegisterSubmit(e));
    document.getElementById('showRegisterLink').addEventListener('click', (e) => { e.preventDefault(); this.toggleAuthForms(true); });
    document.getElementById('showLoginLink').addEventListener('click', (e) => { e.preventDefault(); this.toggleAuthForms(false); });
  }

  toggleAuthForms(showRegister = true) {
    const reg = document.getElementById('registerFormWrapper');
    const log = document.getElementById('loginFormWrapper');
    if (!reg || !log) return;
    reg.style.display = showRegister ? 'block' : 'none';
    log.style.display = showRegister ? 'none' : 'block';
  }

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));

    // Try backend registration first
    try {
      const resp = await fetch(`${this.apiBaseUrl}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (resp.ok) {
        const result = await resp.json();
        this.saveAuth(result.token, result.user);
        document.getElementById('cwAuthModal')?.remove();
        this.showNotification('Registration successful', 'success');
        return;
      }
      throw new Error('Backend registration failed');
    } catch (err) {
      // Fallback: save locally
      const users = JSON.parse(localStorage.getItem('cw_local_users') || '[]');
      if (users.find(u => u.email === data.email)) {
        this.showNotification('Email already registered locally', 'error');
        return;
      }
      const id = 'local-' + Date.now();
      const user = { id, name: data.name, email: data.email };
      users.push({ ...user, password: data.password });
      localStorage.setItem('cw_local_users', JSON.stringify(users));
      const token = 'local-token-' + id;
      this.saveAuth(token, user);
      document.getElementById('cwAuthModal')?.remove();
      this.showNotification('Account created (local). You are logged in.', 'success');
    }
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));

    try {
      const resp = await fetch(`${this.apiBaseUrl}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      if (resp.ok) {
        const result = await resp.json();
        this.saveAuth(result.token, result.user);
        document.getElementById('cwAuthModal')?.remove();
        this.showNotification('Logged in', 'success');
        return;
      }
      throw new Error('Backend login failed');
    } catch (err) {
      // Fallback: check local users
      const users = JSON.parse(localStorage.getItem('cw_local_users') || '[]');
      const found = users.find(u => u.email === data.email && u.password === data.password);
      if (found) {
        const user = { id: found.id, name: found.name, email: found.email };
        const token = 'local-token-' + found.id;
        this.saveAuth(token, user);
        document.getElementById('cwAuthModal')?.remove();
        this.showNotification('Logged in (local)', 'success');
        return;
      }
      this.showNotification('Login failed', 'error');
    }
  }

  saveAuth(token, user) {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUser = user;
      // reveal page now that we are authenticated
      try { this.unlockPageAfterAuth(); } catch(e){}
      this.updateUserProfile();
      this.loadUserReports();
      this.loadNotifications();
    } catch (e) {
      console.error('Failed to save auth', e);
    }
  }

  updateUserProfile() {
    const userProfile = document.getElementById('userProfile');
    if (userProfile && this.currentUser) {
      userProfile.innerHTML = `
        <div class="profileCard">
          <h3>${this.currentUser.name}</h3>
          <p>${this.currentUser.email}</p>
          <p class="location">${this.currentUser.location || 'Location not set'}</p>
          <button onclick="citizenModule.editProfile()">Edit Profile</button>
        </div>
      `;
    }
  }

  editProfile() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent">
        <span class="closeBtn" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <h2>Edit Profile</h2>
        <form id="editProfileForm" onsubmit="citizenModule.handleProfileUpdate(event)">
          <div class="formGroup">
            <label for="profileName">Name:</label>
            <input type="text" id="profileName" name="name" value="${this.currentUser.name}" required>
          </div>
          <div class="formGroup">
            <label for="profileEmail">Email:</label>
            <input type="email" id="profileEmail" name="email" value="${this.currentUser.email}" required>
          </div>
          <div class="formGroup">
            <label for="profileLocation">Location:</label>
            <input type="text" id="profileLocation" name="location" value="${this.currentUser.location || ''}">
          </div>
          <div class="formGroup">
            <label for="profilePhone">Phone:</label>
            <input type="tel" id="profilePhone" name="phone" value="${this.currentUser.phone || ''}">
          </div>
          <button type="submit">Save Changes</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  async handleProfileUpdate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profileData = Object.fromEntries(formData);

    try {
      const response = await fetch(`${this.apiBaseUrl}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) throw new Error('Failed to update profile');
      
      this.currentUser = { ...this.currentUser, ...profileData };
      this.updateUserProfile();
      this.showNotification('Profile updated successfully', 'success');
      document.querySelector('.modal').remove();
    } catch (error) {
      console.error('Error updating profile:', error);
      this.showNotification('Failed to update profile', 'error');
    }
  }

  handleDashboardLoad() {
    const dashboardContainer = document.getElementById('citizenDashboard');
    if (dashboardContainer) {
      this.loadDashboardStats();
    }
  }

  async loadDashboardStats() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/dashboard`);
      if (!response.ok) throw new Error('Failed to load dashboard');
      
      const stats = await response.json();
      this.displayDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }

  displayDashboardStats(stats) {
    const dashboard = document.getElementById('citizenDashboard');
    if (!dashboard) return;

    dashboard.innerHTML = `
      <div class="dashboardGrid">
        <div class="statCard">
          <h3>My Reports</h3>
          <p class="statValue">${stats.totalReports || 0}</p>
        </div>
        <div class="statCard">
          <h3>Resolved</h3>
          <p class="statValue">${stats.resolvedReports || 0}</p>
        </div>
        <div class="statCard">
          <h3>Pending</h3>
          <p class="statValue">${stats.pendingReports || 0}</p>
        </div>
        <div class="statCard">
          <h3>New Messages</h3>
          <p class="statValue">${stats.newMessages || 0}</p>
        </div>
      </div>
      <div class="quickActions">
        <button onclick="citizenModule.openReportForm()">Submit New Report</button>
        <button onclick="citizenModule.viewMyReports()">View My Reports</button>
        <button onclick="citizenModule.openFeedback()">Send Feedback</button>
      </div>
    `;

    // Draw small charts if status distribution provided
    (async () => {
      try {
        if (stats.statusDistribution || stats.priorityDistribution) {
          await this.loadChartJS();
          this.drawCitizenCharts(stats);
        }
      } catch (e) {
        console.warn('Citizen charts skipped', e);
      }
    })();
  }

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

  drawCitizenCharts(stats) {
    const dashboard = document.getElementById('citizenDashboard');
    if (!dashboard) return;

    if (stats.statusDistribution) {
      let canvas = document.getElementById('citizenStatusChart');
      if (!canvas) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chartCard';
        wrapper.innerHTML = '<h4>My Reports by Status</h4><canvas id="citizenStatusChart" width="400" height="200"></canvas>';
        dashboard.appendChild(wrapper);
        canvas = document.getElementById('citizenStatusChart');
      }
      try {
        const labels = Object.keys(stats.statusDistribution);
        const values = Object.values(stats.statusDistribution);
        new Chart(canvas.getContext('2d'), { type: 'pie', data: { labels, datasets: [{ data: values, backgroundColor: ['#4caf50', '#ff9800', '#f44336'] }] } });
      } catch (e) { console.warn(e); }
    }

    if (stats.priorityDistribution) {
      let canvas = document.getElementById('citizenPriorityChart');
      if (!canvas) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chartCard';
        wrapper.innerHTML = '<h4>My Reports by Priority</h4><canvas id="citizenPriorityChart" width="400" height="200"></canvas>';
        dashboard.appendChild(wrapper);
        canvas = document.getElementById('citizenPriorityChart');
      }
      try {
        const labels = Object.keys(stats.priorityDistribution);
        const values = Object.values(stats.priorityDistribution);
        new Chart(canvas.getContext('2d'), { type: 'bar', data: { labels, datasets: [{ label: 'Count', data: values, backgroundColor: '#2196f3' }] } });
      } catch (e) { console.warn(e); }
    }
  }

  openReportForm() {
    const form = document.getElementById('reportForm');
    if (form) {
      form.reset();
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async handleReportSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const reportData = {
      ...Object.fromEntries(formData),
      submittedBy: this.currentUser.id,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) throw new Error('Failed to submit report');
      
      const result = await response.json();
      this.showNotification('Report submitted successfully', 'success');
      this.userReports.push(result);
      e.target.reset();
      this.displayReportConfirmation(result);
    } catch (error) {
      console.error('Error submitting report:', error);
      this.showNotification('Failed to submit report', 'error');
    }
  }

  displayReportConfirmation(report) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent">
        <span class="closeBtn" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <h2>Report Submitted Successfully</h2>
        <div class="confirmationDetails">
          <p><strong>Report ID:</strong> ${report.id}</p>
          <p><strong>Title:</strong> ${report.title}</p>
          <p><strong>Status:</strong> ${report.status}</p>
          <p>Your report has been submitted. You can track its progress using the report ID above.</p>
        </div>
        <button onclick="citizenModule.viewMyReports(); this.parentElement.parentElement.remove()">View My Reports</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  handleFileUpload(e) {
    const files = e.target.files;
    const fileList = document.getElementById('fileList');
    
    if (fileList) {
      fileList.innerHTML = '';
      Array.from(files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'fileItem';
        fileItem.innerHTML = `
          <span>${file.name}</span>
          <span>${(file.size / 1024).toFixed(2)} KB</span>
        `;
        fileList.appendChild(fileItem);
      });
    }
  }

  async loadUserReports() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/reports`);
      if (!response.ok) throw new Error('Failed to load reports');
      
      this.userReports = await response.json();
    } catch (error) {
      console.error('Error loading reports:', error);
      this.showNotification('Failed to load reports', 'error');
    }
  }

  viewMyReports() {
    this.navigateTo('MY_REPORT.HTML');
  }

  async filterReports() {
    const statusFilter = document.getElementById('reportStatus')?.value;
    const dateFilter = document.getElementById('reportDate')?.value;

    try {
      let url = `${this.apiBaseUrl}/reports?`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (dateFilter) url += `date=${dateFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to filter reports');
      
      this.userReports = await response.json();
      this.displayUserReports();
    } catch (error) {
      console.error('Error filtering reports:', error);
      this.showNotification('Failed to filter reports', 'error');
    }
  }

  displayUserReports() {
    const reportsList = document.getElementById('myReportsList');
    if (!reportsList) return;

    reportsList.innerHTML = '';
    this.userReports.forEach(report => {
      const reportCard = document.createElement('div');
      reportCard.className = `reportCard status-${report.status}`;
      reportCard.innerHTML = `
        <h4>${report.title}</h4>
        <p><strong>Status:</strong> ${report.status}</p>
        <p><strong>Submitted:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
        <p>${report.description.substring(0, 100)}...</p>
        <button onclick="citizenModule.viewReportDetails('${report.id}')">View Details</button>
      `;
      reportsList.appendChild(reportCard);
    });
  }

  async viewReportDetails(reportId) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/reports/${reportId}`);
      if (!response.ok) throw new Error('Failed to load report');
      
      const report = await response.json();
      this.displayReportDetailsModal(report);
    } catch (error) {
      console.error('Error loading report:', error);
      this.showNotification('Failed to load report', 'error');
    }
  }

  displayReportDetailsModal(report) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modalContent">
        <span class="closeBtn" onclick="this.parentElement.parentElement.remove()">&times;</span>
        <h2>${report.title}</h2>
        <div class="reportDetails">
          <p><strong>Report ID:</strong> ${report.id}</p>
          <p><strong>Status:</strong> ${report.status}</p>
          <p><strong>Priority:</strong> ${report.priority}</p>
          <p><strong>Location:</strong> ${report.location}</p>
          <p><strong>Description:</strong> ${report.description}</p>
          <p><strong>Submitted:</strong> ${new Date(report.createdAt).toLocaleDateString()}</p>
          ${report.departmentAssigned ? `<p><strong>Assigned to:</strong> ${report.departmentAssigned}</p>` : ''}
          ${report.lastUpdate ? `<p><strong>Last Update:</strong> ${new Date(report.lastUpdate).toLocaleDateString()}</p>` : ''}
        </div>
        <div class="reportActions">
          <button onclick="citizenModule.editReport('${report.id}')">Edit</button>
          <button onclick="citizenModule.deleteReport('${report.id}')">Delete</button>
          <button onclick="citizenModule.trackReport('${report.id}')">Track Progress</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  editReport(reportId) {
    const report = this.userReports.find(r => r.id === reportId);
    if (!report) return;

    const form = document.getElementById('reportForm');
    if (form) {
      form.querySelector('[name="title"]').value = report.title;
      form.querySelector('[name="description"]').value = report.description;
      form.querySelector('[name="location"]').value = report.location;
      form.querySelector('[name="priority"]').value = report.priority;
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }
  async deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`${this.apiBaseUrl}/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete report');
      
      this.showNotification('Report deleted successfully', 'success');
      this.userReports = this.userReports.filter(r => r.id !== reportId);
      document.querySelector('.modal').remove();
      this.displayUserReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      this.showNotification('Failed to delete report', 'error');
    }
  }

  trackReport(reportId) {
    this.navigateTo(`MY_REPORT.HTML?id=${reportId}`);
  }

  showMapView() {
    this.navigateTo('MAP_VIEW.HTML');
  }

  async loadNotifications() {
    try {
      const response = await fetch(`${this.apiBaseUrl}/notifications`);
      if (!response.ok) throw new Error('Failed to load notifications');
      
      this.notifications = await response.json();
      this.updateNotificationBadge();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  updateNotificationBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
      badge.textContent = unreadCount;
      badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
  }

  openFeedback() {
    this.navigateTo('FEEDBACK.HTML');
  }

  async handleFeedbackSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const feedbackData = {
      ...Object.fromEntries(formData),
      submittedBy: this.currentUser.id,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) throw new Error('Failed to submit feedback');
      
      this.showNotification('Thank you for your feedback!', 'success');
      e.target.reset();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      this.showNotification('Failed to submit feedback', 'error');
    }
  }

  async updateNotificationSettings() {
    const emailNotif = document.getElementById('emailNotifications')?.checked;
    const smsNotif = document.getElementById('smsNotifications')?.checked;
    const pushNotif = document.getElementById('pushNotifications')?.checked;

    try {
      const response = await fetch(`${this.apiBaseUrl}/notification-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: emailNotif,
          smsNotifications: smsNotif,
          pushNotifications: pushNotif
        })
      });

      if (!response.ok) throw new Error('Failed to update settings');
      
      this.showNotification('Notification settings updated', 'success');
    } catch (error) {
      console.error('Error updating settings:', error);
      this.showNotification('Failed to update settings', 'error');
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
    window.location.href = 'INDEX.HTML';
  }

  logout() {
    fetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    // keep local_citizens for future logins, but remove any flags
    window.location.href = 'LOGOUT.HTML';
  }

  // Hide page content until the user authenticates
  lockPageForAuth() {
    try {
      const styleId = 'cw-auth-lock-style';
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.innerHTML = `\n          header, nav, main, footer { display: none !important; }\n        `;
        document.head.appendChild(s);
      }
    } catch (e) { console.warn('lockPageForAuth failed', e); }
  }

  // Remove the lock so page content is visible after auth
  unlockPageAfterAuth() {
    try {
      const style = document.getElementById('cw-auth-lock-style');
      if (style) style.remove();
    } catch (e) { console.warn('unlockPageAfterAuth failed', e); }
  }
}

const citizenModule = new CitizenModule();
