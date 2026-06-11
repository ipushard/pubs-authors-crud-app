import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import { AuthorService } from '../services/author';
import { Author } from '../models/author';


@Component({
  selector: 'app-author-create',
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule

  ],
  templateUrl: './author-create.html',
  styleUrl: './author-create.css'
})
export class AuthorCreate implements OnInit {

  newAuthor: Author = {
    au_id: '',
    au_lname: '',
    au_fname: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    contract: false,
    is_active: true,
  };

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
    private authorService: AuthorService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}





  // runs when create page opens
ngOnInit(): void {
this.generateUniqueAuthorId();
}

// this makes random author id and checks existing id in database
private generateUniqueAuthorId(): void {
this.authorService.getAuthors('all').subscribe({
next: (authors) => {
let newId = this.createRandomAuthorId();


    // keep making new id untill it is not already used
    while (authors.some(author => author.au_id === newId)) {
      newId = this.createRandomAuthorId();
    }

    this.newAuthor.au_id = newId;
    this.cdr.detectChanges();
  },

  error: (err) => {
    console.error('Error loading authors for random id:', err);

    // fallback id if api has small issue
    this.newAuthor.au_id = this.createRandomAuthorId();
    this.cdr.detectChanges();
  }
});


}

// this makes id in format ###-##-####
private createRandomAuthorId(): string {
const firstPart = Math.floor(100 + Math.random() * 900).toString();
const secondPart = Math.floor(10 + Math.random() * 90).toString();
const thirdPart = Math.floor(1000 + Math.random() * 9000).toString();


return `${firstPart}-${secondPart}-${thirdPart}`;


}












  saveAuthor(form: NgForm): void {
// submitted is used to show validation errors after user clicks save
this.submitted = true;


// clear old messages before trying to save again
this.errorMessage = '';
this.successMessage = '';

// clear old backend duplicate errors
this.duplicateErrors = [];

// force angular to clear old errors right away
this.cdr.detectChanges();

// if angular form validation fails, stop here
if (form.invalid) {
  return;
}

// extra validation method, keeping it because you already had it
const validationError = this.validateAuthor();

if (validationError) {
  this.errorMessage = validationError;
  this.cdr.detectChanges();
  return;
}

// send the new author to the backend api
this.authorService.createAuthor(this.newAuthor).subscribe({
  next: () => {
const authorName = `${this.newAuthor.au_fname} ${this.newAuthor.au_lname}`;


    this.router.navigate(['/authors'], {
      queryParams: {
        createdAuthorName: authorName,
        createdAuthorId: this.newAuthor.au_id
      }
    });
  },



  error: (err) => {
    console.error('Error creating author:', err);

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

    // database format error fallback
    if (err.error?.error?.includes('CHECK constraint')) {
      this.errorMessage = 'Invalid format. Author ID must be like 111-22-3333 and zip must be 5 digits.';
      this.cdr.detectChanges();
      return;
    }

    // general fallback error
    this.errorMessage = err.error?.message || 'Could not create author. Please check the form and try again.';
    this.cdr.detectChanges();
  }
});


  }













  // this gets adress sugestions when user start typing
  searchAddress(): void {
    const addressText = this.newAuthor.address;

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





  // this fills adress fields after user pick one
  selectAddress(suggestion: any): void {
    this.newAuthor.address = suggestion.address_line1 || '';
    this.newAuthor.city = suggestion.city || suggestion.town || suggestion.village || '';
    this.newAuthor.state = suggestion.state_code || 'ON';
    this.newAuthor.zip = suggestion.postcode || '';

    this.formatState();
    this.formatZip();

    this.addressSuggestions = [];
    this.cdr.detectChanges();
  }









  cancel(): void {
    this.router.navigate(['/authors']);
  }







  private validateAuthor(): string {
    const authorIdPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;
    const phonePattern = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/;
    const zipPattern = /^[0-9]{5}$/;

    if (!this.newAuthor.au_id.trim()) {
      return 'Author ID is required.';
    }

    if (!authorIdPattern.test(this.newAuthor.au_id)) {
      return 'Author ID must be in this format: 111-22-3333.';
    }

    if (!this.newAuthor.au_fname.trim()) {
      return 'First name is required.';
    }

    if (!this.newAuthor.au_lname.trim()) {
      return 'Last name is required.';
    }

    if (!this.newAuthor.phone.trim()) {
      return 'Phone number is required.';
    }

    if (!phonePattern.test(this.newAuthor.phone)) {
      return 'Phone number must be in this format: 905-555-1234.';
    }

    if (!this.newAuthor.address?.trim()) {
      return 'Address is required.';
    }

    if (!this.newAuthor.city?.trim()) {
      return 'City is required.';
    }

    if (!this.newAuthor.state?.trim()) {
      return 'State is required.';
    }

    if (this.newAuthor.state.length !== 2) {
      return 'State must be exactly 2 characters, for example ON, CA, NY.';
    }

    if (!this.newAuthor.zip?.trim()) {
      return 'Zip is required.';
    }

    if (!zipPattern.test(this.newAuthor.zip)) {
      return 'Zip must be exactly 5 digits.';
    }

    return '';
  }












// formating methods 
formatAuthorId(): void {
  // remove everything that is not a number
  let digitsOnly = this.newAuthor.au_id.replace(/\D/g, '');

  // author id format is ###-##-####
  digitsOnly = digitsOnly.substring(0, 9);

  if (digitsOnly.length > 5) {
    this.newAuthor.au_id =
      digitsOnly.substring(0, 3) +
      '-' +
      digitsOnly.substring(3, 5) +
      '-' +
      digitsOnly.substring(5);
  } else if (digitsOnly.length > 3) {
    this.newAuthor.au_id =
      digitsOnly.substring(0, 3) +
      '-' +
      digitsOnly.substring(3);
  } else {
    this.newAuthor.au_id = digitsOnly;
  }
}


formatPhone(): void {
  // remove everything that is not a number
  let digitsOnly = this.newAuthor.phone.replace(/\D/g, '');

  // phone format is ###-###-####
  digitsOnly = digitsOnly.substring(0, 10);

  if (digitsOnly.length > 6) {
    this.newAuthor.phone =
      digitsOnly.substring(0, 3) +
      '-' +
      digitsOnly.substring(3, 6) +
      '-' +
      digitsOnly.substring(6);
  } else if (digitsOnly.length > 3) {
    this.newAuthor.phone =
      digitsOnly.substring(0, 3) +
      '-' +
      digitsOnly.substring(3);
  } else {
    this.newAuthor.phone = digitsOnly;
  }
}


formatZip(): void {
  // zip must be numbers only and maximum 5 digits
  this.newAuthor.zip = this.newAuthor.zip
    ?.replace(/\D/g, '')
    .substring(0, 5) || '';
}


formatState(): void {
  // state should only allow letters and should be uppercase
  this.newAuthor.state = this.newAuthor.state
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

