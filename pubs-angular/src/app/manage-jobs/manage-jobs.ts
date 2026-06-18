import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AdminJobService } from '../services/admin-job';
import { AdminJob, JobCreateRequest, JobUpdateRequest } from '../models/admin-job';

@Component({
  selector: 'app-manage-jobs',
  imports: [
    FormsModule
  ],
  templateUrl: './manage-jobs.html',
  styleUrl: './manage-jobs.css'
})
export class ManageJobs implements OnInit {

  // store all jobs from database
  jobs: AdminJob[] = [];

  // filtered jobs after search/filter/sort
  filteredJobs: AdminJob[] = [];

  // jobs shown on current page
  pagedJobs: AdminJob[] = [];

  searchTerm = '';

  selectedSort = 'idAsc';

  showFilters = false;

  errorMessage = '';

  successMessage = '';

  isLoading = false;

  isSaving = false;

  showJobForm = false;

  isEditMode = false;

  editingJobId: number | null = null;

  formJobDesc = '';

  formMinLevel: number | null = null;

  formMaxLevel: number | null = null;

  // dashboard numbers
  totalJobs = 0;

  lowestMinLevel = 0;

  highestMaxLevel = 0;

  averageLevelRange = 0;

  // pagination variables
  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;

  constructor(
    private adminJobService: AdminJobService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(clearMessages: boolean = true): void {
  this.isLoading = true;

  if (clearMessages) {
    this.errorMessage = '';
    this.successMessage = '';
  } else {
    this.errorMessage = '';
  }

  this.adminJobService.getJobs().subscribe({
    next: (data) => {
      this.jobs = data;

      this.setDashboardNumbers();
      this.applyFiltersAndSort();

      this.isLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error loading jobs:', err);

      this.errorMessage = 'Could not load jobs. Make sure the backend server is running and your account has admin access.';
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  });
}

  // this sets dashboard card numbers on top of page
  private setDashboardNumbers(): void {
    this.totalJobs = this.jobs.length;

    if (this.jobs.length === 0) {
      this.lowestMinLevel = 0;
      this.highestMaxLevel = 0;
      this.averageLevelRange = 0;
      return;
    }

    this.lowestMinLevel = Math.min(...this.jobs.map(job => Number(job.min_lvl)));
    this.highestMaxLevel = Math.max(...this.jobs.map(job => Number(job.max_lvl)));

    const totalRange = this.jobs.reduce((sum, job) => {
      return sum + (Number(job.max_lvl) - Number(job.min_lvl));
    }, 0);

    this.averageLevelRange = Math.round(totalRange / this.jobs.length);
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

    let result = [...this.jobs];

    if (term) {
      result = result.filter(job =>
        String(job.job_id).includes(term) ||
        job.job_desc.toLowerCase().includes(term) ||
        String(job.min_lvl).includes(term) ||
        String(job.max_lvl).includes(term)
      );
    }

    result.sort((a, b) => this.sortJobs(a, b));

    this.filteredJobs = result;

    this.currentPage = 1;

    this.updatePagedJobs();

    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.clearSuccessMessage();

    this.searchTerm = '';
    this.selectedSort = 'idAsc';
    this.currentPage = 1;

    this.applyFiltersAndSort();
  }

  private sortJobs(a: AdminJob, b: AdminJob): number {
    switch (this.selectedSort) {
      case 'idAsc':
        return Number(a.job_id) - Number(b.job_id);

      case 'idDesc':
        return Number(b.job_id) - Number(a.job_id);

      case 'descriptionAsc':
        return this.compareText(a.job_desc, b.job_desc);

      case 'descriptionDesc':
        return this.compareText(b.job_desc, a.job_desc);

      case 'minLevelAsc':
        return Number(a.min_lvl) - Number(b.min_lvl);

      case 'minLevelDesc':
        return Number(b.min_lvl) - Number(a.min_lvl);

      case 'maxLevelAsc':
        return Number(a.max_lvl) - Number(b.max_lvl);

      case 'maxLevelDesc':
        return Number(b.max_lvl) - Number(a.max_lvl);

      default:
        return Number(a.job_id) - Number(b.job_id);
    }
  }

  private compareText(a: string, b: string): number {
    return a.localeCompare(b);
  }

  updatePagedJobs(): void {
    this.totalPages = Math.ceil(this.filteredJobs.length / this.pageSize);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedJobs = this.filteredJobs.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagedJobs();
    this.cdr.detectChanges();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagedJobs();
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
    if (this.filteredJobs.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    return Math.min(end, this.filteredJobs.length);
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showJobForm = true;
    this.isEditMode = false;
    this.editingJobId = null;

    this.formJobDesc = '';
    this.formMinLevel = null;
    this.formMaxLevel = null;

    this.cdr.detectChanges();
  }

  openEditForm(job: AdminJob): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showJobForm = true;
    this.isEditMode = true;
    this.editingJobId = job.job_id;

    this.formJobDesc = job.job_desc;
    this.formMinLevel = Number(job.min_lvl);
    this.formMaxLevel = Number(job.max_lvl);

    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showJobForm = false;
    this.isEditMode = false;
    this.editingJobId = null;

    this.formJobDesc = '';
    this.formMinLevel = null;
    this.formMaxLevel = null;

    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  saveJob(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const validationError = this.validateJobForm();

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    const jobData: JobCreateRequest | JobUpdateRequest = {
      job_desc: this.formJobDesc.trim(),
      min_lvl: Number(this.formMinLevel),
      max_lvl: Number(this.formMaxLevel)
    };

    if (this.isEditMode && this.editingJobId !== null) {
      this.updateJob(this.editingJobId, jobData);
      return;
    }

    this.createJob(jobData);
  }

  private validateJobForm(): string {
    if (!this.formJobDesc || !this.formJobDesc.trim()) {
      return 'Job description is required.';
    }

    if (this.formJobDesc.trim().length > 50) {
      return 'Job description cannot be longer than 50 characters.';
    }

    if (this.formMinLevel === null || this.formMinLevel === undefined) {
      return 'Minimum level is required.';
    }

    if (this.formMaxLevel === null || this.formMaxLevel === undefined) {
      return 'Maximum level is required.';
    }

    const minLevel = Number(this.formMinLevel);
    const maxLevel = Number(this.formMaxLevel);

    if (!Number.isInteger(minLevel) || !Number.isInteger(maxLevel)) {
      return 'Minimum and maximum levels must be whole numbers.';
    }

    if (minLevel < 1 || minLevel > 255 || maxLevel < 1 || maxLevel > 255) {
      return 'Job levels must be between 1 and 255.';
    }

    if (minLevel > maxLevel) {
      return 'Minimum level cannot be greater than maximum level.';
    }

    return '';
  }

  createJob(jobData: JobCreateRequest): void {
  this.isSaving = true;

  this.adminJobService.createJob(jobData).subscribe({
    next: (response) => {
      this.isSaving = false;

      this.cancelForm();

      this.successMessage = response.message;

      this.loadJobs(false);

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error creating job:', err);

      this.isSaving = false;

      this.errorMessage =
        err.error?.error ||
        err.error?.message ||
        'Could not create job.';

      this.cdr.detectChanges();
    }
  });
}

  updateJob(jobId: number, jobData: JobUpdateRequest): void {
  this.isSaving = true;

  this.adminJobService.updateJob(jobId, jobData).subscribe({
    next: (response) => {
      this.isSaving = false;

      this.cancelForm();

      this.successMessage = response.message;

      this.loadJobs(false);

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error updating job:', err);

      this.isSaving = false;

      this.errorMessage =
        err.error?.error ||
        err.error?.message ||
        'Could not update job.';

      this.cdr.detectChanges();
    }
  });
}

  deleteJob(job: AdminJob): void {
  this.errorMessage = '';
  this.successMessage = '';

  const confirmed = confirm(
    `Are you sure you want to delete this job?\n\n${job.job_desc} (${job.job_id})\n\nIf employees are assigned to this job, the system will block the delete.`
  );

  if (!confirmed) {
    return;
  }

  this.isSaving = true;

  this.adminJobService.deleteJob(job.job_id).subscribe({
    next: (response) => {
      this.isSaving = false;

      this.successMessage = response.message;

      this.loadJobs(false);

      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Error deleting job:', err);

      this.isSaving = false;

      this.errorMessage =
        err.error?.error ||
        err.error?.message ||
        'Could not delete job.';

      this.cdr.detectChanges();
    }
  });
}
}