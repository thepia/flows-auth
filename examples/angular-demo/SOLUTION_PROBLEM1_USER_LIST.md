# Solution: Problem 1 - User List with Search (Traditional RxJS)

## Step 1: Create User Interface
```typescript
// user.model.ts
export interface User {
  id: number;
  name: string;
  email?: string;
}
```

## Step 2: Create UserService
```typescript
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { User } from './user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private mockUsers: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
    { id: 4, name: 'Diana', email: 'diana@example.com' }
  ];

  getUsers(): Observable<User[]> {
    return of(this.mockUsers).pipe(
      delay(1000) // Simulate API delay
    );
  }

  searchUsers(query: string): Observable<User[]> {
    return of(this.mockUsers).pipe(
      delay(500),
      map(users => 
        users.filter(u => 
          u.name.toLowerCase().includes(query.toLowerCase())
        )
      )
    );
  }
}
```

## Step 3: Create UserListComponent
```typescript
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from './user.service';
import { User } from './user.model';
import { Subject } from 'rxjs';
import { 
  debounceTime, 
  distinctUntilChanged, 
  switchMap, 
  takeUntil,
  startWith 
} from 'rxjs/operators';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-list-container">
      <h2>User Search</h2>
      
      <input 
        type="text" 
        placeholder="Search users..."
        (keyup)="onSearchChange($event)"
        class="search-input"
      />

      <div *ngIf="isLoading()" class="loading">
        Loading users...
      </div>

      <div *ngIf="error()" class="error">
        {{ error() }}
      </div>

      <ul *ngIf="!isLoading() && users().length > 0" class="user-list">
        <li *ngFor="let user of users()" class="user-item">
          <strong>{{ user.name }}</strong>
          <p>{{ user.email }}</p>
        </li>
      </ul>

      <div *ngIf="!isLoading() && users().length === 0" class="no-results">
        No users found
      </div>
    </div>
  `,
  styles: [`
    .user-list-container {
      padding: 20px;
      max-width: 500px;
    }
    .search-input {
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .loading, .error, .no-results {
      padding: 10px;
      text-align: center;
      margin: 10px 0;
    }
    .error {
      background-color: #fee;
      color: #c33;
    }
    .user-list {
      list-style: none;
      padding: 0;
    }
    .user-item {
      padding: 10px;
      border: 1px solid #ddd;
      margin-bottom: 10px;
      border-radius: 4px;
    }
  `]
})
export class UserListComponent implements OnInit, OnDestroy {
  users = signal<User[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {}

  ngOnInit() {
    // Initial load
    this.isLoading.set(true);
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load users');
          this.isLoading.set(false);
        }
      });

    // Search with debounce
    this.searchSubject.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        this.isLoading.set(true);
        return this.userService.searchUsers(query);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.error.set('Search failed');
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchSubject.next(query);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Key Concepts Used:
- ✅ `Observable` and RxJS operators
- ✅ `debounceTime()` - waits 300ms after user stops typing
- ✅ `distinctUntilChanged()` - ignores duplicate searches
- ✅ `switchMap()` - cancels previous request if new search comes in
- ✅ `takeUntil()` - unsubscribes on component destroy
- ✅ Signals for state management
- ✅ Error handling

## Common Mistakes to Avoid:
❌ Not unsubscribing (memory leaks)
❌ Not using debounce (too many API calls)
❌ Not handling errors
❌ Not showing loading state

