import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Greeter } from '../components/greeter/greeter';
import { SigninFormComponent } from '../components/signin-form.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [SigninFormComponent, Greeter, RouterLink],
  template: `
    <app-greeter [message]="greeting"></app-greeter>

    <div class="nav-links">
      <a routerLink="/user-test" class="nav-link">User Test</a>
      <a routerLink="/dashboard" class="nav-link">Dashboard</a>
    </div>

    <app-signin-form></app-signin-form>
  `,
  styles: [
    `
    .nav-links {
      display: flex;
      gap: 15px;
      justify-content: center;
      margin: 20px 0;
    }

    .nav-link {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: 500;
      transition: background 0.3s;
    }

    .nav-link:hover {
      background: #5568d3;
    }
  `
  ]
})
export class LandingComponent {
  greeting = 'Hello from Landing Page';
}
