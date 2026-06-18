import { TestBed } from '@angular/core/testing';

import { AdminEmployee } from './admin-employee';

describe('AdminEmployee', () => {
  let service: AdminEmployee;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AdminEmployee);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
