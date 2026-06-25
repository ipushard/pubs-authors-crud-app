import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AdminEmployeeService } from '../services/admin-employee';

import {
  AdminEmployee,
  EmployeeUpdateRequest,
  Job,
  Publisher
} from '../models/admin-employee';

export interface ManageEmployeeEditDialogData {
  employee: AdminEmployee;
  jobs: Job[];
  publishers: Publisher[];
}

@Component({
  selector: 'app-manage-employee-edit-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatSlideToggleModule
  ],
  templateUrl: './manage-employee-edit-dialog.html',
  styleUrl: './manage-employee-edit-dialog.css'
})
export class ManageEmployeeEditDialog {

  employee: AdminEmployee;

  jobs: Job[] = [];

  publishers: Publisher[] = [];

  errorMessage = '';

  successMessage = '';



  // enable account form inside edit popup
  showEnableAccountForm = false;

  enableAccountEmail = '';

  isSendingInvite = false;



  currentUserEmpId = '';

  currentUserEmail = '';

  originalIsAdmin = false;

  originalIsActive = false;



  constructor(
    private dialogRef: MatDialogRef<ManageEmployeeEditDialog>,
    private adminEmployeeService: AdminEmployeeService,
    @Inject(MAT_DIALOG_DATA) public data: ManageEmployeeEditDialogData
  ) {
    this.employee = { ...data.employee };

    this.jobs = data.jobs.map(job => ({
      ...job,
      job_id: Number(job.job_id),
      min_lvl: Number(job.min_lvl),
      max_lvl: Number(job.max_lvl)
    }));

    this.publishers = data.publishers;

    this.employee.job_id = Number(this.employee.job_id);
    this.employee.job_lvl = Number(this.employee.job_lvl);

    this.employee.is_admin = this.toBoolean(this.employee.is_admin);
    this.employee.is_active = this.toBoolean(this.employee.is_active);

    this.originalIsAdmin = this.toBoolean(this.employee.is_admin);
    this.originalIsActive = this.toBoolean(this.employee.is_active);

    this.loadLoggedInUserFromLocalStorage();

    console.log('Dialog employee:', this.employee);
    console.log('Dialog jobs:', this.jobs);
    console.log('Current logged in employee id:', this.currentUserEmpId);
    console.log('Current logged in email:', this.currentUserEmail);
  }



  onJobChange(): void {
    this.employee.job_id = Number(this.employee.job_id);

    const selectedJob = this.findSelectedJob();

    if (!selectedJob) {
      console.log('Job not found on change. Selected job_id:', this.employee.job_id);
      console.log('Available jobs:', this.jobs);
      return;
    }

    this.employee.job_lvl = selectedJob.min_lvl;
  }



  saveChanges(): void {
    console.log('Save Changes clicked');

    this.errorMessage = '';
    this.successMessage = '';

    this.employee.job_id = Number(this.employee.job_id);
    this.employee.job_lvl = Number(this.employee.job_lvl);

    const validationError = this.validateEmployee();

    if (validationError) {
      this.errorMessage = validationError;
      console.log('Validation stopped save:', validationError);
      return;
    }

    const requestedIsAdmin = this.toBoolean(this.employee.is_admin);
    const requestedIsActive = this.toBoolean(this.employee.is_active);

    if (this.isEditingOwnAccount() && this.originalIsAdmin && !requestedIsAdmin) {
      this.employee.is_admin = true;

      this.errorMessage =
        'You cannot remove your own admin access. Another administrator must change your admin permissions.';

      return;
    }

    if (this.isEditingOwnAccount() && this.originalIsActive && !requestedIsActive) {
      this.employee.is_active = true;

      this.errorMessage =
        'You cannot deactivate your own account. Another administrator must deactivate your account.';

      return;
    }

    const updateData: EmployeeUpdateRequest = {
      fname: this.employee.fname.trim(),
      minit: this.employee.minit ? this.employee.minit.trim().toUpperCase() : null,
      lname: this.employee.lname.trim(),
      job_id: Number(this.employee.job_id),
      job_lvl: Number(this.employee.job_lvl),
      pub_id: this.employee.pub_id,
      is_admin: requestedIsAdmin,
      is_active: requestedIsActive
    };

    console.log('Dialog returning update data:', updateData);

    this.dialogRef.close(updateData);
  }



