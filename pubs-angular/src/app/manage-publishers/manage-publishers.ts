import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatIconModule } from '@angular/material/icon';

import { AdminPublisherService } from '../services/admin-publisher';
import {
  AdminPublisher,
  PublisherCreateRequest,
  PublisherUpdateRequest
} from '../models/admin-publisher';

@Component({
  selector: 'app-manage-publishers',
  imports: [
    FormsModule,
    MatIconModule
  ],
  templateUrl: './manage-publishers.html',
  styleUrl: './manage-publishers.css'
})
export class ManagePublishers implements OnInit {

  // store all publishers from database
  publishers: AdminPublisher[] = [];

  // filtered publishers after search/filter/sort
  filteredPublishers: AdminPublisher[] = [];

  // publishers shown on current page
  pagedPublishers: AdminPublisher[] = [];



  // filter and sort vars
  searchTerm = '';

  selectedSort = 'nameAsc';

  showFilters = false;



  // messages and loading vars
  errorMessage = '';

  successMessage = '';

  isLoading = false;

  isSaving = false;



  // form vars
  showPublisherForm = false;

  isEditMode = false;

  editingPubId: string | null = null;

  formPubId = '';

  formPubName = '';

  formCity = '';

  formState = '';

  formCountry = '';



  // dashboard numbers
  totalPublishers = 0;

  publishersWithCity = 0;

  publishersWithState = 0;

  publishersWithCountry = 0;



  // pagination variables
  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;



  // this is for our custom delete popup
  // no more ugly browser confirm for publishers
  showConfirmModal = false;

  // this remembers what publisher user clicked delete on
  selectedPublisherForDelete: AdminPublisher | null = null;



  constructor(
    private adminPublisherService: AdminPublisherService,
    private cdr: ChangeDetectorRef
  ) {}



  ngOnInit(): void {
    this.loadPublishers();
  }



  // load publishers from backend api
  loadPublishers(clearMessages: boolean = true): void {
    this.isLoading = true;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }

