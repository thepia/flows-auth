import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Greeter } from './greeter';

describe('Greeter', () => {
  let component: Greeter;
  let fixture: ComponentFixture<Greeter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Greeter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Greeter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
