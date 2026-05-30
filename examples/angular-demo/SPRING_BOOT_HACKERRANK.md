# HackerRank-Style Spring Boot Practice Problems

## Problem 1: REST API with CRUD Operations
**Difficulty:** Easy | **Time:** 20-30 mins

### Requirements:
1. Create `User` entity with:
   - `id` (Long, auto-generated)
   - `name` (String, required)
   - `email` (String, unique, required)
   - `age` (Integer)

2. Create `UserRepository` extending `JpaRepository`

3. Create `UserController` with endpoints:
   - `GET /api/users` - get all users
   - `GET /api/users/{id}` - get user by id
   - `POST /api/users` - create new user
   - `PUT /api/users/{id}` - update user
   - `DELETE /api/users/{id}` - delete user

4. Add proper HTTP status codes and error handling

### Bonus:
- Add pagination: `GET /api/users?page=0&size=10`
- Add sorting: `GET /api/users?sort=name,asc`
- Add search: `GET /api/users/search?name=John`

---

## Problem 2: Service Layer & Business Logic
**Difficulty:** Easy | **Time:** 15-25 mins

### Requirements:
1. Create `ProductService` with:
   - `getAllProducts()` - returns List<Product>
   - `getProductById(id)` - returns Product or throw exception
   - `createProduct(product)` - saves and returns product
   - `updateProduct(id, product)` - updates product
   - `deleteProduct(id)` - deletes product

2. Create `ProductController` that uses `ProductService`

3. Add custom exception `ProductNotFoundException`

4. Add `@ControllerAdvice` for global exception handling

### Bonus:
- Add `@Transactional` for data consistency
- Add logging with SLF4J
- Add validation with `@Valid` and `@NotBlank`

---

## Problem 3: Database Relationships (One-to-Many)
**Difficulty:** Medium | **Time:** 25-35 mins

### Requirements:
1. Create `Author` entity with:
   - `id`, `name`, `email`
   - One-to-Many relationship with `Book`

2. Create `Book` entity with:
   - `id`, `title`, `isbn`, `publishedYear`
   - Many-to-One relationship with `Author`

3. Create repositories for both entities

4. Create controllers:
   - `GET /api/authors` - all authors
   - `GET /api/authors/{id}/books` - books by author
   - `POST /api/authors/{id}/books` - add book to author
   - `DELETE /api/books/{id}` - delete book

### Bonus:
- Add `@JsonIgnore` to prevent circular references
- Add cascade delete
- Add custom queries with `@Query`

---

## Problem 4: Authentication & Authorization
**Difficulty:** Hard | **Time:** 35-45 mins

### Requirements:
1. Create `User` entity with roles (ADMIN, USER)

2. Implement Spring Security:
   - `SecurityConfig` with `SecurityFilterChain`
   - Password encoding with `BCryptPasswordEncoder`
   - JWT token generation and validation

3. Create `AuthController` with:
   - `POST /auth/register` - register new user
   - `POST /auth/login` - login and return JWT token
   - `POST /auth/logout` - logout

4. Create `JwtTokenProvider` for token management

5. Protect endpoints:
   - `/api/admin/**` - only ADMIN role
   - `/api/users/**` - authenticated users

### Bonus:
- Add refresh token functionality
- Add token expiration
- Add role-based access control (RBAC)

---

## Problem 5: Validation & Error Handling
**Difficulty:** Medium | **Time:** 20-30 mins

### Requirements:
1. Create `RegistrationRequest` DTO with:
   - `email` - required, valid email format
   - `password` - required, min 8 chars, uppercase + number
   - `confirmPassword` - must match password
   - `age` - min 18, max 120

2. Create custom validators:
   - `@ValidEmail` - validate email format
   - `@PasswordStrength` - validate password strength
   - `@FieldMatch` - validate password match

3. Create `GlobalExceptionHandler` with:
   - `MethodArgumentNotValidException` handler
   - `ConstraintViolationException` handler
   - Generic exception handler

4. Return consistent error response format

### Bonus:
- Add custom error messages
- Add error codes
- Add timestamp to error response

---

## Problem 6: Pagination & Filtering
**Difficulty:** Medium | **Time:** 25-35 mins

### Requirements:
1. Create `Product` entity with:
   - `id`, `name`, `price`, `category`, `stock`

2. Create `ProductRepository` with custom queries:
   - Find by category
   - Find by price range
   - Find by stock status

3. Create `ProductController` with:
   - `GET /api/products?page=0&size=10&sort=price,asc`
   - `GET /api/products/search?category=electronics&minPrice=100&maxPrice=1000`
   - `GET /api/products/low-stock` - products with low stock

