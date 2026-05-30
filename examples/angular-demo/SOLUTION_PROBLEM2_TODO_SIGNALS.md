# Solution: Problem 2 - Todo Counter with Signals (Modern Approach)

## Step 1: Create Todo Interface
```typescript
// todo.model.ts
export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}
```

## Step 2: Create TodoService with Signals
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { Todo } from './todo.model';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  todos = signal<Todo[]>([]);
  private nextId = signal(1);

  // Computed signals
  completedCount = computed(() => 
    this.todos().filter(t => t.completed).length
  );

  totalCount = computed(() => this.todos().length);

  completionPercentage = computed(() => {
    const total = this.totalCount();
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  addTodo(title: string) {
    if (!title.trim()) return;
    
    const newTodo: Todo = {
      id: this.nextId(),
      title: title.trim(),
      completed: false
    };

    this.todos.update(todos => [...todos, newTodo]);
    this.nextId.update(id => id + 1);
  }

  removeTodo(id: number) {
    this.todos.update(todos => todos.filter(t => t.id !== id));
  }

  toggleTodo(id: number) {
    this.todos.update(todos =>
      todos.map(t =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
    );
  }

  clearCompleted() {
    this.todos.update(todos => todos.filter(t => !t.completed));
  }
}
```

## Step 3: Create TodoComponent
```typescript
import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="todo-container">
      <h2>My Todos</h2>

      <!-- Stats -->
      <div class="stats">
        <p>Total: {{ todoService.totalCount() }}</p>
        <p>Completed: {{ todoService.completedCount() }}</p>
        <p>Progress: {{ todoService.completionPercentage() }}%</p>
      </div>

      <!-- Progress Bar -->
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          [style.width.%]="todoService.completionPercentage()"
        ></div>
      </div>

      <!-- Add Todo Form -->
      <div class="add-todo">
        <input 
          type="text" 
          [(ngModel)]="newTodoTitle"
          (keyup.enter)="addTodo()"
          placeholder="Add a new todo..."
          class="todo-input"
        />
        <button (click)="addTodo()" class="add-btn">Add</button>
      </div>

      <!-- Todo List -->
      <ul class="todo-list">
        @for (todo of todoService.todos(); track todo.id) {
          <li class="todo-item" [class.completed]="todo.completed">
            <input 
              type="checkbox" 
              [checked]="todo.completed"
              (change)="todoService.toggleTodo(todo.id)"
              class="checkbox"
            />
            <span class="todo-title">{{ todo.title }}</span>
            <button 
              (click)="todoService.removeTodo(todo.id)"
              class="delete-btn"
            >
              ✕
            </button>
          </li>
        }
      </ul>

      <!-- Empty State -->
      @if (todoService.totalCount() === 0) {
        <p class="empty-state">No todos yet. Add one to get started!</p>
      }

      <!-- Clear Completed -->
      @if (todoService.completedCount() > 0) {
        <button 
          (click)="todoService.clearCompleted()"
          class="clear-btn"
        >
          Clear Completed
        </button>
      }
    </div>
  `,
  styles: [`
    .todo-container {
      max-width: 500px;
      margin: 20px auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }

    .stats {
      display: flex;
      justify-content: space-around;
      margin: 15px 0;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .stats p {
      margin: 0;
      font-weight: 500;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 20px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transition: width 0.3s ease;
    }

    .add-todo {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .todo-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .add-btn {
      padding: 10px 20px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .add-btn:hover {
      background: #5568d3;
    }

    .todo-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .todo-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border: 1px solid #eee;
      border-radius: 4px;
      margin-bottom: 8px;
      background: white;
    }

    .todo-item.completed {
      opacity: 0.6;
      background: #f9f9f9;
    }

    .todo-item.completed .todo-title {
      text-decoration: line-through;
      color: #999;
    }

    .checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .todo-title {
      flex: 1;
      word-break: break-word;
    }

    .delete-btn {
      background: #ff6b6b;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    }

    .delete-btn:hover {
      background: #ff5252;
    }

    .empty-state {
      text-align: center;
      color: #999;
      padding: 20px;
    }

    .clear-btn {
      width: 100%;
      padding: 10px;
      background: #ffa500;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 10px;
    }

    .clear-btn:hover {
      background: #ff8c00;
    }
  `]
})
export class TodoComponent implements OnInit {
  newTodoTitle = '';

  constructor(public todoService: TodoService) {}

  ngOnInit() {
    // Log todos whenever they change
    effect(() => {
      console.log('Todos updated:', this.todoService.todos());
      console.log('Completion:', this.todoService.completionPercentage() + '%');
    });
  }

  addTodo() {
    this.todoService.addTodo(this.newTodoTitle);
    this.newTodoTitle = '';
  }
}
```

## Key Concepts Used:
- ✅ `signal()` - reactive state
- ✅ `computed()` - derived state (auto-updates)
- ✅ `effect()` - side effects (logging)
- ✅ `@for` - new control flow syntax
- ✅ `@if` - new conditional syntax
- ✅ `signal.update()` - immutable updates
- ✅ Standalone component

## Bonus: Add localStorage Persistence
```typescript
// In TodoService
ngOnInit() {
  // Load from localStorage
  const saved = localStorage.getItem('todos');
  if (saved) {
    this.todos.set(JSON.parse(saved));
  }

  // Save whenever todos change
  effect(() => {
    localStorage.setItem('todos', JSON.stringify(this.todos()));
  });
}
```

## Signals vs RxJS Comparison:
| Feature | Signals | RxJS |
|---------|---------|------|
| State | `signal()` | `BehaviorSubject` |
| Derived | `computed()` | `map()` operator |
| Side effects | `effect()` | `subscribe()` |
| Syntax | Simpler | More verbose |
| Performance | Better | Good |
| Learning curve | Easier | Steeper |

