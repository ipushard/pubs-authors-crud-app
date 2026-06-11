//ChangeDetectorRef lets us manually tell Angular to refresh the HTML if needed
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthorService } from '../services/author';
import { Author } from '../models/author';
import { RouterLink } from '@angular/router';

import { TitleCasePipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';



//componenet decorator 
@Component({
  selector: 'app-authors',
  imports: [RouterLink, TitleCasePipe, UpperCasePipe, FormsModule,MatIconModule],
  templateUrl: './authors.html',
  styleUrl: './authors.css'
})
export class Authors implements OnInit {



  // BUNCH OF VARS THAT I USE THRO THE PROGRAM
  //store authors in array
  authors: Author[] = [];

  // sort variables 
  filteredAuthors: Author[] = [];

searchTerm = '';

selectedContract = 'all';

selectedState = 'all';

availableStates: string[] = [];

selectedSort = 'lastNameAsc';

showFilters = false;

recordStatus = 'all';

  //declare var for storing the error message 
  errorMessage: string = '';

successMessage: string = '';

isLoading = false;


// dashboard card numbers 
// this is for small numbers on top of tabel
totalAuthors = 0;

activeAuthors = 0;

archivedAuthors = 0;

contractSigned = 0;

contractNotSigned = 0;


// confirmation modal variables
// this is for custom archive and unarchive popup
showConfirmModal = false;

confirmAction = '';

selectedAuthorId = '';

selectedAuthorName = '';

// pagination variables
pagedAuthors: Author[] = [];

currentPage = 1;

pageSize = 10;

pageSizeOptions = [5, 10, 20, 50];

totalPages = 1;











  // injecting AuthorSercice and ChangeDetectorRef into the constructor
  // injecting ChangeDet here becase this allows me to force angular to refresh
  constructor(
    private authorService: AuthorService,
    private cdr: ChangeDetectorRef
  ) {}

  //runs automaticly when component loads and loads out tabel 
  ngOnInit(): void {
    this.loadAuthors();
  }



  // togle 
  toggleFilters(): void {
  this.showFilters = !this.showFilters;
  this.cdr.detectChanges();
}





  loadAuthors(): void {

    //check
    console.log('loadAuthors method called');

    this.isLoading = true;
    this.errorMessage = '';

    //call the getAuthors method from the service and subscribe to the observable 
    // SENDS GET REQUEST TO out http
    this.authorService.getAuthors(this.recordStatus).subscribe({
      next: (data) => {
        this.authors = data;

        this.totalAuthors = data.length;
        this.activeAuthors = data.filter(author => author.is_active === true).length;
        this.archivedAuthors = data.filter(author => author.is_active === false).length;
        this.contractSigned = data.filter(author => author.contract === true).length;
        this.contractNotSigned = data.filter(author => author.contract === false).length;

        this.availableStates = [
          ...new Set(
            data
              .map(author => author.state)
              .filter((state): state is string => !!state)
              .map(state => state.toUpperCase())
          )
        ].sort();

        this.applyFiltersAndSort();

        this.isLoading = false;

        console.log('API data:', data);
        console.log('Component authors:', this.authors);
        console.log('Component authors length:', this.authors.length);

        this.cdr.detectChanges();
      },

      //if api fails log error and set error message to display in html
      error: (err) => {
        console.error('Error loading authors:', err);
        this.errorMessage = 'Could not load authors. Make sure the backend server is running.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }





  //record status change method 
  onRecordStatusChange(): void {
  this.currentPage = 1;
  this.successMessage = '';
  this.loadAuthors();
}





// unarchive emthod 
onUnarchiveAuthor(id: string): void {
  const author = this.authors.find(author => author.au_id === id);

  this.selectedAuthorId = id;
  this.selectedAuthorName = author
    ? `${author.au_fname} ${author.au_lname}`
    : 'Selected author';

  this.confirmAction = 'unarchive';
  this.showConfirmModal = true;

  this.errorMessage = '';
  this.successMessage = '';

  this.cdr.detectChanges();
}









  // filter method
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

  this.confirmAction = 'archive';
  this.showConfirmModal = true;

  this.errorMessage = '';
  this.successMessage = '';

  this.cdr.detectChanges();
}








// close modal if user press cancel 
closeConfirmModal(): void {
  this.showConfirmModal = false;
  this.confirmAction = '';
  this.selectedAuthorId = '';
  this.selectedAuthorName = '';

  this.cdr.detectChanges();
}


// this runs after user press main button in custom pop up
confirmAuthorAction(): void {
  if (!this.selectedAuthorId) {
    return;
  }

  if (this.confirmAction === 'archive') {
    this.archiveAuthor(this.selectedAuthorId);
    return;
  }

  if (this.confirmAction === 'unarchive') {
    this.unarchiveAuthor(this.selectedAuthorId);
    return;
  }
}


// title for custom popup 
getConfirmTitle(): string {
  if (this.confirmAction === 'archive') {
    return 'Archive Author Record?';
  }

  if (this.confirmAction === 'unarchive') {
    return 'Restore Author Record?';
  }

  return '';
}


// message for custom popup
getConfirmMessage(): string {
  if (this.confirmAction === 'archive') {
    return 'This will not permanently delete the author. You can restore this record later from Archived Records.';
  }

  if (this.confirmAction === 'unarchive') {
    return 'This will move the author back to Active Records.';
  }

  return '';
}


// main button text for custom popup
getConfirmButtonText(): string {
  if (this.confirmAction === 'archive') {
    return 'Archive Author';
  }

  if (this.confirmAction === 'unarchive') {
    return 'Restore Author';
  }

  return '';
}









// this is real archive api call after user confirm in custom popup
private archiveAuthor(id: string): void {
  this.showConfirmModal = false;
  this.errorMessage = '';
  this.successMessage = '';

  const authorName = this.selectedAuthorName || 'Selected author';

  this.authorService.deleteAuthor(id).subscribe({
    next: () => {
      console.log('Author archived:', id);

      this.errorMessage = '';
      this.successMessage =
        `Author ${authorName} (${id}) archived successfully. You can restore it from Archived Records.`;

      this.confirmAction = '';
      this.selectedAuthorId = '';
      this.selectedAuthorName = '';

      //reload the table after archive so the archived record disappears.
      this.loadAuthors();

      //rorce angular to refresh the page after archive.
      this.cdr.detectChanges();

      // hide sucess message after 2 seconds
      setTimeout(() => {
        this.successMessage = '';
        this.cdr.detectChanges();
      }, 4000);
    },

    error: (err) => {
      console.error('Error archiving author:', err);

      if (err.status === 409) {
        this.errorMessage =
          err.error?.message ||
          'This author cannot be archived because they are connected to other database records.';
      } else if (err.status === 404) {
        this.errorMessage =
          'Author not found. It may have already been archived.';
      } else if (err.status === 0) {
        this.errorMessage =
          'Cannot connect to backend API. Make sure the Node server is running.';
      } else {
        this.errorMessage =
          err.error?.message ||
          'Could not archive author. Please try again.';
      }

      this.confirmAction = '';
      this.selectedAuthorId = '';
      this.selectedAuthorName = '';

      //force angular to show the error message immediately.
      this.cdr.detectChanges();
    }
  });
}





// this is real unarchive api call after user confirm in custom popup
private unarchiveAuthor(id: string): void {
  this.showConfirmModal = false;
  this.errorMessage = '';
  this.successMessage = '';

  const authorName = this.selectedAuthorName || 'Selected author';

  this.authorService.unarchiveAuthor(id).subscribe({
    next: () => {
      this.successMessage =
        `Author ${authorName} (${id}) unarchived successfully. The record is active again.`;

      this.confirmAction = '';
      this.selectedAuthorId = '';
      this.selectedAuthorName = '';

      this.loadAuthors();
      this.cdr.detectChanges();

      // hide sucess message after 2 seconds
      setTimeout(() => {
        this.successMessage = '';
        this.cdr.detectChanges();
      }, 4000);
    },
    error: (err) => {
      console.error('Error unarchiving author:', err);
      this.errorMessage = err.error?.message || 'Could not unarchive author. Please try again.';

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

  this.currentPage = page;
  this.updatePagedAuthors();
}


onPageSizeChange(): void {
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
