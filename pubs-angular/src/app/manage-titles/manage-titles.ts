import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminTitleService } from '../services/admin-title';
import { AdminPublisherService } from '../services/admin-publisher';

import {
  AdminTitle,
  TitleCreateRequest,
  TitleUpdateRequest
} from '../models/admin-title';

import { AdminPublisher } from '../models/admin-publisher';

@Component({
  selector: 'app-manage-titles',
  imports: [
    FormsModule,
    DatePipe
  ],
  templateUrl: './manage-titles.html',
  styleUrl: './manage-titles.css'
})
export class ManageTitles implements OnInit {

  // store all titles from database
  titles: AdminTitle[] = [];

  // filtered titles after search/filter/sort
  filteredTitles: AdminTitle[] = [];

  // titles shown on current page
  pagedTitles: AdminTitle[] = [];

  // publishers used for dropdown
  publishers: AdminPublisher[] = [];

  searchTerm = '';

  selectedType = 'all';

  selectedPublisher = 'all';

  selectedSort = 'titleAsc';

  availableTypes: string[] = [];

  showFilters = false;

  errorMessage = '';

  successMessage = '';

  isLoading = false;

  isSaving = false;

  showTitleForm = false;

  isEditMode = false;

  editingTitleId: string | null = null;

  formTitleId = '';

  formTitle = '';

  formType = '';

  formPubId = '';

  formPrice: number | null = null;

  formAdvance: number | null = null;

  formRoyalty: number | null = null;

  formYtdSales: number | null = null;

  formNotes = '';

  formPubDate = '';

  // dashboard numbers
  totalTitles = 0;

  titlesWithPrice = 0;

  totalYtdSales = 0;

  averagePrice = 0;

  // pagination variables
  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;

  constructor(
    private adminTitleService: AdminTitleService,
    private adminPublisherService: AdminPublisherService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadTitles();
    this.loadPublishers();
  }

  loadTitles(clearMessages: boolean = true): void {
    this.isLoading = true;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }

