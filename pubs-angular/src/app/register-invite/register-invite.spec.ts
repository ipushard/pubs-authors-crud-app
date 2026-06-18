import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterInvite } from './register-invite';

describe('RegisterInvite', () => {
  let component: RegisterInvite;
  let fixture: ComponentFixture<RegisterInvite>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterInvite],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterInvite);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
