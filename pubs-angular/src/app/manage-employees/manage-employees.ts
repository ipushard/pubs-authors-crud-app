import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AdminEmployeeService } from '../services/admin-employee';
import { AdminEmployee, EmployeeUpdateRequest, Job, Publisher } from '../models/admin-employee';
import { ManageEmployeeEditDialog } from '../manage-employee-edit-dialog/manage-employee-edit-dialog';

@Component({
  selector: 'app-manage-employees',
  imports: [
    FormsModule,
    DatePipe,
    TitleCasePipe,
    MatDialogModule
  ],
  templateUrl: './manage-employees.html',
  styleUrl: './manage-employees.css'
})
export class ManageEmployees implements OnInit {

  // store all employees/users from database
  employees: AdminEmployee[] = [];

  // filtered employees after search/filter/sort
  filteredEmployees: AdminEmployee[] = [];

  // employees shown on current page
  pagedEmployees: AdminEmployee[] = [];

  // jobs and publishers used for edit dialog dropdowns
  jobs: Job[] = [];

  publishers: Publisher[] = [];

  searchTerm = '';

  selectedAccountStatus = 'all';

  selectedPosition = 'all';

  selectedSort = 'lastNameAsc';

  availablePositions: string[] = [];

  showFilters = false;

  errorMessage = '';

  successMessage = '';

  isLoading = false;

  isSaving = false;

  // dashboard numbers
  totalEmployees = 0;

  appUsers = 0;

  pendingInvites = 0;

  activeAccounts = 0;

  adminUsers = 0;

  employeesWithoutLogin = 0;

  // pagination variables
  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;

  constructor(
    private adminEmployeeService: AdminEmployeeService,
    private router: Router,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadDropdownData();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminEmployeeService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;

        this.setDashboardNumbers();

        this.availablePositions = [
          ...new Set(
            data
              .map(employee => employee.job_desc)
              .filter((position): position is string => !!position)
          )
        ].sort();

        this.applyFiltersAndSort();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading employees:', err);

        this.errorMessage = 'Could not load employees. Make sure the backend server is running.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDropdownData(): void {
    this.adminEmployeeService.getJobs().subscribe({
      next: (data) => {
        this.jobs = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading jobs:', err);
        this.errorMessage = 'Could not load jobs for employee editing.';
        this.cdr.detectChanges();
      }
    });

    this.adminEmployeeService.getPublishers().subscribe({
      next: (data) => {
        this.publishers = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading publishers:', err);
        this.errorMessage = 'Could not load publishers for employee editing.';
        this.cdr.detectChanges();
      }
    });
  }

  // this sets dashboard card numbers on top of page
  private setDashboardNumbers(): void {
    this.totalEmployees = this.employees.length;

    this.appUsers = this.employees.filter(employee => employee.user_id !== null).length;

    this.pendingInvites = this.employees.filter(employee =>
      employee.user_id !== null &&
      !this.toBoolean(employee.password_set)
    ).length;

    this.activeAccounts = this.employees.filter(employee =>
      this.toBoolean(employee.is_active)
    ).length;

    this.adminUsers = this.employees.filter(employee =>
      this.toBoolean(employee.is_admin)
    ).length;

    this.employeesWithoutLogin = this.employees.filter(employee =>
      employee.user_id === null
    ).length;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.detectChanges();
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  applyFiltersAndSort(): void {
    const term = this.searchTerm.toLowerCase().trim();

    let result = [...this.employees];

    if (term) {
      result = result.filter(employee =>
        employee.emp_id.toLowerCase().includes(term) ||
        employee.fname.toLowerCase().includes(term) ||
        employee.lname.toLowerCase().includes(term) ||
        (employee.email ?? '').toLowerCase().includes(term) ||
        employee.job_desc.toLowerCase().includes(term) ||
        employee.pub_name.toLowerCase().includes(term) ||
        employee.pub_id.toLowerCase().includes(term)
      );
    }

    if (this.selectedAccountStatus === 'appUser') {
      result = result.filter(employee => employee.user_id !== null);
    }

    if (this.selectedAccountStatus === 'noLogin') {
      result = result.filter(employee => employee.user_id === null);
    }

    if (this.selectedAccountStatus === 'pending') {
      result = result.filter(employee =>
        employee.user_id !== null &&
        !this.toBoolean(employee.password_set)
      );
    }

    if (this.selectedAccountStatus === 'active') {
      result = result.filter(employee =>
        this.toBoolean(employee.is_active)
      );
    }

    if (this.selectedAccountStatus === 'admin') {
      result = result.filter(employee =>
        this.toBoolean(employee.is_admin)
      );
    }

    if (this.selectedPosition !== 'all') {
      result = result.filter(employee =>
        employee.job_desc === this.selectedPosition
      );
    }

    result.sort((a, b) => this.sortEmployees(a, b));

    this.filteredEmployees = result;

    this.currentPage = 1;

    this.updatePagedEmployees();

    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.clearSuccessMessage();

    this.searchTerm = '';
    this.selectedAccountStatus = 'all';
    this.selectedPosition = 'all';
    this.selectedSort = 'lastNameAsc';
    this.currentPage = 1;

    this.applyFiltersAndSort();
  }

  private sortEmployees(a: AdminEmployee, b: AdminEmployee): number {
    switch (this.selectedSort) {
      case 'lastNameAsc':
        return this.compareText(a.lname, b.lname);

      case 'lastNameDesc':
        return this.compareText(b.lname, a.lname);

      case 'firstNameAsc':
        return this.compareText(a.fname, b.fname);

      case 'firstNameDesc':
        return this.compareText(b.fname, a.fname);

      case 'positionAsc':
        return this.compareText(a.job_desc, b.job_desc);

      case 'positionDesc':
        return this.compareText(b.job_desc, a.job_desc);

      case 'publisherAsc':
        return this.compareText(a.pub_name, b.pub_name);

      case 'publisherDesc':
        return this.compareText(b.pub_name, a.pub_name);

      case 'hireDateNewest':
        return new Date(b.hire_date).getTime() - new Date(a.hire_date).getTime();

      case 'hireDateOldest':
        return new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();

      default:
        return this.compareText(a.lname, b.lname);
    }
  }

  private compareText(a: string, b: string): number {
    return a.localeCompare(b);
  }

  updatePagedEmployees(): void {
    this.totalPages = Math.ceil(this.filteredEmployees.length / this.pageSize);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedEmployees = this.filteredEmployees.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagedEmployees();
    this.cdr.detectChanges();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagedEmployees();
    this.cdr.detectChanges();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];

    for (let page = 1; page <= this.totalPages; page++) {
      pages.push(page);
    }

    return pages;
  }

