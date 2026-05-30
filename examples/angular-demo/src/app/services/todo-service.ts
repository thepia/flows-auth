import { Injectable, signal } from '@angular/core';

export interface ToDo {
  id: number;
  title: string;
  completed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  todos = signal<ToDo[]>([]);

  addTodo(title: string) {
    this.todos.update((todos) => [...todos, { id: Date.now(), title, completed: false }]);
  }

  removeTodo(id: number) {
    this.todos.update((todos) => todos.filter((t) => t.id !== id));
  }

  toggleTodo(id: number) {
    this.todos.update((todos) =>
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }
}
