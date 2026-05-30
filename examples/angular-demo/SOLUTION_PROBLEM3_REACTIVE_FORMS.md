# Solution: Problem 3 - Form Validation with Reactive Forms

## Step 1: Create Custom Validators
```typescript
// validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, delay } from 'rxjs/operators';

// Password strength validator
export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const isLongEnough = value.length >= 8;

    const valid = hasUpperCase && hasNumber && isLongEnough;
    return valid ? null : { 
      passwordStrength: {
        hasUpperCase,
        hasNumber,
        isLongEnough
      }
    };
  };
}

// Password match validator
export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) return null;
    
    return password.value === confirmPassword.value 
      ? null 
      : { passwordMismatch: true };
  };
}

// Async email validator (simulates API check)
export function emailExistsValidator(): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) return of(null);

    // Simulate API call
    const existingEmails = ['test@example.com', 'admin@example.com'];
    return of(existingEmails.includes(control.value))
      .pipe(
        delay(500),
        map(exists => exists ? { emailExists: true } : null)
      );
  };
}
```

## Step 2: Create Registration Component
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  passwordStrengthValidator, 
  passwordMatchValidator,
  emailExistsValidator 
} from './validators';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="registration-container">
      <h2>Create Account</h2>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <!-- Email Field -->
        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            placeholder="you@example.com"
            class="form-input"
            [class.error]="isFieldInvalid('email')"
          />
          <div *ngIf="isFieldInvalid('email')" class="error-message">
            @if (form.get('email')?.hasError('required')) {
              Email is required
            }
            @if (form.get('email')?.hasError('email')) {
              Invalid email format
            }
            @if (form.get('email')?.hasError('emailExists')) {
              Email already registered
            }
          </div>
          <div *ngIf="form.get('email')?.pending" class="checking">
            Checking availability...
          </div>
        </div>

        <!-- Password Field -->
        <div class="form-group">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            class="form-input"
            [class.error]="isFieldInvalid('password')"
          />
          <div *ngIf="isFieldInvalid('password')" class="error-message">
            @if (form.get('password')?.hasError('required')) {
              Password is required
            }
            @if (form.get('password')?.hasError('passwordStrength')) {
              Password must have: 8+ chars, uppercase letter, number
            }
          </div>
          <div class="password-strength">
            <div class="strength-bar">
              <div 
                class="strength-fill"
                [style.width.%]="getPasswordStrength()"
                [class.weak]="getPasswordStrength() < 50"
                [class.medium]="getPasswordStrength() >= 50 && getPasswordStrength() < 100"
                [class.strong]="getPasswordStrength() === 100"
              ></div>
            </div>
            <span class="strength-text">{{ getPasswordStrengthText() }}</span>
          </div>
        </div>

        <!-- Confirm Password Field -->
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            formControlName="confirmPassword"
            placeholder="Re-enter password"
            class="form-input"
            [class.error]="isFieldInvalid('confirmPassword')"
          />
          <div *ngIf="isFieldInvalid('confirmPassword')" class="error-message">
            @if (form.get('confirmPassword')?.hasError('required')) {
              Please confirm password
            }
            @if (form.hasError('passwordMismatch')) {
              Passwords do not match
            }
          </div>
        </div>

        <!-- Terms Checkbox -->
        <div class="form-group checkbox">
          <input
            id="terms"
            type="checkbox"
            formControlName="terms"
            class="checkbox-input"
          />
          <label for="terms">I agree to the Terms and Conditions</label>
          <div *ngIf="isFieldInvalid('terms')" class="error-message">
            You must agree to the terms
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          [disabled]="form.invalid || isSubmitting()"
          class="submit-btn"
        >
          {{ isSubmitting() ? 'Creating Account...' : 'Create Account' }}
        </button>

        <!-- Success Message -->
        <div *ngIf="successMessage()" class="success-message">
          {{ successMessage() }}
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage()" class="error-message">
          {{ errorMessage() }}
        </div>
      </form>
    </div>
  `,
  styles: [`
    .registration-container {
      max-width: 400px;
      margin: 40px auto;
      padding: 30px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: white;
    }

    h2 {
      text-align: center;
      margin-bottom: 30px;
      color: #333;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
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

    .form-input.error {
      border-color: #ff6b6b;
    }

    .error-message {
      color: #ff6b6b;
      font-size: 12px;
      margin-top: 5px;
    }

    .checking {
      color: #667eea;
      font-size: 12px;
      margin-top: 5px;
    }

    .password-strength {
      margin-top: 10px;
    }

    .strength-bar {
      height: 4px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 5px;
    }

    .strength-fill {
      height: 100%;
      transition: width 0.3s, background-color 0.3s;
    }

    .strength-fill.weak {
      background: #ff6b6b;
    }

    .strength-fill.medium {
      background: #ffa500;
    }

    .strength-fill.strong {
      background: #51cf66;
    }

    .strength-text {
      font-size: 12px;
      color: #666;
    }

    .checkbox {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .checkbox-input {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .submit-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success-message {
      margin-top: 15px;
      padding: 12px;
      background: #efe;
      color: #3c3;
      border-radius: 4px;
      text-align: center;
    }
  `]
})
export class RegistrationComponent implements OnInit {
  form!: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.form = this.fb.group(
      {
        email: [
          '',
          [Validators.required, Validators.email],
          [emailExistsValidator()]
        ],
        password: ['', [Validators.required, passwordStrengthValidator()]],
        confirmPassword: ['', Validators.required],
        terms: [false, Validators.requiredTrue]
      },
      { validators: passwordMatchValidator() }
    );
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getPasswordStrength(): number {
    const password = this.form.get('password')?.value || '';
    let strength = 0;
    if (password.length >= 8) strength += 33;
    if (/[A-Z]/.test(password)) strength += 33;
    if (/[0-9]/.test(password)) strength += 34;
    return strength;
  }

  getPasswordStrengthText(): string {
    const strength = this.getPasswordStrength();
    if (strength < 50) return 'Weak';
    if (strength < 100) return 'Medium';
    return 'Strong';
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    // Simulate API call
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.successMessage.set('Account created successfully!');
      this.form.reset();
    }, 2000);
  }
}
```

## Key Concepts:
- ✅ `FormBuilder` - build forms programmatically
- ✅ Custom validators - `passwordStrengthValidator()`
- ✅ Cross-field validators - `passwordMatchValidator()`
- ✅ Async validators - `emailExistsValidator()`
- ✅ Form state - `invalid`, `pending`, `dirty`, `touched`
- ✅ Error handling and display
- ✅ Password strength indicator

## Common Mistakes:
❌ Not using `FormGroup` for cross-field validation
❌ Not handling async validators
❌ Not disabling submit button while submitting
❌ Not clearing errors on success

