import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="header-content">
          <h1>Admin Dashboard</h1>
          <button class="logout-button" (click)="onLogout()">Sign Out</button>
        </div>
      </header>

      <main class="dashboard-main">
        <div class="welcome-section">
          <h2>Welcome to the Admin Portal</h2>
          <p>You have successfully signed in.</p>
        </div>

        <div class="dashboard-grid">
          <div class="dashboard-card">
            <h3>Users</h3>
            <p class="card-number">1,234</p>
            <p class="card-description">Active users</p>
          </div>

          <div class="dashboard-card">
            <h3>Sessions</h3>
            <p class="card-number">567</p>
            <p class="card-description">Active sessions</p>
          </div>

          <div class="dashboard-card">
            <h3>Events</h3>
            <p class="card-number">12,456</p>
            <p class="card-description">Events this month</p>
          </div>

          <div class="dashboard-card">
            <h3>Security</h3>
            <p class="card-number">✓</p>
            <p class="card-description">All systems secure</p>
          </div>
        </div>

        <div class="info-section">
          <h3>About This Demo</h3>
          <p>
            This Angular 20 admin interface demonstrates integration with the flows-auth library
            using Zustand for state management. The authentication flow is powered by passwordless
            authentication with WebAuthn and magic links.
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background-color: #f5f7fa;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-content h1 {
      margin: 0;
      font-size: 28px;
    }

    .logout-button {
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s;
    }

    .logout-button:hover {
      background-color: rgba(255, 255, 255, 0.3);
      border-color: rgba(255, 255, 255, 0.5);
    }

    .dashboard-main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .welcome-section {
      margin-bottom: 40px;
    }

    .welcome-section h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 24px;
    }

    .welcome-section p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .dashboard-card {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .dashboard-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    }

    .dashboard-card h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    .card-number {
      margin: 0 0 8px 0;
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
    }

    .card-description {
      margin: 0;
      color: #999;
      font-size: 13px;
    }

    .info-section {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .info-section h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 18px;
    }

    .info-section p {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }
  `]
})
export class DashboardComponent {
  onLogout() {
    // In a real app, this would clear the auth store and redirect to login
    alert('Logout functionality would be implemented here');
  }
}