4. Return `Page<ProductDTO>` with metadata

### Bonus:
- Add search by name (case-insensitive)
- Add multiple sort fields
- Add filter by multiple categories

---

## Problem 7: Caching with Spring Cache
**Difficulty:** Medium | **Time:** 20-30 mins

### Requirements:
1. Configure Spring Cache with `@EnableCaching`

2. Create `UserService` with:
   - `@Cacheable` on `getUserById(id)`
   - `@CacheEvict` on `updateUser(id, user)`
   - `@CachePut` on `createUser(user)`

3. Create `CacheController` with:
   - `GET /api/cache/stats` - cache statistics
   - `DELETE /api/cache/clear` - clear cache

4. Use `ConcurrentMapCacheManager` or Redis

### Bonus:
- Use Redis for distributed caching
- Add cache TTL (time-to-live)
- Add cache key generation strategy

---

## Problem 8: Async Processing & Scheduling
**Difficulty:** Hard | **Time:** 30-40 mins

### Requirements:
1. Create `EmailService` with:
   - `@Async` method `sendEmail(to, subject, body)`
   - Returns `CompletableFuture<Boolean>`

2. Create `ScheduledTasks` with:
   - `@Scheduled(fixedRate=60000)` - runs every 60 seconds
   - `@Scheduled(cron="0 0 * * * *")` - runs daily at midnight
   - Cleanup old records task

3. Create `TaskController` with:
   - `POST /api/tasks/send-email` - async email sending
   - `GET /api/tasks/status` - check task status

4. Add `@EnableAsync` and `@EnableScheduling`

### Bonus:
- Add task queue with Spring Integration
- Add retry logic with `@Retryable`
- Add circuit breaker pattern

---

## Problem 9: File Upload & Download
**Difficulty:** Medium | **Time:** 25-35 mins

### Requirements:
1. Create `FileService` with:
   - `uploadFile(file)` - save file to disk/cloud
   - `downloadFile(fileId)` - retrieve file
   - `deleteFile(fileId)` - delete file
   - `getFileMetadata(fileId)` - get file info

2. Create `FileController` with:
   - `POST /api/files/upload` - upload file
   - `GET /api/files/{id}/download` - download file
   - `DELETE /api/files/{id}` - delete file
   - `GET /api/files/{id}/info` - get file info

3. Validate file type and size

4. Store file metadata in database

### Bonus:
- Add virus scanning
- Add file compression
- Add cloud storage (AWS S3, Google Cloud)

---

## Problem 10: Testing with JUnit & Mockito
**Difficulty:** Hard | **Time:** 35-45 mins

### Requirements:
1. Create unit tests for `UserService`:
   - Test `getUserById()` - success and not found
   - Test `createUser()` - valid and invalid data
   - Test `updateUser()` - success and not found
   - Test `deleteUser()` - success and not found

2. Create integration tests for `UserController`:
   - Test GET endpoints
   - Test POST endpoint with valid/invalid data
   - Test PUT endpoint
   - Test DELETE endpoint

3. Use `@WebMvcTest` for controller tests

4. Use `@DataJpaTest` for repository tests

5. Mock dependencies with `@MockBean`

### Bonus:
- Add test coverage reporting
- Add performance tests
- Add security tests

---

## Tips for Success
1. **Use DTOs** - separate entity from API response
2. **Add validation** - use `@Valid` and custom validators
3. **Handle exceptions** - use `@ControllerAdvice`
4. **Use transactions** - `@Transactional` for data consistency
5. **Add logging** - use SLF4J for debugging
6. **Write tests** - unit and integration tests
7. **Use proper HTTP status codes** - 200, 201, 400, 404, 500
8. **Document APIs** - use Swagger/SpringDoc OpenAPI
9. **Follow REST conventions** - proper naming and structure
10. **Secure endpoints** - use Spring Security

---

## Project Structure
```
src/
├── main/
│   ├── java/com/example/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   ├── dto/
│   │   ├── exception/
│   │   ├── config/
│   │   └── Application.java
│   └── resources/
│       └── application.properties
└── test/
    └── java/com/example/
        ├── controller/
        ├── service/
        └── repository/
```

## Dependencies (pom.xml)
- Spring Boot Web
- Spring Data JPA
- Spring Security
- H2 Database (for testing)
- MySQL/PostgreSQL (for production)
- Lombok
- Validation API
- JUnit 5
- Mockito
- RestAssured (for API testing)