  getStartRecordNumber(): number {
    if (this.filteredEmployees.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    return Math.min(end, this.filteredEmployees.length);
  }

  getFullName(employee: AdminEmployee): string {
    if (employee.minit) {
      return `${employee.fname} ${employee.minit}. ${employee.lname}`;
    }

    return `${employee.fname} ${employee.lname}`;
  }

  getAccountStatus(employee: AdminEmployee): string {
    if (employee.user_id === null) {
      return 'No Login';
    }

    if (!this.toBoolean(employee.password_set)) {
      return 'Invite Pending';
    }

    if (!this.toBoolean(employee.is_active)) {
      return 'Inactive';
    }

    return 'Active';
  }

  getAccountStatusClass(employee: AdminEmployee): string {
    const status = this.getAccountStatus(employee);

    if (status === 'Active') {
      return 'status-active';
    }

    if (status === 'Invite Pending') {
      return 'status-pending';
    }

    if (status === 'Inactive') {
      return 'status-inactive';
    }

    return 'status-no-login';
  }

  getYesNo(value: boolean | number | null): string {
    return this.toBoolean(value) ? 'Yes' : 'No';
  }

  private toBoolean(value: boolean | number | null): boolean {
    return value === true || value === 1;
  }

  openEditDialog(employee: AdminEmployee): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.jobs.length === 0 || this.publishers.length === 0) {
      this.errorMessage = 'Jobs and publishers are still loading. Please try again in a moment.';
      this.cdr.detectChanges();
      return;
    }

    const dialogRef = this.dialog.open(ManageEmployeeEditDialog, {
      width: '820px',
      maxWidth: '95vw',
      panelClass: 'employee-edit-dialog-panel',
      disableClose: true,
      data: {
        employee: employee,
        jobs: this.jobs,
        publishers: this.publishers
      }
    });

    dialogRef.afterClosed().subscribe((updateData: EmployeeUpdateRequest | null) => {
      if (!updateData) {
        return;
      }

      this.updateEmployee(employee.emp_id, updateData);
    });
  }

  updateEmployee(empId: string, updateData: EmployeeUpdateRequest): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminEmployeeService.updateEmployee(empId, updateData).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.successMessage = response.message;

        this.loadEmployees();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating employee:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not update employee user settings.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteEmployee(employee: AdminEmployee): void {
    this.errorMessage = '';
    this.successMessage = '';

    const confirmed = confirm(
      `Are you sure you want to delete ${this.getFullName(employee)} (${employee.emp_id})?\n\nThis will delete the app user account and employee record.`
    );

    if (!confirmed) {
      return;
    }

    this.isSaving = true;

    this.adminEmployeeService.deleteEmployee(employee.emp_id).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.successMessage = response.message;

        this.loadEmployees();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting employee:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not delete employee user.';

        this.cdr.detectChanges();
      }
    });
  }

  goToCreateEmployee(): void {
    this.router.navigate(['/manage-employees/new']);
  }
}