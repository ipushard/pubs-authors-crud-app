import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AdminEmployeeService } from '../services/admin-employee';
import { AdminEmployee, EmployeeUpdateRequest, Job, Publisher } from '../models/admin-employee';
import { ManageEmployeeEditDialog } from '../manage-employee-edit-dialog/manage-employee-edit-dialog';

@Component({
  selector: 'app-manage-employees',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    TitleCasePipe,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './manage-employees.html',
  styleUrl: './manage-employees.css'
})
export class ManageEmployees implements OnInit {

  // this stores all employees/users coming from the database
  employees: AdminEmployee[] = [];

  // this is after search/filter/sort is applied
  filteredEmployees: AdminEmployee[] = [];

  // this is only the records showing on the current page
  pagedEmployees: AdminEmployee[] = [];



  // jobs and publishers are used inside edit popup dropdowns
  jobs: Job[] = [];

  publishers: Publisher[] = [];



  // filter and sort variables
  searchTerm = '';

  selectedAccountStatus = 'all';

  selectedPosition = 'all';

  selectedSort = 'lastNameAsc';

  availablePositions: string[] = [];

  showFilters = false;



  // these are used to show messages on the page
  errorMessage = '';

  successMessage = '';

  isLoading = false;

  isSaving = false;



  // dashboard cards numbers
  totalEmployees = 0;

  appUsers = 0;

  pendingInvites = 0;

  activeAccounts = 0;

  adminUsers = 0;

  employeesWithoutLogin = 0;



  // pagination stuff
  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;



  // this is for our custom fancy delete popup
  // we use this instead of ugly browser confirm
  showConfirmModal = false;

  // this remembers what employee user clicked delete on
  selectedEmployeeForDelete: AdminEmployee | null = null;



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



  // load employees/users from backend api
  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminEmployeeService.getEmployees().subscribe({
      next: (data) => {
        this.employees = data;

        this.setDashboardNumbers();

        // this builds position dropdown list without duplicates
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



  // loading jobs and publishers for edit dialog dropdowns
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



  // this sets the small dashboard card numbers
  private setDashboardNumbers(): void {
    this.totalEmployees = this.employees.length;

    this.appUsers = this.employees.filter(employee =>
      employee.user_id !== null
    ).length;

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



  // open/close filter box
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.detectChanges();
  }



  // clears green success message when user does new action
  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.detectChanges();
  }



  // main search/filter/sort method
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



  // sorting logic for table
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



  // this updates what records show on page 1,2,3 etc
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



  // formats full name nice in table and popup
  getFullName(employee: AdminEmployee): string {
    if (employee.minit) {
      return `${employee.fname} ${employee.minit}. ${employee.lname}`;
    }

    return `${employee.fname} ${employee.lname}`;
  }



  // checks what account status text should show
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



  // css class for account badge colors
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



  // sql bit comes as true/false or 1/0 sometimes so this handles both
  private toBoolean(value: boolean | number | null): boolean {
    return value === true || value === 1;
  }



  // opens material edit popup
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

   dialogRef.afterClosed().subscribe((result: any) => {
  if (!result) {
    return;
  }

  // this means the dialog enabled a login account and we only need to reload the table
  if (result.refreshEmployees === true) {
    this.successMessage = result.message || 'Employee account updated successfully.';
    this.loadEmployees();
    this.cdr.detectChanges();
    return;
  }

  // normal employee edit save
  const updateData: EmployeeUpdateRequest = result;

  this.updateEmployee(employee.emp_id, updateData);
});
  }



  // sends update request after edit popup closes
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



  // this opens our custom fancy delete popup
  // no more ugly browser confirm here
  deleteEmployee(employee: AdminEmployee): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.selectedEmployeeForDelete = employee;
    this.showConfirmModal = true;

    this.cdr.detectChanges();
  }



  // closes custom popup
  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.selectedEmployeeForDelete = null;

    this.cdr.detectChanges();
  }



  // popup title
  getDeleteConfirmTitle(): string {
    return 'Delete Employee User?';
  }



  // popup message
  getDeleteConfirmMessage(): string {
    if (!this.selectedEmployeeForDelete) {
      return '';
    }

    return 'This will permanently delete the app user account and employee record. This action cannot be undone.';
  }



  getSelectedEmployeeName(): string {
    if (!this.selectedEmployeeForDelete) {
      return '';
    }

    return this.getFullName(this.selectedEmployeeForDelete);
  }



  getSelectedEmployeeId(): string {
    if (!this.selectedEmployeeForDelete) {
      return '';
    }

    return this.selectedEmployeeForDelete.emp_id;
  }



  // this runs only after user clicks delete inside our nice popup
  confirmDeleteEmployee(): void {
    if (!this.selectedEmployeeForDelete) {
      return;
    }

    const employeeToDelete = this.selectedEmployeeForDelete;
    const employeeName = this.getFullName(employeeToDelete);
    const employeeId = employeeToDelete.emp_id;

    this.showConfirmModal = false;
    this.selectedEmployeeForDelete = null;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminEmployeeService.deleteEmployee(employeeId).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.successMessage =
          response.message ||
          `Employee ${employeeName} (${employeeId}) deleted successfully.`;

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



  // goes to create employee page
  goToCreateEmployee(): void {
    this.router.navigate(['/manage-employees/new']);
  }
}