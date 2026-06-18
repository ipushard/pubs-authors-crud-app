import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminSaleService } from '../services/admin-sale';

import {
  AdminSale,
  SaleCreateRequest,
  SaleUpdateRequest,
  SalesStore,
  SalesTitle
} from '../models/admin-sale';

@Component({
  selector: 'app-manage-sales',
  imports: [
    FormsModule,
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './manage-sales.html',
  styleUrl: './manage-sales.css'
})
export class ManageSales implements OnInit {

  // store all sales from database
  sales: AdminSale[] = [];

  // filtered sales after search/filter/sort
  filteredSales: AdminSale[] = [];

  // sales shown on current page
  pagedSales: AdminSale[] = [];

  // dropdown data
  stores: SalesStore[] = [];

  titles: SalesTitle[] = [];

  availablePublishers: string[] = [];

  searchTerm = '';

  selectedStore = 'all';

  selectedPublisher = 'all';

  selectedTitle = 'all';

  selectedSort = 'dateNewest';

  dateFrom = '';

  dateTo = '';

  showFilters = false;

  errorMessage = '';

  successMessage = '';

  isLoading = false;

  isSaving = false;

  // create/edit sale form
  showSaleForm = false;

  isEditMode = false;

  editingStoreId: string | null = null;

  editingOrderNumber: string | null = null;

  editingTitleId: string | null = null;

  formStoreId = '';

  formOrderNumber = '';

  formOrderDate = '';

  formQty: number | null = 1;

  formPayterms = '';

  formTitleId = '';

  // fancy summary / pdf / email
  selectedSaleForSummary: AdminSale | null = null;

  showSummaryPanel = false;

  showEmailPanel = false;

  emailTo = '';

  // dashboard numbers
  totalSalesRecords = 0;

  totalQuantitySold = 0;

  totalEstimatedRevenue = 0;

  topSellingTitle = 'N/A';

  // pagination variables
  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;

  constructor(
    private adminSaleService: AdminSaleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadSales();
    this.loadStores();
    this.loadTitles();
  }

  loadSales(clearMessages: boolean = true): void {
    this.isLoading = true;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }

    this.adminSaleService.getSales().subscribe({
      next: (data) => {
        this.sales = data;

        this.setPublisherList();
        this.setDashboardNumbers();
        this.applyFiltersAndSort();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sales:', err);

        this.errorMessage =
          err.error?.message ||
          'Could not load sales. Make sure the backend server is running and your account has sales access.';

        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadStores(): void {
    this.adminSaleService.getStores().subscribe({
      next: (data) => {
        this.stores = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading stores:', err);

        this.errorMessage = 'Could not load stores for the sales form.';
        this.cdr.detectChanges();
      }
    });
  }

  loadTitles(): void {
    this.adminSaleService.getTitles().subscribe({
      next: (data) => {
        this.titles = data;
        this.setPublisherList();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading titles:', err);

        this.errorMessage = 'Could not load titles for the sales form.';
        this.cdr.detectChanges();
      }
    });
  }

  private setPublisherList(): void {
    const publisherNamesFromSales = this.sales
      .map(sale => sale.pub_name ? sale.pub_name.trim() : '')
      .filter(name => !!name);

    const publisherNamesFromTitles = this.titles
      .map(title => title.pub_name ? title.pub_name.trim() : '')
      .filter(name => !!name);

    this.availablePublishers = [
      ...new Set([
        ...publisherNamesFromSales,
        ...publisherNamesFromTitles
      ])
    ].sort();
  }

  // this sets dashboard card numbers on top of page
  private setDashboardNumbers(): void {
    this.totalSalesRecords = this.sales.length;

    this.totalQuantitySold = this.sales.reduce((sum, sale) => {
      return sum + Number(sale.qty ?? 0);
    }, 0);

    this.totalEstimatedRevenue = this.sales.reduce((sum, sale) => {
      return sum + this.getSaleRevenue(sale);
    }, 0);

    this.topSellingTitle = this.findTopSellingTitle();
  }

  private findTopSellingTitle(): string {
    if (this.sales.length === 0) {
      return 'N/A';
    }

    const titleSalesMap = new Map<string, number>();

    this.sales.forEach((sale) => {
      const titleName = sale.title || sale.title_id;
      const currentQty = titleSalesMap.get(titleName) ?? 0;

      titleSalesMap.set(titleName, currentQty + Number(sale.qty ?? 0));
    });

    let topTitle = 'N/A';
    let topQty = 0;

    titleSalesMap.forEach((qty, titleName) => {
      if (qty > topQty) {
        topQty = qty;
        topTitle = titleName;
      }
    });

    return topTitle;
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

    let result = [...this.sales];

    if (term) {
      result = result.filter(sale =>
        sale.stor_id.toLowerCase().includes(term) ||
        sale.ord_num.toLowerCase().includes(term) ||
        sale.title_id.toLowerCase().includes(term) ||
        sale.payterms.toLowerCase().includes(term) ||
        (sale.stor_name ?? '').toLowerCase().includes(term) ||
        (sale.store_city ?? '').toLowerCase().includes(term) ||
        (sale.store_state ?? '').toLowerCase().includes(term) ||
        (sale.title ?? '').toLowerCase().includes(term) ||
        (sale.type ?? '').toLowerCase().includes(term) ||
        (sale.pub_name ?? '').toLowerCase().includes(term) ||
        String(sale.qty ?? '').includes(term) ||
        String(sale.estimated_revenue ?? '').includes(term)
      );
    }

    if (this.selectedStore !== 'all') {
      result = result.filter(sale =>
        sale.stor_id === this.selectedStore
      );
    }

    if (this.selectedPublisher !== 'all') {
      result = result.filter(sale =>
        (sale.pub_name ?? '').trim() === this.selectedPublisher
      );
    }

    if (this.selectedTitle !== 'all') {
      result = result.filter(sale =>
        sale.title_id === this.selectedTitle
      );
    }

    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);

      result = result.filter(sale =>
        new Date(sale.ord_date) >= fromDate
      );
    }

    if (this.dateTo) {
      const toDate = new Date(this.dateTo);

      toDate.setHours(23, 59, 59, 999);

      result = result.filter(sale =>
        new Date(sale.ord_date) <= toDate
      );
    }

    result.sort((a, b) => this.sortSales(a, b));

    this.filteredSales = result;

    this.currentPage = 1;

    this.updatePagedSales();

    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.clearSuccessMessage();

    this.searchTerm = '';
    this.selectedStore = 'all';
    this.selectedPublisher = 'all';
    this.selectedTitle = 'all';
    this.selectedSort = 'dateNewest';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;

    this.applyFiltersAndSort();
  }

  private sortSales(a: AdminSale, b: AdminSale): number {
    switch (this.selectedSort) {
      case 'dateNewest':
        return new Date(b.ord_date).getTime() - new Date(a.ord_date).getTime();

      case 'dateOldest':
        return new Date(a.ord_date).getTime() - new Date(b.ord_date).getTime();

      case 'orderAsc':
        return this.compareText(a.ord_num, b.ord_num);

      case 'orderDesc':
        return this.compareText(b.ord_num, a.ord_num);

      case 'storeAsc':
        return this.compareText(a.stor_name ?? a.stor_id, b.stor_name ?? b.stor_id);

      case 'storeDesc':
        return this.compareText(b.stor_name ?? b.stor_id, a.stor_name ?? a.stor_id);

      case 'titleAsc':
        return this.compareText(a.title ?? a.title_id, b.title ?? b.title_id);

      case 'titleDesc':
        return this.compareText(b.title ?? b.title_id, a.title ?? a.title_id);

      case 'qtyHigh':
        return Number(b.qty ?? 0) - Number(a.qty ?? 0);

      case 'qtyLow':
        return Number(a.qty ?? 0) - Number(b.qty ?? 0);

      case 'revenueHigh':
        return this.getSaleRevenue(b) - this.getSaleRevenue(a);

      case 'revenueLow':
        return this.getSaleRevenue(a) - this.getSaleRevenue(b);

      default:
        return new Date(b.ord_date).getTime() - new Date(a.ord_date).getTime();
    }
  }

  private compareText(a: string, b: string): number {
    return a.localeCompare(b);
  }

  updatePagedSales(): void {
    this.totalPages = Math.ceil(this.filteredSales.length / this.pageSize);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedSales = this.filteredSales.slice(startIndex, endIndex);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) {
      return;
    }

    this.currentPage = page;
    this.updatePagedSales();
    this.cdr.detectChanges();
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagedSales();
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
    if (this.filteredSales.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    return Math.min(end, this.filteredSales.length);
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showSaleForm = true;
    this.isEditMode = false;

    this.editingStoreId = null;
    this.editingOrderNumber = null;
    this.editingTitleId = null;

    this.formStoreId = '';
    this.formOrderNumber = '';
    this.formOrderDate = this.getTodayForInput();
    this.formQty = 1;
    this.formPayterms = 'Net 30';
    this.formTitleId = '';

    this.cdr.detectChanges();
  }

  openEditForm(sale: AdminSale): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showSaleForm = true;
    this.isEditMode = true;

    this.editingStoreId = sale.stor_id;
    this.editingOrderNumber = sale.ord_num;
    this.editingTitleId = sale.title_id;

    this.formStoreId = sale.stor_id;
    this.formOrderNumber = sale.ord_num;
    this.formOrderDate = this.formatDateForInput(sale.ord_date);
    this.formQty = Number(sale.qty);
    this.formPayterms = sale.payterms;
    this.formTitleId = sale.title_id;

    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showSaleForm = false;
    this.isEditMode = false;

    this.editingStoreId = null;
    this.editingOrderNumber = null;
    this.editingTitleId = null;

    this.formStoreId = '';
    this.formOrderNumber = '';
    this.formOrderDate = '';
    this.formQty = null;
    this.formPayterms = '';
    this.formTitleId = '';

    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  saveSale(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const validationError = this.validateSaleForm();

    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    if (
      this.isEditMode &&
      this.editingStoreId !== null &&
      this.editingOrderNumber !== null &&
      this.editingTitleId !== null
    ) {
      const updateData: SaleUpdateRequest = {
        ord_date: this.formOrderDate,
        qty: Number(this.formQty),
        payterms: this.formPayterms.trim()
      };

      this.updateSale(
        this.editingStoreId,
        this.editingOrderNumber,
        this.editingTitleId,
        updateData
      );

      return;
    }

    const createData: SaleCreateRequest = {
      stor_id: this.formStoreId,
      ord_num: this.formOrderNumber.trim(),
      ord_date: this.formOrderDate,
      qty: Number(this.formQty),
      payterms: this.formPayterms.trim(),
      title_id: this.formTitleId
    };

    this.createSale(createData);
  }

  private validateSaleForm(): string {
    if (!this.formStoreId) {
      return 'Store is required.';
    }

    if (!this.formOrderNumber || !this.formOrderNumber.trim()) {
      return 'Order number is required.';
    }

    if (this.formOrderNumber.trim().length > 20) {
      return 'Order number cannot be longer than 20 characters.';
    }

    if (!this.formOrderDate) {
      return 'Order date is required.';
    }

    if (this.formQty === null || this.formQty === undefined) {
      return 'Quantity is required.';
    }

    const quantity = Number(this.formQty);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return 'Quantity must be a whole number greater than 0.';
    }

    if (!this.formPayterms || !this.formPayterms.trim()) {
      return 'Pay terms are required.';
    }

    if (this.formPayterms.trim().length > 12) {
      return 'Pay terms cannot be longer than 12 characters.';
    }

    if (!this.formTitleId) {
      return 'Title is required.';
    }

    return '';
  }

  createSale(saleData: SaleCreateRequest): void {
    this.isSaving = true;

    this.adminSaleService.createSale(saleData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.loadSales(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating sale:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not create sale.';

        this.cdr.detectChanges();
      }
    });
  }

  updateSale(
    storeId: string,
    orderNumber: string,
    titleId: string,
    saleData: SaleUpdateRequest
  ): void {
    this.isSaving = true;

    this.adminSaleService.updateSale(storeId, orderNumber, titleId, saleData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.loadSales(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating sale:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not update sale.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteSale(sale: AdminSale): void {
    this.errorMessage = '';
    this.successMessage = '';

    const confirmed = confirm(
      `Are you sure you want to delete this sale?\n\nOrder: ${sale.ord_num}\nStore: ${sale.stor_name || sale.stor_id}\nTitle: ${sale.title || sale.title_id}`
    );

    if (!confirmed) {
      return;
    }

    this.isSaving = true;

    this.adminSaleService.deleteSale(
      sale.stor_id,
      sale.ord_num,
      sale.title_id
    ).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.successMessage = response.message;

        this.loadSales(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting sale:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not delete sale.';

        this.cdr.detectChanges();
      }
    });
  }

  openSummaryPanel(sale: AdminSale): void {
    this.selectedSaleForSummary = sale;
    this.showSummaryPanel = true;
    this.showEmailPanel = false;
    this.emailTo = '';
    this.cdr.detectChanges();
  }

  closeSummaryPanel(): void {
    this.selectedSaleForSummary = null;
    this.showSummaryPanel = false;
    this.showEmailPanel = false;
    this.emailTo = '';
    this.cdr.detectChanges();
  }

  openEmailPanel(): void {
    if (!this.selectedSaleForSummary) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.showEmailPanel = true;
    this.cdr.detectChanges();
  }

  cancelEmailPanel(): void {
    this.showEmailPanel = false;
    this.emailTo = '';
    this.cdr.detectChanges();
  }

  sendSaleSummaryEmail(): void {
    if (!this.selectedSaleForSummary) {
      return;
    }

    if (!this.emailTo || !this.emailTo.trim()) {
      this.errorMessage = 'Recipient email is required.';
      this.cdr.detectChanges();
      return;
    }

    const cleanEmail = this.emailTo.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      this.errorMessage = 'Enter a valid email address.';
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminSaleService.emailSaleSummary({
      to: cleanEmail,
      sale: this.selectedSaleForSummary
    }).subscribe({
      next: (response) => {
        this.isSaving = false;
        this.successMessage = response.message;
        this.showEmailPanel = false;
        this.emailTo = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error emailing sale summary:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not send sale summary email.';

        this.cdr.detectChanges();
      }
    });
  }

  printSaleSummary(): void {
  if (!this.selectedSaleForSummary) {
    return;
  }

  const sale = this.selectedSaleForSummary;

  const printWindow = window.open('', '_blank', 'width=1000,height=800');

  if (!printWindow) {
    this.errorMessage = 'Could not open print window. Please allow pop-ups for this site.';
    this.cdr.detectChanges();
    return;
  }

  const formatCleanDate = (value: string | Date | null | undefined): string => {
    if (!value) {
      return 'N/A';
    }

    const rawValue = String(value);

    if (rawValue.includes('T')) {
      const dateOnly = rawValue.split('T')[0];
      const dateParts = dateOnly.split('-').map(Number);

      if (dateParts.length === 3) {
        const cleanDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

        return cleanDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return rawValue;
    }

    return dateValue.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const orderDate = formatCleanDate(sale.ord_date);

  const generatedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const storeName = this.escapeHtml(sale.stor_name || sale.stor_id);
  const storeLocation = this.escapeHtml(this.getStoreLocation(sale));
  const titleName = this.escapeHtml(sale.title || sale.title_id);
  const publisherName = this.escapeHtml(sale.pub_name || 'N/A');

  const unitPrice = this.formatMoney(Number(sale.price ?? 0));
  const estimatedRevenue = this.formatMoney(this.getSaleRevenue(sale));

  const htmlParts: string[] = [];

  htmlParts.push('<!DOCTYPE html>');
  htmlParts.push('<html>');
  htmlParts.push('<head>');
  htmlParts.push('<meta charset="utf-8">');
  htmlParts.push('<title>Sales Order Summary - ' + this.escapeHtml(sale.ord_num) + '</title>');

  htmlParts.push('<style>');
  htmlParts.push('* { box-sizing: border-box; }');
  htmlParts.push('body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #1a1a1a; background-color: #f3f5f7; }');
  htmlParts.push('.page { width: 8.5in; min-height: 11in; margin: 24px auto; background-color: #ffffff; padding: 42px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18); }');
  htmlParts.push('.top-bar { height: 10px; background: linear-gradient(90deg, #0066cc, #137333); margin: -42px -42px 34px -42px; }');
  htmlParts.push('.header { display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; align-items: start; border-bottom: 2px solid #1a1a1a; padding-bottom: 24px; margin-bottom: 28px; }');
  htmlParts.push('.brand-title { font-size: 30px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }');
  htmlParts.push('.brand-subtitle { margin-top: 6px; font-size: 13px; color: #555555; line-height: 1.5; }');
  htmlParts.push('.doc-box { border: 1px solid #d6d6d6; padding: 16px; background-color: #fafafa; }');
  htmlParts.push('.doc-label { font-size: 11px; text-transform: uppercase; color: #555555; font-weight: 700; letter-spacing: 0.5px; }');
  htmlParts.push('.doc-number { font-size: 22px; font-weight: 800; margin-top: 4px; color: #0066cc; }');
  htmlParts.push('.doc-meta { margin-top: 12px; font-size: 12px; color: #333333; line-height: 1.7; }');
  htmlParts.push('.status-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }');
  htmlParts.push('.status-card { border: 1px solid #d6d6d6; border-left: 5px solid #0066cc; padding: 14px; background-color: #ffffff; }');
  htmlParts.push('.status-card.green { border-left-color: #137333; background-color: #f3fbf6; }');
  htmlParts.push('.status-card.dark { border-left-color: #1a1a1a; }');
  htmlParts.push('.status-card span { display: block; font-size: 11px; text-transform: uppercase; color: #555555; font-weight: 700; margin-bottom: 6px; }');
  htmlParts.push('.status-card strong { display: block; font-size: 18px; color: #1a1a1a; }');
  htmlParts.push('.section-title { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; margin: 30px 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #d6d6d6; }');
  htmlParts.push('.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }');
  htmlParts.push('.info-box { border: 1px solid #d6d6d6; padding: 16px; min-height: 110px; }');
  htmlParts.push('.info-box h3 { margin: 0 0 12px 0; font-size: 15px; color: #0066cc; }');
  htmlParts.push('.info-line { display: grid; grid-template-columns: 120px 1fr; gap: 10px; margin: 8px 0; font-size: 13px; }');
  htmlParts.push('.info-line span { color: #555555; font-weight: 700; }');
  htmlParts.push('.info-line strong { color: #1a1a1a; font-weight: 600; }');
  htmlParts.push('table { width: 100%; border-collapse: collapse; margin-top: 12px; }');
  htmlParts.push('th { background-color: #1a1a1a; color: #ffffff; text-align: left; padding: 12px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.3px; }');
  htmlParts.push('td { border-bottom: 1px solid #d6d6d6; padding: 14px 10px; font-size: 13px; vertical-align: top; }');
  htmlParts.push('.title-cell strong { display: block; font-size: 14px; margin-bottom: 4px; }');
  htmlParts.push('.muted { color: #666666; font-size: 12px; }');
  htmlParts.push('.text-right { text-align: right; }');
  htmlParts.push('.summary-total { margin-top: 22px; display: flex; justify-content: flex-end; }');
  htmlParts.push('.total-box { width: 330px; border: 2px solid #137333; background-color: #f3fbf6; }');
  htmlParts.push('.total-row { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #c7e8d1; font-size: 14px; }');
  htmlParts.push('.total-row.final { border-bottom: none; background-color: #137333; color: #ffffff; font-size: 20px; font-weight: 800; }');
  htmlParts.push('.notes { margin-top: 30px; border: 1px solid #d6d6d6; padding: 16px; background-color: #fafafa; font-size: 12px; color: #444444; line-height: 1.6; }');
  htmlParts.push('.footer { margin-top: 34px; padding-top: 16px; border-top: 1px solid #d6d6d6; display: flex; justify-content: space-between; gap: 20px; font-size: 11px; color: #666666; }');
  htmlParts.push('.confidential { color: #a50e0e; font-weight: 800; text-transform: uppercase; }');
  htmlParts.push('@media print { body { background-color: #ffffff; } .page { width: auto; min-height: auto; margin: 0; padding: 32px; box-shadow: none; } .top-bar { margin: -32px -32px 30px -32px; } }');
  htmlParts.push('</style>');

  htmlParts.push('</head>');
  htmlParts.push('<body>');

  htmlParts.push('<main class="page">');
  htmlParts.push('<div class="top-bar"></div>');

  htmlParts.push('<section class="header">');

  htmlParts.push('<div>');
  htmlParts.push('<h1 class="brand-title">Pubs Sales Management</h1>');
  htmlParts.push('<div class="brand-subtitle">');
  htmlParts.push('Professional Sales Order Summary<br>');
  htmlParts.push('Generated from the protected sales reporting area');
  htmlParts.push('</div>');
  htmlParts.push('</div>');

  htmlParts.push('<div class="doc-box">');
  htmlParts.push('<div class="doc-label">Sales Order Summary</div>');
  htmlParts.push('<div class="doc-number">' + this.escapeHtml(sale.ord_num) + '</div>');
  htmlParts.push('<div class="doc-meta">');
  htmlParts.push('<div><strong>Order Date:</strong> ' + orderDate + '</div>');
  htmlParts.push('<div><strong>Generated:</strong> ' + generatedDate + '</div>');
  htmlParts.push('<div><strong>Store ID:</strong> ' + this.escapeHtml(sale.stor_id) + '</div>');
  htmlParts.push('<div><strong>Title ID:</strong> ' + this.escapeHtml(sale.title_id) + '</div>');
  htmlParts.push('</div>');
  htmlParts.push('</div>');

  htmlParts.push('</section>');

  htmlParts.push('<section class="status-row">');

  htmlParts.push('<div class="status-card dark">');
  htmlParts.push('<span>Payment Terms</span>');
  htmlParts.push('<strong>' + this.escapeHtml(sale.payterms) + '</strong>');
  htmlParts.push('</div>');

  htmlParts.push('<div class="status-card">');
  htmlParts.push('<span>Quantity Sold</span>');
  htmlParts.push('<strong>' + sale.qty + '</strong>');
  htmlParts.push('</div>');

  htmlParts.push('<div class="status-card green">');
  htmlParts.push('<span>Estimated Revenue</span>');
  htmlParts.push('<strong>$' + estimatedRevenue + '</strong>');
  htmlParts.push('</div>');

  htmlParts.push('</section>');

  htmlParts.push('<h2 class="section-title">Customer / Store Information</h2>');

  htmlParts.push('<section class="info-grid">');

  htmlParts.push('<div class="info-box">');
  htmlParts.push('<h3>Store Details</h3>');
  htmlParts.push('<div class="info-line"><span>Store Name</span><strong>' + storeName + '</strong></div>');
  htmlParts.push('<div class="info-line"><span>Store ID</span><strong>' + this.escapeHtml(sale.stor_id) + '</strong></div>');
  htmlParts.push('<div class="info-line"><span>Location</span><strong>' + storeLocation + '</strong></div>');
  htmlParts.push('</div>');

  htmlParts.push('<div class="info-box">');
  htmlParts.push('<h3>Publisher Details</h3>');
  htmlParts.push('<div class="info-line"><span>Publisher</span><strong>' + publisherName + '</strong></div>');
  htmlParts.push('<div class="info-line"><span>Publisher ID</span><strong>' + this.escapeHtml(sale.pub_id || 'N/A') + '</strong></div>');
  htmlParts.push('<div class="info-line"><span>Book Type</span><strong>' + this.escapeHtml(sale.type || 'N/A') + '</strong></div>');
  htmlParts.push('</div>');

  htmlParts.push('</section>');

  htmlParts.push('<h2 class="section-title">Order Line Item</h2>');

  htmlParts.push('<table>');
  htmlParts.push('<thead>');
  htmlParts.push('<tr>');
  htmlParts.push('<th>Title</th>');
  htmlParts.push('<th>Title ID</th>');
  htmlParts.push('<th class="text-right">Unit Price</th>');
  htmlParts.push('<th class="text-right">Qty</th>');
  htmlParts.push('<th class="text-right">Estimated Revenue</th>');
  htmlParts.push('</tr>');
  htmlParts.push('</thead>');

  htmlParts.push('<tbody>');
  htmlParts.push('<tr>');
  htmlParts.push('<td class="title-cell"><strong>' + titleName + '</strong><span class="muted">' + publisherName + '</span></td>');
  htmlParts.push('<td>' + this.escapeHtml(sale.title_id) + '</td>');
  htmlParts.push('<td class="text-right">$' + unitPrice + '</td>');
  htmlParts.push('<td class="text-right">' + sale.qty + '</td>');
  htmlParts.push('<td class="text-right">$' + estimatedRevenue + '</td>');
  htmlParts.push('</tr>');
  htmlParts.push('</tbody>');
  htmlParts.push('</table>');

  htmlParts.push('<section class="summary-total">');
  htmlParts.push('<div class="total-box">');

  htmlParts.push('<div class="total-row">');
  htmlParts.push('<span>Subtotal</span>');
  htmlParts.push('<strong>$' + estimatedRevenue + '</strong>');
  htmlParts.push('</div>');

  htmlParts.push('<div class="total-row final">');
  htmlParts.push('<span>Total Estimated Revenue</span>');
  htmlParts.push('<strong>$' + estimatedRevenue + '</strong>');
  htmlParts.push('</div>');

  htmlParts.push('</div>');
  htmlParts.push('</section>');

  htmlParts.push('<section class="notes">');
  htmlParts.push('<strong>Report Notes:</strong> ');
  htmlParts.push('This document is generated for internal business reporting purposes. ');
  htmlParts.push('Estimated revenue is calculated using the title price multiplied by quantity sold. ');
  htmlParts.push('Final accounting totals may differ if discounts, refunds, or other adjustments apply.');
  htmlParts.push('</section>');

  htmlParts.push('<footer class="footer">');
  htmlParts.push('<div>Pubs Sales Management • Sales Order Summary</div>');
  htmlParts.push('<div class="confidential">Confidential Sales Information</div>');
  htmlParts.push('</footer>');

  htmlParts.push('</main>');
  htmlParts.push('</body>');
  htmlParts.push('</html>');

  const html = htmlParts.join('');

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);
}

  getSelectedTitlePrice(): number {
    const selectedTitle = this.titles.find(title =>
      title.title_id === this.formTitleId
    );

    return Number(selectedTitle?.price ?? 0);
  }

  getFormEstimatedRevenue(): number {
    const quantity = Number(this.formQty ?? 0);
    const price = this.getSelectedTitlePrice();

    return quantity * price;
  }

  getSaleRevenue(sale: AdminSale): number {
    if (sale.estimated_revenue !== null && sale.estimated_revenue !== undefined) {
      return Number(sale.estimated_revenue);
    }

    return Number(sale.qty ?? 0) * Number(sale.price ?? 0);
  }

  getStoreLocation(sale: AdminSale): string {
    const city = sale.store_city ?? '';
    const state = sale.store_state ?? '';

    const location = `${city} ${state}`.trim();

    return location || 'N/A';
  }

  getTodayForInput(): string {
    const today = new Date();

    return today.toISOString().slice(0, 10);
  }

  formatDateForInput(value: string): string {
    if (!value) {
      return this.getTodayForInput();
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return this.getTodayForInput();
    }

    return dateValue.toISOString().slice(0, 10);
  }

  formatDateForDisplay(value: string): string {
    if (!value) {
      return 'N/A';
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return value;
    }

    return dateValue.toLocaleDateString();
  }

  formatMoney(value: number): string {
    return Number(value ?? 0).toFixed(2);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}