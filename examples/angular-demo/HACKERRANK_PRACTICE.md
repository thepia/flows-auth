# HackerRank-Style Angular Practice Problems

## Problem 1: User List with Search (Traditional RxJS)
**Difficulty:** Medium | **Time:** 20-30 mins

### Requirements:
1. Create a `UserService` that:
   - Has a method `getUsers()` returning `Observable<User[]>`
   - Simulates API delay with `delay(1000)`
   - Returns mock user data: `[{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}, {id: 3, name: 'Charlie'}]`

2. Create a `UserListComponent` that:
   - Displays users in a list
   - Has a search input that filters users by name (real-time)
   - Shows loading state while fetching
   - Unsubscribes properly on destroy
   - Uses `debounceTime(300)` for search input

3. Use RxJS operators: `map`, `filter`, `debounceTime`, `switchMap`

### Bonus:
- Add error handling with `catchError`
- Display error message if API fails

---

## Problem 2: Todo Counter with Signals (Modern Approach)
**Difficulty:** Easy | **Time:** 15-20 mins

### Requirements:
1. Create a `TodoService` with signals:
   - `todos = signal<Todo[]>([])`
   - `addTodo(title: string)` - adds new todo
   - `removeTodo(id: number)` - removes todo
   - `toggleTodo(id: number)` - toggles completion

2. Create a `TodoComponent` that:
   - Displays todos using `@for` loop
   - Shows count of completed vs total todos using `computed()`
   - Has input field to add new todos
   - Shows completion percentage using `computed()`

3. Use signals and `computed()` for derived state

### Bonus:
- Add `effect()` to log todos to console when they change
- Persist todos to localStorage

---

## Problem 3: Form Validation with Reactive Forms
**Difficulty:** Medium | **Time:** 25-35 mins

### Requirements:
1. Create a registration form with:
   - Email field (required, valid email format)
   - Password field (required, min 8 chars, must contain uppercase + number)
   - Confirm password (must match password)
   - Terms checkbox (must be checked)

2. Form validation:
   - Show real-time validation errors
   - Disable submit button if form invalid
   - Custom validator for password strength
   - Cross-field validator for password match

3. On submit:
   - Call `AuthService.register(data)` (returns Observable)
   - Show success/error message
   - Reset form on success

### Bonus:
- Add async validator to check if email already exists
- Show password strength indicator

---

## Problem 4: Parent-Child Communication
**Difficulty:** Medium | **Time:** 20-25 mins

### Requirements:
1. Create `ParentComponent` with:
   - List of products with prices
   - Pass each product to child component

2. Create `ProductCardComponent` (child) with:
   - `@Input() product: Product`
   - `@Output() onAddToCart = new EventEmitter<Product>()`
   - Display product info
   - "Add to Cart" button

3. `ParentComponent` should:
   - Listen to child's `onAddToCart` event
   - Maintain cart array
   - Display total price
   - Show cart items count

### Bonus:
- Add `@Input() discount: number` and calculate discounted price
- Add remove from cart functionality

---

## Problem 5: HTTP Service with Error Handling (Mixed Approach)
**Difficulty:** Hard | **Time:** 30-40 mins

### Requirements:
1. Create `PostService` with:
   - `getPosts()` - returns Observable<Post[]>
   - `getPost(id: number)` - returns Observable<Post>
   - `createPost(post: Post)` - returns Observable<Post>
   - Proper error handling with `catchError`
   - Retry logic with `retry(3)`

2. Create `PostListComponent` that:
   - Fetches and displays posts
   - Shows loading spinner
   - Shows error message with retry button
   - Handles empty state

3. Create `PostDetailComponent` that:
   - Accepts post ID from route params
   - Fetches single post
   - Displays post details
   - Has back button

### Bonus:
- Add pagination
- Add caching to avoid duplicate requests
- Use `shareReplay()` to share single request

---

## Problem 6: Custom Directive
**Difficulty:** Medium | **Time:** 20-25 mins

