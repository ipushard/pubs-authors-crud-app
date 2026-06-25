import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { AuthorService } from '../services/author';
import { Author } from '../models/author';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-authors',
  imports: [
    CommonModule,
    RouterLink,
    TitleCasePipe,
    UpperCasePipe,
    FormsModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  templateUrl: './authors.html',
  styleUrl: './authors.css'
})
export class Authors implements OnInit {

  authors: Author[] = [];

  filteredAuthors: Author[] = [];

  searchTerm = '';

  selectedContract = 'all';

  selectedState = 'all';

  availableStates: string[] = [];

  selectedSort = 'lastNameAsc';

  showFilters = false;

  recordStatus = 'all';

  errorMessage = '';

  successMessage = '';

  isLoading = false;

  totalAuthors = 0;

  activeAuthors = 0;

  archivedAuthors = 0;

  contractSigned = 0;

  contractNotSigned = 0;

  showConfirmModal = false;

  confirmAction = '';

  selectedAuthorId = '';

  selectedAuthorName = '';

  pagedAuthors: Author[] = [];

  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;

  showSortOptions = false;

  constructor(
    private authorService: AuthorService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAuthors();
  }

  @HostListener('document:click', ['$event'])
  closeSortWhenClickOutside(event: MouseEvent): void {
    const clickedElement = event.target as HTMLElement;

    if (!clickedElement.closest('.custom-sort')) {
      this.showSortOptions = false;
      this.cdr.detectChanges();
    }
  }

