import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { TodoService } from '../../services/todo-service';

@Component({
  selector: 'todo-list',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './todo-component.html',
  styleUrl: './todo-component.css'
})
export class TodoComponent {
  todoService = inject(TodoService);
  count = computed(() => this.todoService.todos().length);
  completed = computed(() => this.todoService.todos().filter((t) => t.completed).length);

  constructor() {
    effect(() => {
      const todos = this.todoService.todos();
      console.log('Todos changed:', todos);
    });
  }

  addTodo(event: Event) {
    const input = event.target as HTMLInputElement;
    this.todoService.addTodo(input.value);
    input.value = '';
  }
}