  cancel(): void {
    this.dialogRef.close(null);
  }



  // opens the enable login account mini form
  openEnableAccountForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.hasAppAccount()) {
      this.errorMessage = 'This employee already has a login account.';
      return;
    }

    this.enableAccountEmail = this.employee.email || '';
    this.showEnableAccountForm = true;
  }



  // closes enable login account mini form
  cancelEnableAccountForm(): void {
    this.showEnableAccountForm = false;
    this.enableAccountEmail = '';
    this.errorMessage = '';
  }



  // sends invite for existing employee
  sendEnableAccountInvite(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.hasAppAccount()) {
      this.errorMessage = 'This employee already has a login account.';
      return;
    }

    const cleanEmail = this.enableAccountEmail.trim().toLowerCase();

    if (!cleanEmail) {
      this.errorMessage = 'Email is required to enable login account.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.errorMessage = 'Enter a valid email address.';
      return;
    }

    this.isSendingInvite = true;

    this.adminEmployeeService.enableEmployeeAccount(this.employee.emp_id, cleanEmail).subscribe({
      next: (response) => {
        this.isSendingInvite = false;

        this.dialogRef.close({
          refreshEmployees: true,
          message: response.message || `Login account invite sent to ${cleanEmail}.`
        });
      },
      error: (err) => {
        console.error('Enable account invite error:', err);

        this.isSendingInvite = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not enable login account for this employee.';
      }
    });
  }



  private validateEmployee(): string {
    if (!this.employee.fname || !this.employee.fname.trim()) {
      return 'First name is required.';
    }

    if (!this.employee.lname || !this.employee.lname.trim()) {
      return 'Last name is required.';
    }

    if (!this.employee.job_id) {
      return 'Position is required.';
    }

    if (!this.employee.job_lvl) {
      return 'Job level is required.';
    }

    if (!this.employee.pub_id) {
      return 'Publisher is required.';
    }

    const selectedJob = this.findSelectedJob();

    if (!selectedJob) {
      console.log('Selected job does not exist.');
      console.log('Selected employee job_id:', this.employee.job_id);
      console.log('Available job ids:', this.jobs.map(job => job.job_id));

      return 'Selected job does not exist.';
    }

    if (Number(this.employee.job_lvl) < selectedJob.min_lvl || Number(this.employee.job_lvl) > selectedJob.max_lvl) {
      return `Job level must be between ${selectedJob.min_lvl} and ${selectedJob.max_lvl} for ${selectedJob.job_desc}.`;
    }

    return '';
  }



  private findSelectedJob(): Job | undefined {
    return this.jobs.find(job =>
      Number(job.job_id) === Number(this.employee.job_id)
    );
  }



  private toBoolean(value: boolean | number | null): boolean {
    return value === true || value === 1;
  }



  hasAppAccount(): boolean {
    return this.employee.user_id !== null;
  }



  isEditingOwnAccount(): boolean {
    const employeeEmpId = this.employee.emp_id ? this.employee.emp_id.trim() : '';
    const employeeEmail = this.employee.email ? this.employee.email.trim().toLowerCase() : '';

    if (this.currentUserEmpId && employeeEmpId && this.currentUserEmpId === employeeEmpId) {
      return true;
    }

    if (this.currentUserEmail && employeeEmail && this.currentUserEmail === employeeEmail) {
      return true;
    }

    return false;
  }



  private loadLoggedInUserFromLocalStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const possibleUserKeys = [
      'user',
      'currentUser',
      'loggedInUser'
    ];

    for (const key of possibleUserKeys) {
      const storedUser = window.localStorage.getItem(key);

      if (!storedUser) {
        continue;
      }

      try {
        const parsedUser = JSON.parse(storedUser);

        if (parsedUser?.emp_id) {
          this.currentUserEmpId = String(parsedUser.emp_id).trim();
        }

        if (parsedUser?.email) {
          this.currentUserEmail = String(parsedUser.email).trim().toLowerCase();
        }

        if (this.currentUserEmpId || this.currentUserEmail) {
          return;
        }

      } catch (err) {
        console.log('Could not read logged in user from local storage:', err);
      }
    }
  }
}