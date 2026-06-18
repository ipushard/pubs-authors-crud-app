import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

import { AdminEmployeeService } from '../services/admin-employee';
import { EmployeeInviteRequest, Job, Publisher } from '../models/admin-employee';

@Component({
  selector: 'app-manage-employee-create',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule
  ],
  templateUrl: './manage-employee-create.html',
  styleUrl: './manage-employee-create.css'
})
export class ManageEmployeeCreate implements OnInit {

  jobs: Job[] = [];

  publishers: Publisher[] = [];

  newEmployee: EmployeeInviteRequest = {
    emp_id: '',
    fname: '',
    minit: null,
    lname: '',
    email: '',
    job_id: 1,
    job_lvl: 10,
    pub_id: ''
  };

  errorMessage = '';

  successMessage = '';

  inviteLink = '';

  isLoading = false;

  submitted = false;

  constructor(
    private adminEmployeeService: AdminEmployeeService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDropdownData();
  }

  loadDropdownData(): void {
    this.adminEmployeeService.getJobs().subscribe({
      next: (data) => {
        this.jobs = data;

        const defaultJob = this.jobs.find(job => job.job_desc === 'New Hire - Job not specified');

        if (defaultJob) {
          this.newEmployee.job_id = defaultJob.job_id;
          this.newEmployee.job_lvl = defaultJob.min_lvl;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading jobs:', err);
        this.errorMessage = 'Could not load jobs.';
        this.cdr.detectChanges();
      }
    });

    this.adminEmployeeService.getPublishers().subscribe({
      next: (data) => {
        this.publishers = data;

        if (this.publishers.length > 0) {
          this.newEmployee.pub_id = this.publishers[0].pub_id;
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading publishers:', err);
        this.errorMessage = 'Could not load publishers.';
        this.cdr.detectChanges();
      }
    });
  }

  onJobChange(): void {
    const selectedJob = this.jobs.find(job => job.job_id === Number(this.newEmployee.job_id));

    if (!selectedJob) {
      return;
    }

    this.newEmployee.job_lvl = selectedJob.min_lvl;
    this.cdr.detectChanges();
  }

  saveEmployee(form: NgForm): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.inviteLink = '';

    if (form.invalid) {
      this.cdr.detectChanges();
      return;
    }

    const validationError = this.validateEmployee();

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;

    this.adminEmployeeService.inviteEmployee(this.newEmployee).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message;
        this.inviteLink = response.inviteLink || '';

        this.resetForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error inviting employee:', err);

        this.isLoading = false;

        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to backend API. Make sure the Node server is running.';
        } else {
          this.errorMessage =
            err.error?.error ||
            err.error?.message ||
            'Could not create employee invite.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  private validateEmployee(): string {
    const empIdPattern = /^([A-Z]{3}|[A-Z]-[A-Z])[0-9]{5}[MF]$/i;

    const cleanEmpId = this.newEmployee.emp_id.trim().toUpperCase();

    if (!cleanEmpId) {
      return 'Employee ID is required.';
    }

    if (!empIdPattern.test(cleanEmpId)) {
      return 'Employee ID must match the Pubs database rule. Use format like MBR99828M or M-B99828M.';
    }

    if (!this.newEmployee.fname.trim()) {
      return 'First name is required.';
    }

    if (!this.newEmployee.lname.trim()) {
      return 'Last name is required.';
    }

    if (!this.newEmployee.email.trim()) {
      return 'Email is required.';
    }

    this.newEmployee.emp_id = cleanEmpId;

    return '';
  }

  private resetForm(): void {
    const defaultJob = this.jobs.find(job => job.job_desc === 'New Hire - Job not specified');

    this.newEmployee = {
      emp_id: '',
      fname: '',
      minit: null,
      lname: '',
      email: '',
      job_id: defaultJob ? defaultJob.job_id : 1,
      job_lvl: defaultJob ? defaultJob.min_lvl : 10,
      pub_id: this.publishers.length > 0 ? this.publishers[0].pub_id : ''
    };

    this.submitted = false;
  }

  goBack(): void {
    this.router.navigate(['/manage-employees']);
  }
}