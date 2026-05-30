# Angular Quick Reference for HackerRank

## Signals (Modern Approach - Angular 16+)
```typescript
import { signal, computed, effect } from '@angular/core';

// Create signal
const count = signal(0);

// Read signal
console.log(count()); // 0

// Update signal
count.set(5);
count.update(v => v + 1);

// Computed (derived state)
const doubled = computed(() => count() * 2);

// Effect (side effects)
effect(() => {
  console.log('Count changed:', count());
});
```

## RxJS Observables (Traditional Approach)
```typescript
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { map, filter, debounceTime, switchMap } from 'rxjs/operators';

// Create observable
const obs$ = new Observable(subscriber => {
  subscriber.next(1);
  subscriber.complete();
});

// Subscribe
obs$.subscribe({
  next: (value) => console.log(value),
  error: (err) => console.error(err),
  complete: () => console.log('Done')
});

// Subject (multicast)
const subject = new Subject<number>();
subject.subscribe(v => console.log(v));
subject.next(1);

// BehaviorSubject (has initial value)
const behavior$ = new BehaviorSubject(0);
behavior$.subscribe(v => console.log(v)); // logs 0 immediately

// Common operators
obs$.pipe(
  map(x => x * 2),
  filter(x => x > 5),
  debounceTime(300),
  switchMap(x => anotherObservable$)
);
```

## Reactive Forms
```typescript
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Create form
const form = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
  terms: [false, Validators.requiredTrue]
});

// Access controls
form.get('email')?.value;
form.get('email')?.valid;
form.get('email')?.errors;
form.get('email')?.touched;
form.get('email')?.dirty;

// Update
form.patchValue({ email: 'test@example.com' });
form.setValue({ email: '', password: '', terms: false });

// Form state
form.valid;
form.invalid;
form.pending; // async validators running
form.pristine; // not modified
form.dirty; // modified
```

## Dependency Injection
```typescript
@Injectable({
  providedIn: 'root' // singleton
})
export class MyService {
  constructor(private http: HttpClient) {}
}

// In component
export class MyComponent {
  constructor(private service: MyService) {}
}
```

## Component Lifecycle
```typescript
export class MyComponent implements OnInit, OnDestroy {
  ngOnInit() {
    // Called after component initialized
  }

  ngOnDestroy() {
    // Called before component destroyed
    // Unsubscribe here!
  }
}
```

## Unsubscribe Patterns
```typescript
// Pattern 1: takeUntil
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.data$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => this.data = data);
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}

// Pattern 2: takeUntilDestroyed (Angular 16+)
ngOnInit() {
  this.service.data$
    .pipe(takeUntilDestroyed())
    .subscribe(data => this.data = data);
}

// Pattern 3: async pipe (auto-unsubscribe)
{{ data$ | async }}
```

## HTTP Requests
```typescript
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>('/api/users');
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>('/api/users', user);
  }

  updateUser(id: number, user: User): Observable<User> {
    return this.http.put<User>(`/api/users/${id}`, user);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`/api/users/${id}`);
  }
}
```

## Routing
```typescript
// Routes
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'users', component: UserListComponent },
  { path: 'users/:id', component: UserDetailComponent },
  { path: '**', redirectTo: '' }
];

// In component
constructor(private router: Router, private route: ActivatedRoute) {}

// Navigate
this.router.navigate(['/users', userId]);

// Get route params
this.route.params.subscribe(params => {
  const id = params['id'];
});

// Get query params
this.route.queryParams.subscribe(params => {
  const page = params['page'];
});
```

## Directives
```typescript
// Structural directives
*ngIf="condition"
*ngFor="let item of items; trackBy: trackByFn"
*ngSwitch="value"
  *ngSwitchCase="'case1'"
  *ngSwitchDefault

// Attribute directives
[ngClass]="{ active: isActive }"
[ngStyle]="{ color: textColor }"
[disabled]="isDisabled"

// Event binding
(click)="onClick()"
(keyup.enter)="onEnter()"
(change)="onChange($event)"

// Two-way binding
[(ngModel)]="value"
```

## Pipes
```typescript
// Built-in pipes
{{ date | date:'short' }}
{{ price | currency:'USD' }}
{{ text | uppercase }}
{{ text | lowercase }}
{{ items | slice:0:5 }}
{{ value | json }}

// Custom pipe
@Pipe({
  name: 'myPipe',
  standalone: true
})
export class MyPipe implements PipeTransform {
  transform(value: string, args?: any): string {
    return value.toUpperCase();
  }
}

// Usage
{{ text | myPipe }}
```

## Common RxJS Operators
```typescript
// Transformation
map(x => x * 2)
switchMap(x => anotherObs$)
mergeMap(x => anotherObs$)
concatMap(x => anotherObs$)

// Filtering
filter(x => x > 5)
debounceTime(300)
distinctUntilChanged()
take(5)
takeUntil(destroy$)

// Combination
combineLatest([obs1$, obs2$])
merge(obs1$, obs2$)
concat(obs1$, obs2$)
zip(obs1$, obs2$)

// Error handling
catchError(err => of(defaultValue))
retry(3)
```

## Testing Tips
- ✅ Always test error cases
- ✅ Test loading states
- ✅ Test empty states
- ✅ Test form validation
- ✅ Test navigation
- ✅ Mock services with `jasmine.createSpyObj()`
- ✅ Use `fakeAsync` and `tick()` for async code

## Performance Tips
- ✅ Use `OnPush` change detection
- ✅ Use `trackBy` in `*ngFor`
- ✅ Unsubscribe from observables
- ✅ Use `shareReplay()` for shared requests
- ✅ Lazy load routes
- ✅ Use `computed()` instead of getters