    this.adminTitleService.getTitles().subscribe({
      next: (data) => {
        this.titles = data;

        this.availableTypes = [
          ...new Set(
            data
              .map(title => title.type ? title.type.trim() : '')
              .filter(type => !!type)
          )
        ].sort();

        this.setDashboardNumbers();
        this.applyFiltersAndSort();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading titles:', err);

        this.errorMessage = 'Could not load titles. Make sure the backend server is running and your account has admin access.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPublishers(): void {
    this.adminPublisherService.getPublishers().subscribe({
      next: (data) => {
        this.publishers = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading publishers:', err);
        this.errorMessage = 'Could not load publishers for the title form.';
        this.cdr.detectChanges();
      }
    });
  }

  // this sets dashboard card numbers on top of page
  private setDashboardNumbers(): void {
    this.totalTitles = this.titles.length;

    this.titlesWithPrice = this.titles.filter(title =>
      title.price !== null
    ).length;

    this.totalYtdSales = this.titles.reduce((sum, title) => {
      return sum + Number(title.ytd_sales ?? 0);
    }, 0);

    const pricedTitles = this.titles.filter(title =>
      title.price !== null
    );

    if (pricedTitles.length === 0) {
      this.averagePrice = 0;
      return;
    }

    const totalPrice = pricedTitles.reduce((sum, title) => {
      return sum + Number(title.price ?? 0);
    }, 0);

    this.averagePrice = Math.round((totalPrice / pricedTitles.length) * 100) / 100;
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

    let result = [...this.titles];

    if (term) {
      result = result.filter(title =>
        title.title_id.toLowerCase().includes(term) ||
        title.title.toLowerCase().includes(term) ||
        title.type.toLowerCase().includes(term) ||
        title.pub_id.toLowerCase().includes(term) ||
        (title.pub_name ?? '').toLowerCase().includes(term) ||
        String(title.price ?? '').includes(term) ||
        String(title.royalty ?? '').includes(term) ||
        String(title.ytd_sales ?? '').includes(term)
      );
    }

    if (this.selectedType !== 'all') {
      result = result.filter(title =>
        title.type.trim() === this.selectedType
      );
    }

    if (this.selectedPublisher !== 'all') {
      result = result.filter(title =>
        title.pub_id === this.selectedPublisher
      );
    }

    result.sort((a, b) => this.sortTitles(a, b));

    this.filteredTitles = result;

    this.currentPage = 1;

    this.updatePagedTitles();

    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.clearSuccessMessage();

    this.searchTerm = '';
    this.selectedType = 'all';
    this.selectedPublisher = 'all';
    this.selectedSort = 'titleAsc';
    this.currentPage = 1;

    this.applyFiltersAndSort();
  }

  private sortTitles(a: AdminTitle, b: AdminTitle): number {
    switch (this.selectedSort) {
      case 'titleAsc':
        return this.compareText(a.title, b.title);

      case 'titleDesc':
        return this.compareText(b.title, a.title);

      case 'idAsc':
        return this.compareText(a.title_id, b.title_id);

      case 'idDesc':
        return this.compareText(b.title_id, a.title_id);

      case 'typeAsc':
        return this.compareText(a.type, b.type);

      case 'typeDesc':
        return this.compareText(b.type, a.type);

      case 'publisherAsc':
        return this.compareText(a.pub_name ?? '', b.pub_name ?? '');

      case 'publisherDesc':
        return this.compareText(b.pub_name ?? '', a.pub_name ?? '');

      case 'priceHigh':
        return Number(b.price ?? 0) - Number(a.price ?? 0);

      case 'priceLow':
        return Number(a.price ?? 0) - Number(b.price ?? 0);

      case 'salesHigh':
        return Number(b.ytd_sales ?? 0) - Number(a.ytd_sales ?? 0);

      case 'salesLow':
        return Number(a.ytd_sales ?? 0) - Number(b.ytd_sales ?? 0);

      case 'dateNewest':
        return new Date(b.pubdate).getTime() - new Date(a.pubdate).getTime();

      case 'dateOldest':
        return new Date(a.pubdate).getTime() - new Date(b.pubdate).getTime();

      default:
        return this.compareText(a.title, b.title);
    }
  }

  private compareText(a: string, b: string): number {
    return a.localeCompare(b);
  }

  updatePagedTitles(): void {
    this.totalPages = Math.ceil(this.filteredTitles.length / this.pageSize);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedTitles = this.filteredTitles.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagedTitles();
    this.cdr.detectChanges();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagedTitles();
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
    if (this.filteredTitles.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    return Math.min(end, this.filteredTitles.length);
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showTitleForm = true;
    this.isEditMode = false;
    this.editingTitleId = null;

    this.formTitleId = '';
    this.formTitle = '';
    this.formType = '';
    this.formPubId = '';
    this.formPrice = null;
    this.formAdvance = null;
    this.formRoyalty = null;
    this.formYtdSales = 0;
    this.formNotes = '';
    this.formPubDate = this.getTodayForInput();

    this.cdr.detectChanges();
  }

  openEditForm(title: AdminTitle): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showTitleForm = true;
    this.isEditMode = true;
    this.editingTitleId = title.title_id;

    this.formTitleId = title.title_id;
    this.formTitle = title.title;
    this.formType = title.type ? title.type.trim() : '';
    this.formPubId = title.pub_id;
    this.formPrice = title.price === null ? null : Number(title.price);
    this.formAdvance = title.advance === null ? null : Number(title.advance);
    this.formRoyalty = title.royalty === null ? null : Number(title.royalty);
    this.formYtdSales = title.ytd_sales === null ? null : Number(title.ytd_sales);
    this.formNotes = title.notes ?? '';
    this.formPubDate = this.formatDateForInput(title.pubdate);

    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showTitleForm = false;
    this.isEditMode = false;
    this.editingTitleId = null;

    this.formTitleId = '';
    this.formTitle = '';
    this.formType = '';
    this.formPubId = '';
    this.formPrice = null;
    this.formAdvance = null;
    this.formRoyalty = null;
    this.formYtdSales = null;
    this.formNotes = '';
    this.formPubDate = '';

    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  saveTitle(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const validationError = this.validateTitleForm();

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    if (this.isEditMode && this.editingTitleId !== null) {
      const updateData: TitleUpdateRequest = {
        title: this.formTitle.trim(),
        type: this.formType.trim(),
        pub_id: this.formPubId,
        price: this.cleanOptionalNumber(this.formPrice),
        advance: this.cleanOptionalNumber(this.formAdvance),
        royalty: this.cleanOptionalInteger(this.formRoyalty),
        ytd_sales: this.cleanOptionalInteger(this.formYtdSales),
        notes: this.cleanOptionalText(this.formNotes),
        pubdate: this.formPubDate
      };

      this.updateTitle(this.editingTitleId, updateData);
      return;
    }

    const createData: TitleCreateRequest = {
      title_id: this.formTitleId.trim().toUpperCase(),
      title: this.formTitle.trim(),
      type: this.formType.trim(),
      pub_id: this.formPubId,
      price: this.cleanOptionalNumber(this.formPrice),
      advance: this.cleanOptionalNumber(this.formAdvance),
      royalty: this.cleanOptionalInteger(this.formRoyalty),
      ytd_sales: this.cleanOptionalInteger(this.formYtdSales),
      notes: this.cleanOptionalText(this.formNotes),
      pubdate: this.formPubDate
    };

    this.createTitle(createData);
  }

  private validateTitleForm(): string {
    if (!this.isEditMode && (!this.formTitleId || !this.formTitleId.trim())) {
      return 'Title ID is required.';
    }

    if (!this.isEditMode && !/^[A-Z]{2}[0-9]{4}$/i.test(this.formTitleId.trim())) {
      return 'Title ID must be 6 characters: two letters followed by four numbers. Example: BU9999.';
    }

    if (!this.formTitle || !this.formTitle.trim()) {
      return 'Title name is required.';
    }

    if (this.formTitle.trim().length > 80) {
      return 'Title name cannot be longer than 80 characters.';
    }

    if (!this.formType || !this.formType.trim()) {
      return 'Title type is required.';
    }

    if (this.formType.trim().length > 12) {
      return 'Title type cannot be longer than 12 characters.';
    }

    if (!this.formPubId) {
      return 'Publisher is required.';
    }

    if (!this.formPubDate) {
      return 'Publication date is required.';
    }

    if (this.formPrice !== null && this.formPrice !== undefined && Number(this.formPrice) < 0) {
      return 'Price must be greater than or equal to 0.';
    }

    if (this.formAdvance !== null && this.formAdvance !== undefined && Number(this.formAdvance) < 0) {
      return 'Advance must be greater than or equal to 0.';
    }

    if (this.formRoyalty !== null && this.formRoyalty !== undefined) {
      const royalty = Number(this.formRoyalty);

      if (!Number.isInteger(royalty) || royalty < 0 || royalty > 100) {
        return 'Royalty must be a whole number between 0 and 100.';
      }
    }

    if (this.formYtdSales !== null && this.formYtdSales !== undefined) {
      const ytdSales = Number(this.formYtdSales);

      if (!Number.isInteger(ytdSales) || ytdSales < 0) {
        return 'Year-to-date sales must be a whole number greater than or equal to 0.';
      }
    }

    if (this.formNotes && this.formNotes.trim().length > 200) {
      return 'Notes cannot be longer than 200 characters.';
    }

    return '';
  }

  private cleanOptionalText(value: string): string | null {
    const cleanValue = value ? value.trim() : '';

    if (!cleanValue) {
      return null;
    }

    return cleanValue;
  }

  private cleanOptionalNumber(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return null;
    }

    return numberValue;
  }

  private cleanOptionalInteger(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) {
      return null;
    }

    return Math.trunc(numberValue);
  }

  private getTodayForInput(): string {
    const today = new Date();

    return today.toISOString().slice(0, 10);
  }

  private formatDateForInput(value: string): string {
    if (!value) {
      return this.getTodayForInput();
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return this.getTodayForInput();
    }

    return dateValue.toISOString().slice(0, 10);
  }

  createTitle(titleData: TitleCreateRequest): void {
    this.isSaving = true;

    this.adminTitleService.createTitle(titleData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.loadTitles(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating title:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not create title.';

        this.cdr.detectChanges();
      }
    });
  }

  updateTitle(titleId: string, titleData: TitleUpdateRequest): void {
    this.isSaving = true;

    this.adminTitleService.updateTitle(titleId, titleData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.loadTitles(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating title:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not update title.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteTitle(title: AdminTitle): void {
    this.errorMessage = '';
    this.successMessage = '';

    const confirmed = confirm(
      `Are you sure you want to delete this title?\n\n${title.title} (${title.title_id})\n\nIf sales, authors, or royalty schedules are connected to this title, the system will block the delete.`
    );

    if (!confirmed) {
      return;
    }

    this.isSaving = true;

    this.adminTitleService.deleteTitle(title.title_id).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.successMessage = response.message;

        this.loadTitles(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting title:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not delete title.';

        this.cdr.detectChanges();
      }
    });
  }
}