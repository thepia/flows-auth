import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-signin-header',
  standalone: true,
  imports: [],
  templateUrl: './signin-header.component.html',
  styleUrl: './signin-header.component.css'
})
export class SigninHeaderComponent {
  title = signal('Admin Portal');
}
