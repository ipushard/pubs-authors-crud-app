import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageEmployeeEditDialog } from './manage-employee-edit-dialog';

describe('ManageEmployeeEditDialog', () => {
  let component: ManageEmployeeEditDialog;
  let fixture: ComponentFixture<ManageEmployeeEditDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageEmployeeEditDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ManageEmployeeEditDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
