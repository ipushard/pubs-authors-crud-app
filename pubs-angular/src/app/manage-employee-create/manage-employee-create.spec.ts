import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageEmployeeCreate } from './manage-employee-create';

describe('ManageEmployeeCreate', () => {
  let component: ManageEmployeeCreate;
  let fixture: ComponentFixture<ManageEmployeeCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageEmployeeCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageEmployeeCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