    this.adminPublisherService.getPublishers().subscribe({
      next: (data) => {
        this.publishers = data;

        this.setDashboardNumbers();
        this.applyFiltersAndSort();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading publishers:', err);

        this.errorMessage = 'Could not load publishers. Make sure the backend server is running and your account has admin access.';
        this.isLoading = false;

        this.cdr.detectChanges();
      }
    });
  }



  // this sets dashboard card numbers on top of page
  private setDashboardNumbers(): void {
    this.totalPublishers = this.publishers.length;

    this.publishersWithCity = this.publishers.filter(publisher =>
      !!publisher.city
    ).length;

    this.publishersWithState = this.publishers.filter(publisher =>
      !!publisher.state
    ).length;

    this.publishersWithCountry = this.publishers.filter(publisher =>
      !!publisher.country
    ).length;
  }



  // open/close filter section
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.cdr.detectChanges();
  }



  // clears green success message when user starts another action
  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.detectChanges();
  }



  // filter and sort publishers table
  applyFiltersAndSort(): void {
    const term = this.searchTerm.toLowerCase().trim();

    let result = [...this.publishers];

    if (term) {
      result = result.filter(publisher =>
        publisher.pub_id.toLowerCase().includes(term) ||
        publisher.pub_name.toLowerCase().includes(term) ||
        (publisher.city ?? '').toLowerCase().includes(term) ||
        (publisher.state ?? '').toLowerCase().includes(term) ||
        (publisher.country ?? '').toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => this.sortPublishers(a, b));

    this.filteredPublishers = result;

    this.currentPage = 1;

    this.updatePagedPublishers();

    this.cdr.detectChanges();
  }



  clearFilters(): void {
    this.clearSuccessMessage();

    this.searchTerm = '';
    this.selectedSort = 'nameAsc';
    this.currentPage = 1;

    this.applyFiltersAndSort();
  }



  // sorting logic for publisher table
  private sortPublishers(a: AdminPublisher, b: AdminPublisher): number {
    switch (this.selectedSort) {
      case 'nameAsc':
        return this.compareText(a.pub_name, b.pub_name);

      case 'nameDesc':
        return this.compareText(b.pub_name, a.pub_name);

      case 'idAsc':
        return this.compareText(a.pub_id, b.pub_id);

      case 'idDesc':
        return this.compareText(b.pub_id, a.pub_id);

      case 'cityAsc':
        return this.compareText(a.city ?? '', b.city ?? '');

      case 'cityDesc':
        return this.compareText(b.city ?? '', a.city ?? '');

      case 'countryAsc':
        return this.compareText(a.country ?? '', b.country ?? '');

      case 'countryDesc':
        return this.compareText(b.country ?? '', a.country ?? '');

      default:
        return this.compareText(a.pub_name, b.pub_name);
    }
  }



  private compareText(a: string, b: string): number {
    return a.localeCompare(b);
  }



  // update what publishers show on page 1,2,3 etc
  updatePagedPublishers(): void {
    this.totalPages = Math.ceil(this.filteredPublishers.length / this.pageSize);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedPublishers = this.filteredPublishers.slice(startIndex, endIndex);
  }



  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagedPublishers();

    this.cdr.detectChanges();
  }



  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagedPublishers();

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
    if (this.filteredPublishers.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }



  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    return Math.min(end, this.filteredPublishers.length);
  }



  // open create form
  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showPublisherForm = true;
    this.isEditMode = false;
    this.editingPubId = null;

    this.formPubId = '';
    this.formPubName = '';
    this.formCity = '';
    this.formState = '';
    this.formCountry = '';

    this.cdr.detectChanges();
  }



  // open edit form and fill it with selected publisher
  openEditForm(publisher: AdminPublisher): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showPublisherForm = true;
    this.isEditMode = true;
    this.editingPubId = publisher.pub_id;

    this.formPubId = publisher.pub_id;
    this.formPubName = publisher.pub_name;
    this.formCity = publisher.city ?? '';
    this.formState = publisher.state ?? '';
    this.formCountry = publisher.country ?? '';

    this.cdr.detectChanges();
  }



  // cancel add/edit form
  cancelForm(): void {
    this.showPublisherForm = false;
    this.isEditMode = false;
    this.editingPubId = null;

    this.formPubId = '';
    this.formPubName = '';
    this.formCity = '';
    this.formState = '';
    this.formCountry = '';

    this.errorMessage = '';

    this.cdr.detectChanges();
  }



  // save button, this decides create or update
  savePublisher(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const validationError = this.validatePublisherForm();

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    if (this.isEditMode && this.editingPubId !== null) {
      const updateData: PublisherUpdateRequest = {
        pub_name: this.formPubName.trim(),
        city: this.cleanOptionalText(this.formCity),
        state: this.cleanOptionalText(this.formState)?.toUpperCase() ?? null,
        country: this.cleanOptionalText(this.formCountry)
      };

      this.updatePublisher(this.editingPubId, updateData);
      return;
    }

    const createData: PublisherCreateRequest = {
      pub_id: this.formPubId.trim(),
      pub_name: this.formPubName.trim(),
      city: this.cleanOptionalText(this.formCity),
      state: this.cleanOptionalText(this.formState)?.toUpperCase() ?? null,
      country: this.cleanOptionalText(this.formCountry)
    };

    this.createPublisher(createData);
  }



  // publisher form validation
  private validatePublisherForm(): string {
    if (!this.isEditMode && (!this.formPubId || !this.formPubId.trim())) {
      return 'Publisher ID is required.';
    }

    if (!this.isEditMode && this.formPubId.trim().length !== 4) {
      return 'Publisher ID must be exactly 4 characters.';
    }

    if (!this.formPubName || !this.formPubName.trim()) {
      return 'Publisher name is required.';
    }

    if (this.formPubName.trim().length > 40) {
      return 'Publisher name cannot be longer than 40 characters.';
    }

    if (this.formCity && this.formCity.trim().length > 20) {
      return 'City cannot be longer than 20 characters.';
    }

    if (this.formState && this.formState.trim().length > 2) {
      return 'State must be 2 characters or less.';
    }

    if (this.formCountry && this.formCountry.trim().length > 30) {
      return 'Country cannot be longer than 30 characters.';
    }

    return '';
  }



  // if optional field is blank, send null to backend
  private cleanOptionalText(value: string): string | null {
    const cleanValue = value ? value.trim() : '';

    if (!cleanValue) {
      return null;
    }

    return cleanValue;
  }



  // create new publisher api call
  createPublisher(publisherData: PublisherCreateRequest): void {
    this.isSaving = true;

    this.adminPublisherService.createPublisher(publisherData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.loadPublishers(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating publisher:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not create publisher.';

        this.cdr.detectChanges();
      }
    });
  }



  // update existing publisher api call
  updatePublisher(pubId: string, publisherData: PublisherUpdateRequest): void {
    this.isSaving = true;

    this.adminPublisherService.updatePublisher(pubId, publisherData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.loadPublishers(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating publisher:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not update publisher.';

        this.cdr.detectChanges();
      }
    });
  }



  // this opens our custom popup instead of ugly browser confirm
  deletePublisher(publisher: AdminPublisher): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.selectedPublisherForDelete = publisher;
    this.showConfirmModal = true;

    this.cdr.detectChanges();
  }



  // close custom delete popup
  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.selectedPublisherForDelete = null;

    this.cdr.detectChanges();
  }



  getDeleteConfirmTitle(): string {
    return 'Delete Publisher Record?';
  }



  getSelectedPublisherName(): string {
    if (!this.selectedPublisherForDelete) {
      return '';
    }

    return this.selectedPublisherForDelete.pub_name;
  }



  getSelectedPublisherId(): string {
    if (!this.selectedPublisherForDelete) {
      return '';
    }

    return this.selectedPublisherForDelete.pub_id;
  }



  getDeleteConfirmMessage(): string {
    if (!this.selectedPublisherForDelete) {
      return '';
    }

    return 'This will permanently delete this publisher record. If employees, titles, or publisher info are connected to this publisher, the system will block the delete.';
  }



  // this runs only when user clicks delete in the custom popup
  confirmDeletePublisher(): void {
    if (!this.selectedPublisherForDelete) {
      return;
    }

    const publisherToDelete = this.selectedPublisherForDelete;
    const publisherName = publisherToDelete.pub_name;
    const publisherId = publisherToDelete.pub_id;

    this.showConfirmModal = false;
    this.selectedPublisherForDelete = null;

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminPublisherService.deletePublisher(publisherId).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.successMessage =
          response.message ||
          `Publisher ${publisherName} (${publisherId}) deleted successfully.`;

        this.loadPublishers(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting publisher:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not delete publisher.';

        this.cdr.detectChanges();
      }
    });
  }
}