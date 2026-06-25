import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import { AuthorService } from '../services/author';
import { Author } from '../models/author';

import { TitleCasePipe, UpperCasePipe } from '@angular/common';

import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-author-details',
  imports: [
    FormsModule,
    TitleCasePipe,
    UpperCasePipe,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './author-details.html',
  styleUrl: './author-details.css'
})
export class AuthorDetails implements OnInit {

  author: Author | null = null;

  isEditing = false;

  errorMessage = '';
  successMessage = '';
  submitted = false;

  // backend duplicate errors, shown at the top of the form
  duplicateErrors: string[] = [];


  // geoapify key for adress autocomplete
  private geoapifyApiKey = 'c885c27efb934e75902a8d690626eb00';

  // adress suggestions from geoapify
  addressSuggestions: any[] = [];

  // small timer so api does not get called evry key press right away
  private addressSearchTimer: any = null;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authorService: AuthorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAuthor();
  }

  loadAuthor(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage = 'No author ID was provided.';
      this.cdr.detectChanges();
      return;
    }

    this.authorService.getAuthor(id).subscribe({
      next: (data) => {
        this.author = data;
        console.log('Loaded author:', this.author);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading author:', err);
        this.errorMessage = 'Could not load author details.';
        this.cdr.detectChanges();
      }
    });
  }

  enableEdit(): void {
    this.isEditing = true;
    this.submitted = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.duplicateErrors = [];
    this.addressSuggestions = [];
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.submitted = false;
    this.duplicateErrors = [];
    this.addressSuggestions = [];
    this.loadAuthor();
  }

  saveAuthor(form: NgForm): void {
    // submitted is used to show validation errors after user clicks save
    this.submitted = true;

    if (!this.author) {
      this.errorMessage = 'No author data to save.';
      this.cdr.detectChanges();
      return;
    }

    // clear old messages before trying to save again
    this.errorMessage = '';
    this.successMessage = '';
    this.duplicateErrors = [];

    // if angular form validation fails, stop here
    if (form.invalid) {
      this.cdr.detectChanges();
      return;
    }

    const validationError = this.validateAuthor(this.author);

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    this.authorService.updateAuthor(this.author.au_id, this.author).subscribe({
      next: () => {
              const updatedAuthorName = `${this.author?.au_fname} ${this.author?.au_lname}`;
              const updatedAuthorId = this.author?.au_id || '';

              this.isEditing = false;

              // after saving, go back to the table page
              // and send updated author info so table page can show success message
              this.router.navigate(['/authors'], {
                queryParams: {
                  updatedAuthorName: updatedAuthorName,
                  updatedAuthorId: updatedAuthorId
                }
              });
            },
      error: (err) => {
        console.error('Error updating author:', err);

        // backend is not running or cannot be reached
        if (err.status === 0) {
          this.errorMessage = 'Cannot connect to backend API. Make sure the Node server is running.';
          this.cdr.detectChanges();
          return;
        }

        // 409 means duplicate data conflict
        if (err.status === 409) {
          // if backend sends multiple duplicate errors, show all of them
          if (err.error?.errors && Array.isArray(err.error.errors)) {
            this.duplicateErrors = err.error.errors;
          } else {
            this.duplicateErrors = [
              err.error?.message || 'Duplicate author record found.'
            ];
          }

          this.cdr.detectChanges();
          return;
        }

        this.errorMessage = err.error?.message || 'Could not update author. Please check the data and try again.';
        this.cdr.detectChanges();
      }
    });
  }









  // this gets adress sugestions when user start typing in edit
  searchAddress(): void {
    if (!this.author) {
      return;
    }

    const addressText = this.author.address;

    // clear old timer first so api is not spammed to much
    if (this.addressSearchTimer) {
      clearTimeout(this.addressSearchTimer);
    }

    if (!addressText || addressText.length < 4) {
      this.addressSuggestions = [];
      return;
    }

    this.addressSearchTimer = setTimeout(() => {
      const url =
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(addressText)}` +
        `&filter=countrycode:ca` +
        `&bias=countrycode:ca` +
        `&format=json` +
        `&apiKey=${this.geoapifyApiKey}`;

      fetch(url)
        .then(response => response.json())
        .then(data => {
          this.addressSuggestions = data.results || [];
          this.cdr.detectChanges();
        })
        .catch(error => {
          console.error('adress autocomplete error:', error);
          this.addressSuggestions = [];
          this.cdr.detectChanges();
        });
    }, 400);
  }





  // this fills adress fields after user pick one in edit
  selectAddress(suggestion: any): void {
    if (!this.author) {
      return;
    }

    this.author.address = suggestion.address_line1 || '';
    this.author.city = suggestion.city || suggestion.town || suggestion.village || '';
    this.author.state = suggestion.state_code || 'ON';
    this.author.zip = suggestion.postcode || '';

    this.formatState();
    this.formatZip();

    this.addressSuggestions = [];
    this.cdr.detectChanges();
  }









    //for returning 
  goBack(): void {
    this.router.navigate(['/authors']);
  }

  private validateAuthor(author: Author): string {
    const phonePattern = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/;
    const zipPattern = /^[0-9]{5}$/;

    if (!author.au_fname.trim()) {
      return 'First name is required.';
    }

    if (!author.au_lname.trim()) {
      return 'Last name is required.';
    }

    if (!author.phone.trim()) {
      return 'Phone is required.';
    }

    if (!phonePattern.test(author.phone)) {
      return 'Phone must be in this format: 905-555-1234.';
    }

    if (!author.address?.trim()) {
      return 'Address is required.';
    }

    if (!author.city?.trim()) {
      return 'City is required.';
    }

    if (!author.state?.trim()) {
      return 'State is required.';
    }

    if (author.state.length !== 2) {
      return 'State must be exactly 2 characters.';
    }

    if (!author.zip?.trim()) {
      return 'Zip is required.';
    }

    if (!zipPattern.test(author.zip)) {
      return 'Zip must be exactly 5 digits.';
    }

    return '';
  }







// formating methods 
formatPhone(): void {
  if (!this.author) {
    return;
  }

  // remove everything that is not a number
  let digitsOnly = this.author.phone.replace(/\D/g, '');

  // phone format is ###-###-####
  digitsOnly = digitsOnly.substring(0, 10);

  if (digitsOnly.length > 6) {
    this.author.phone =
      digitsOnly.substring(0, 3) +
      '-' +
      digitsOnly.substring(3, 6) +
      '-' +
      digitsOnly.substring(6);
  } else if (digitsOnly.length > 3) {
    this.author.phone =
      digitsOnly.substring(0, 3) +
      '-' +
      digitsOnly.substring(3);
  } else {
    this.author.phone = digitsOnly;
  }
}


formatZip(): void {
  if (!this.author) {
    return;
  }

  // zip must be numbers only and maximum 5 digits
  this.author.zip = this.author.zip
    ?.replace(/\D/g, '')
    .substring(0, 5) || '';
}


formatState(): void {
  if (!this.author) {
    return;
  }

  // state should only allow letters and should be uppercase
  this.author.state = this.author.state
    ?.replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .substring(0, 2) || '';
}




// allowing only number characters to be inputed 
allowOnlyNumbers(event: KeyboardEvent): void {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End'
  ];

  // allow control keys like backspace, delete, arrows, tab
  if (allowedKeys.includes(event.key)) {
    return;
  }

  // allow copy, paste, cut, select all
  if (event.ctrlKey || event.metaKey) {
    return;
  }

  // block anything that is not a number
  if (!/^[0-9]$/.test(event.key)) {
    event.preventDefault();
  }
}


allowOnlyLetters(event: KeyboardEvent): void {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End'
  ];

  // allow control keys like backspace, delete, arrows, tab
  if (allowedKeys.includes(event.key)) {
    return;
  }

  // allow copy, paste, cut, select all
  if (event.ctrlKey || event.metaKey) {
    return;
  }

  // block anything that is not a letter
  if (!/^[a-zA-Z]$/.test(event.key)) {
    event.preventDefault();
  }
}

}
