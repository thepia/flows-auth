import { CommonModule } from '@angular/common';
import { Component, type OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SigninHeaderComponent } from './signin-header/signin-header.component';
// import { useAuthStore } from '@thepia/flows-auth';

@Component({
  selector: 'app-signin-form',
  standalone: true,
  imports: [CommonModule, FormsModule, SigninHeaderComponent],
  template: `
    <div class="signin-container">
      <div class="signin-card">
        <app-signin-header />

        <form (ngSubmit)="onSubmit()" #signinForm="ngForm">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="email"
              placeholder="you@example.com"
              required
              class="form-input"
            />
          </div>

          <button
            type="submit"
            [disabled]="isLoading()"
            class="signin-button"
          >
            {{ isLoading() ? 'Signing in...' : 'Sign In' }}
          </button>

          <div *ngIf="error()" class="error-message">
            {{ error() }}
          </div>

          <div *ngIf="successMessage()" class="success-message">
            {{ successMessage() }}
          </div>
        </form>

        <div class="signin-info">
          <p>
            <strong>Demo Mode:</strong> Enter any email to proceed to the admin dashboard.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .signin-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .signin-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      color: #333;
      font-weight: 500;
      font-size: 14px;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.3s;
    }

    .form-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .signin-button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .signin-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .signin-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .error-message {
      margin-top: 15px;
      padding: 12px;
      background-color: #fee;
      color: #c33;
      border-radius: 4px;
      font-size: 14px;
      border-left: 4px solid #c33;
    }

    .success-message {
      margin-top: 15px;
      padding: 12px;
      background-color: #efe;
      color: #3c3;
      border-radius: 4px;
      font-size: 14px;
      border-left: 4px solid #3c3;
    }

    .signin-info {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #666;
    }

    .signin-info p {
      margin: 0;
    }
  `
  ]
})
export class SigninFormComponent implements OnInit {
  email = '';
  isLoading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    // Initialize the auth store
    // try {
    //   this.authStore = useAuthStore();
    // } catch (err) {
    //   console.log('Auth store not yet initialized, will use mock auth');
    // }
  }

  onSubmit() {
    if (!this.email) {
      this.error.set('Please enter an email address');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    // Simulate API call
    setTimeout(() => {
      this.isLoading.set(false);
      this.successMessage.set(`Sign in initiated for ${this.email}`);

      // In a real app, this would trigger auth flow
      // For now, we'll just show success
      setTimeout(() => {
        this.successMessage.set(null);
        this.email = '';
      }, 2000);
    }, 1500);
  }
}
