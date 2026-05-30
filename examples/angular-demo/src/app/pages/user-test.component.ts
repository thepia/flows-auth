import { Component, type OnInit } from '@angular/core';
import { TodoComponent } from '../components/todo-component/todo-component';
import { UserListComponent } from '../components/user-list-component/user-list-component';

@Component({
  selector: 'app-user-test',
  standalone: true,
  imports: [UserListComponent, TodoComponent],
  template: `
    <div class="user-test-container">
      <user-list></user-list>
    </div>

    <todo-list></todo-list>
  `
})
export class UserTestPage implements OnInit {
  ngOnInit() {
    console.log('init page');
  }
}