  toggleFilters(): void {
    this.clearSuccessMessage();
    this.showFilters = !this.showFilters;
    this.cdr.detectChanges();
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  toggleSortOptions(): void {
    this.clearSuccessMessage();
    this.showSortOptions = !this.showSortOptions;
    this.cdr.detectChanges();
  }

  selectSortOption(sortValue: string): void {
    this.clearSuccessMessage();
    this.selectedSort = sortValue;
    this.showSortOptions = false;
    this.applyFiltersAndSort();
  }

                private showCreateSuccessMessage(): void {
                const urlParams = new URLSearchParams(window.location.search);

                const createdAuthorName = urlParams.get('createdAuthorName');
                const createdAuthorId = urlParams.get('createdAuthorId');

                const updatedAuthorName = urlParams.get('updatedAuthorName');
                const updatedAuthorId = urlParams.get('updatedAuthorId');

                if (createdAuthorName && createdAuthorId) {
                  this.successMessage =
                    `Author ${createdAuthorName} (${createdAuthorId}) created successfully.`;
                } else if (updatedAuthorName && updatedAuthorId) {
                  this.successMessage =
                    `Author ${updatedAuthorName} (${updatedAuthorId}) modified successfully.`;
                } else {
                  return;
                }

                this.cdr.detectChanges();

                // clean url after message is picked up
                window.history.replaceState({}, '', '/authors');

                // keep message for 10 seconds
                setTimeout(() => {
                  this.successMessage = '';
                  this.cdr.detectChanges();
                }, 10000);
              }

  loadAuthors(): void {
    console.log('loadAuthors method called');

    this.isLoading = true;
    this.errorMessage = '';

    this.authorService.getAuthors(this.recordStatus).subscribe({
      next: (data) => {
        this.authors = data;

        this.setDashboardNumbers(data);
        this.setAvailableStates(data);

        this.applyFiltersAndSort();

        this.isLoading = false;

        console.log('API data:', data);
        console.log('Component authors:', this.authors);
        console.log('Component authors length:', this.authors.length);

        this.showCreateSuccessMessage();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading authors:', err);

        this.errorMessage = 'Could not load authors. Make sure the backend server is running.';
        this.isLoading = false;

        this.cdr.detectChanges();
      }
    });
  }

  private setDashboardNumbers(data: Author[]): void {
    this.totalAuthors = data.length;

    this.activeAuthors = data.filter(author =>
      this.isAuthorActive(author)
    ).length;

    this.archivedAuthors = data.filter(author =>
      !this.isAuthorActive(author)
    ).length;

    this.contractSigned = data.filter(author =>
      author.contract === true
    ).length;

    this.contractNotSigned = data.filter(author =>
      author.contract === false
    ).length;
  }

  private setAvailableStates(data: Author[]): void {
    this.availableStates = [
      ...new Set(
        data
          .map(author => author.state)
          .filter((state): state is string => !!state)
          .map(state => state.toUpperCase())
      )
    ].sort();
  }

  isAuthorActive(author: Author): boolean {
    return author.is_active === true || Number(author.is_active) === 1;
  }

  onRecordStatusChange(): void {
    this.currentPage = 1;
    this.clearSuccessMessage();
    this.loadAuthors();
  }

  onAuthorActiveToggle(author: Author, isChecked: boolean): void {
    this.errorMessage = '';
    this.successMessage = '';

    const authorName = `${author.au_fname} ${author.au_lname}`;

    this.authorService.updateAuthorStatus(author.au_id, isChecked).subscribe({
      next: (response) => {
        this.successMessage =
          response.message ||
          `Author ${authorName} (${author.au_id}) status updated successfully.`;

        author.is_active = isChecked;

        this.loadAuthors();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating author status:', err);

        this.errorMessage =
          err.error?.message ||
          'Could not update author status. Please try again.';

        this.loadAuthors();

        this.cdr.detectChanges();
      }
    });
  }

  applyFiltersAndSort(): void {
    const term = this.searchTerm.toLowerCase().trim();

    let result = [...this.authors];

    if (term) {
      result = result.filter(author =>
        author.au_id.toLowerCase().includes(term) ||
        author.au_fname.toLowerCase().includes(term) ||
        author.au_lname.toLowerCase().includes(term) ||
        author.phone.toLowerCase().includes(term) ||
        (author.address ?? '').toLowerCase().includes(term) ||
        (author.city ?? '').toLowerCase().includes(term) ||
        (author.state ?? '').toLowerCase().includes(term) ||
        (author.zip ?? '').toLowerCase().includes(term)
      );
    }

    if (this.selectedContract === 'yes') {
      result = result.filter(author => author.contract === true);
    }

    if (this.selectedContract === 'no') {
      result = result.filter(author => author.contract === false);
    }

    if (this.selectedState !== 'all') {
      result = result.filter(author =>
        (author.state ?? '').toUpperCase() === this.selectedState
      );
    }

    result.sort((a, b) => this.sortAuthors(a, b));

    this.filteredAuthors = result;

    this.currentPage = 1;

    this.updatePagedAuthors();

    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.clearSuccessMessage();

    this.searchTerm = '';
    this.selectedContract = 'all';
    this.selectedState = 'all';
    this.selectedSort = 'lastNameAsc';
    this.currentPage = 1;

    this.applyFiltersAndSort();
  }

  private sortAuthors(a: Author, b: Author): number {
    switch (this.selectedSort) {
      case 'lastNameAsc':
        return this.compareText(a.au_lname, b.au_lname);

      case 'lastNameDesc':
        return this.compareText(b.au_lname, a.au_lname);

      case 'firstNameAsc':
        return this.compareText(a.au_fname, b.au_fname);

      case 'firstNameDesc':
        return this.compareText(b.au_fname, a.au_fname);

      case 'cityAsc':
        return this.compareText(a.city ?? '', b.city ?? '');

      case 'cityDesc':
        return this.compareText(b.city ?? '', a.city ?? '');

      case 'stateAsc':
        return this.compareText(a.state ?? '', b.state ?? '');

      case 'stateDesc':
        return this.compareText(b.state ?? '', a.state ?? '');

      case 'contractYesFirst':
        return Number(b.contract) - Number(a.contract);

      case 'contractNoFirst':
        return Number(a.contract) - Number(b.contract);

      default:
        return this.compareText(a.au_lname, b.au_lname);
    }
  }

  private compareText(valueA: string, valueB: string): number {
    return valueA.toLowerCase().localeCompare(valueB.toLowerCase());
  }

  onDeleteAuthor(id: string): void {
    const author = this.authors.find(author => author.au_id === id);

    this.selectedAuthorId = id;

    this.selectedAuthorName = author
      ? `${author.au_fname} ${author.au_lname}`
      : 'Selected author';

    this.confirmAction = 'delete';
    this.showConfirmModal = true;

    this.errorMessage = '';
    this.successMessage = '';

    this.cdr.detectChanges();
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmAction = '';
    this.selectedAuthorId = '';
    this.selectedAuthorName = '';

    this.cdr.detectChanges();
  }

  confirmAuthorAction(): void {
    if (!this.selectedAuthorId) {
      return;
    }

    if (this.confirmAction === 'delete') {
      this.deleteAuthor(this.selectedAuthorId);
      return;
    }

    if (this.confirmAction === 'archive') {
      this.updateAuthorStatusFromOldAction(this.selectedAuthorId, false);
      return;
    }

    if (this.confirmAction === 'unarchive') {
      this.updateAuthorStatusFromOldAction(this.selectedAuthorId, true);
      return;
    }
  }

  getConfirmTitle(): string {
    if (this.confirmAction === 'delete') {
      return 'Delete Author Record?';
    }

    if (this.confirmAction === 'archive') {
      return 'Mark Author as Inactive?';
    }

    if (this.confirmAction === 'unarchive') {
      return 'Mark Author as Active?';
    }

    return '';
  }

  getConfirmMessage(): string {
    if (this.confirmAction === 'delete') {
      return 'This will permanently delete this author from the database. This action cannot be undone. If the author is connected to title records, the system will block the delete.';
    }

    if (this.confirmAction === 'archive') {
      return 'This will mark the author as inactive. The record will stay in the database.';
    }

    if (this.confirmAction === 'unarchive') {
      return 'This will mark the author as active again.';
    }

    return '';
  }

  getConfirmButtonText(): string {
    if (this.confirmAction === 'delete') {
      return 'Delete Author';
    }

    if (this.confirmAction === 'archive') {
      return 'Mark Inactive';
    }

    if (this.confirmAction === 'unarchive') {
      return 'Mark Active';
    }

    return '';
  }

  private deleteAuthor(id: string): void {
    this.showConfirmModal = false;
    this.errorMessage = '';
    this.successMessage = '';

    const authorName = this.selectedAuthorName || 'Selected author';

    this.authorService.deleteAuthor(id).subscribe({
      next: (response) => {
        console.log('Author deleted:', id);

        this.successMessage =
          response.message ||
          `Author ${authorName} (${id}) deleted successfully.`;

        this.confirmAction = '';
        this.selectedAuthorId = '';
        this.selectedAuthorName = '';

        this.loadAuthors();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting author:', err);

        if (err.status === 400 || err.status === 409) {
          this.errorMessage =
            err.error?.message ||
            'This author cannot be deleted because they are connected to other database records.';
        } else if (err.status === 404) {
          this.errorMessage =
            'Author not found. It may have already been deleted.';
        } else if (err.status === 0) {
          this.errorMessage =
            'Cannot connect to backend API. Make sure the Node server is running.';
        } else {
          this.errorMessage =
            err.error?.message ||
            'Could not delete author. Please try again.';
        }

        this.confirmAction = '';
        this.selectedAuthorId = '';
        this.selectedAuthorName = '';

        this.cdr.detectChanges();
      }
    });
  }

  private updateAuthorStatusFromOldAction(id: string, isActive: boolean): void {
    this.showConfirmModal = false;
    this.errorMessage = '';
    this.successMessage = '';

    const authorName = this.selectedAuthorName || 'Selected author';

    this.authorService.updateAuthorStatus(id, isActive).subscribe({
      next: (response) => {
        this.successMessage =
          response.message ||
          `Author ${authorName} (${id}) status updated successfully.`;

        this.confirmAction = '';
        this.selectedAuthorId = '';
        this.selectedAuthorName = '';

        this.loadAuthors();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating author status:', err);

        this.errorMessage =
          err.error?.message ||
          'Could not update author status. Please try again.';

        this.confirmAction = '';
        this.selectedAuthorId = '';
        this.selectedAuthorName = '';

        this.cdr.detectChanges();
      }
    });
  }

  updatePagedAuthors(): void {
    const size = Number(this.pageSize);

    this.totalPages = Math.ceil(this.filteredAuthors.length / size);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * size;
    const endIndex = startIndex + size;

    this.pagedAuthors = this.filteredAuthors.slice(startIndex, endIndex);

    this.cdr.detectChanges();
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.clearSuccessMessage();
    this.currentPage = page;
    this.updatePagedAuthors();
  }

  onPageSizeChange(): void {
    this.clearSuccessMessage();
    this.currentPage = 1;
    this.updatePagedAuthors();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];

    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }

    return pages;
  }

  getStartRecordNumber(): number {
    if (this.filteredAuthors.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    if (end > this.filteredAuthors.length) {
      return this.filteredAuthors.length;
    }

    return end;
  }
}