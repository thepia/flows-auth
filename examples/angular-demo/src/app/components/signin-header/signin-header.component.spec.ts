import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SigninHeaderComponent } from './signin-header.component';

describe('SigninHeaderComponent', () => {
  let component: SigninHeaderComponent;
  let fixture: ComponentFixture<SigninHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SigninHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SigninHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
