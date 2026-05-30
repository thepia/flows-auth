import { CommonModule } from '@angular/common';
import { Component, type OnDestroy, type OnInit, inject } from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  catchError,
  debounceTime,
  map,
  of,
  switchMap,
  takeUntil
} from 'rxjs';
import type { User } from '../../services/UserService';
import { UserService } from '../../services/UserService';

@Component({
  selector: 'user-list',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './user-list-component.html',
  styleUrl: './user-list-component.css'
})
export class UserListComponent implements OnInit, OnDestroy {
  private userService = inject(UserService);
  users$ = new BehaviorSubject<User[]>([]);
  loading$ = new BehaviorSubject<boolean>(false);
  error$ = new BehaviorSubject<string | null>(null);
  private destroy$ = new Subject<void>();
  private searchQuery$ = new Subject<string>();
  query = '';

  // constructor(private userService: UserService) {}

  ngOnInit() {
    this.loading$.next(true);

    // Load initial users
    this.userService
      .getUsers()
      .pipe(
        catchError((err) => {
          console.error('Error loading users:', err);
          this.error$.next('Failed to load users. Please try again.');
          this.loading$.next(false);
          return of([]);
        })
      )
      .subscribe({
        next: (data) => {
          this.users$.next(data);
          this.loading$.next(false);
          this.error$.next(null);
        }
      });

    // Handle search with debounce and filter
    this.searchQuery$
      .pipe(
        debounceTime(300),
        switchMap((query) =>
          this.userService.getUsers().pipe(
            map((users) => {
              console.log('Filtering users...', query);
              if (!query.trim()) return users;
              return users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));
            }),
            catchError((err) => {
              console.error('Error searching users:', err);
              this.error$.next('Failed to search users. Please try again.');
              return of([]);
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (data) => {
          this.users$.next(data);
          this.error$.next(null);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(event: Event) {
    console.log('Search query:', (event.target as HTMLInputElement).value);
    const query = (event.target as HTMLInputElement).value;
    this.query = query;
    this.searchQuery$.next(query);
  }
}