### Requirements:
1. Create `HighlightDirective` that:
   - Highlights element on hover
   - Accepts color as input: `appHighlight="yellow"`
   - Changes background color on hover
   - Restores original color on mouse leave

2. Create `ClickCounterDirective` that:
   - Counts clicks on element
   - Emits count via `@Output()`
   - Shows count in tooltip

3. Use both directives in a component

### Bonus:
- Add animation to highlight effect
- Add debounce to click counter

---

## Problem 7: Custom Pipe
**Difficulty:** Easy | **Time:** 15-20 mins

### Requirements:
1. Create `SafeHtmlPipe` that:
   - Takes HTML string as input
   - Sanitizes it using `DomSanitizer`
   - Returns safe HTML for display

2. Create `TruncatePipe` that:
   - Takes string and length as parameters
   - Truncates string if longer than length
   - Adds "..." at end
   - Usage: `{{ text | truncate:50 }}`

3. Create `CurrencyFormatPipe` that:
   - Formats number as currency
   - Accepts currency code: `{{ price | currencyFormat:'USD' }}`

### Bonus:
- Add locale support
- Add caching for performance

---

## Problem 8: Route Guards
**Difficulty:** Hard | **Time:** 30-40 mins

### Requirements:
1. Create `AuthGuard` that:
   - Checks if user is authenticated
   - Redirects to login if not
   - Allows access if authenticated

2. Create `AdminGuard` that:
   - Checks if user is admin
   - Redirects to home if not admin
   - Extends AuthGuard logic

3. Create routes:
   - `/login` - public
   - `/dashboard` - protected by AuthGuard
   - `/admin` - protected by AdminGuard
   - `/` - public home

4. Create `AuthService` with:
   - `isAuthenticated()` - returns Observable<boolean>
   - `isAdmin()` - returns Observable<boolean>
   - `login(credentials)` - sets auth state
   - `logout()` - clears auth state

### Bonus:
- Add role-based access control (RBAC)
- Add canDeactivate guard for unsaved changes

---

## Problem 9: State Management with Service (Signals + RxJS Mix)
**Difficulty:** Hard | **Time:** 35-45 mins

### Requirements:
1. Create `CartService` with:
   - `items = signal<CartItem[]>([])`
   - `total = computed()` - calculates total price
   - `itemCount = computed()` - counts items
   - `addItem(item)`, `removeItem(id)`, `updateQuantity(id, qty)`

2. Create `CartComponent` that:
   - Displays cart items
   - Shows total and item count
   - Has quantity controls
   - Has remove button

3. Create `CheckoutComponent` that:
   - Displays cart summary
   - Has form for shipping info
   - On submit, calls `OrderService.createOrder()`
   - Shows success/error message

### Bonus:
- Add discount code functionality
- Add order history
- Persist cart to localStorage

---

## Problem 10: Async Pipe & Change Detection
**Difficulty:** Medium | **Time:** 25-30 mins

### Requirements:
1. Create `DataService` that:
   - Returns Observable that emits data every 2 seconds
   - Use `interval()` and `map()`

2. Create `DataDisplayComponent` that:
   - Uses `async` pipe to subscribe to observable
   - Displays latest data
   - Shows update timestamp

3. Create `OnPushComponent` that:
   - Uses `ChangeDetectionStrategy.OnPush`
   - Receives data via `@Input()`
   - Updates only when input changes

### Bonus:
- Compare performance with default change detection
- Add manual change detection with `ChangeDetectorRef`

---

## Solutions Available
Solutions for all problems are in `/examples/angular-demo/HACKERRANK_SOLUTIONS/`

## Tips for Success
1. **Always unsubscribe** - use `takeUntilDestroyed()` or `OnDestroy`
2. **Use strong typing** - define interfaces for all data
3. **Handle errors** - always include error handling
4. **Test edge cases** - empty states, errors, loading
5. **Follow Angular style guide** - naming conventions, structure
6. **Use standalone components** - modern Angular approach

