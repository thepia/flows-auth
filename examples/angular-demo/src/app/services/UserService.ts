import { Inject, Injectable } from '@angular/core';
import { type Observable, catchError, delay, map, of, throwError } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
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
      map((users) => users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())))
    );
  }
}
