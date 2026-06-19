import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminSaleService } from '../services/admin-sale';

import {
  AdminSale,
  SaleCreateRequest,
  SaleUpdateRequest,
  SalesOrder,
  SalesOrderCreateRequest,
  SalesOrderDetails,
  SalesStore,
  SalesTitle
} from '../models/admin-sale';

interface SalesOrderFormLine {
  title_id: string;
  qty: number | null;
}

type SalesFormMode = 'createOrder' | 'editLine';

@Component({
  selector: 'app-manage-sales',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    CurrencyPipe
  ],
  templateUrl: './manage-sales.html',
  styleUrl: './manage-sales.css'
})
export class ManageSales implements OnInit {

  sales: AdminSale[] = [];

  orders: SalesOrder[] = [];

  filteredOrders: SalesOrder[] = [];

  pagedOrders: SalesOrder[] = [];

  filteredSales: AdminSale[] = [];

  pagedSales: AdminSale[] = [];

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

  showSaleForm = false;

  formMode: SalesFormMode = 'createOrder';

  isEditMode = false;

  isAddingToExistingOrder = false;

  editingStoreId: string | null = null;

  editingOrderNumber: string | null = null;

  editingTitleId: string | null = null;

  formStoreId = '';

  formOrderNumber = '';

  formOrderDate = '';

  formPayterms = '';

  formTitleId = '';

  formQty: number | null = 1;

  formItems: SalesOrderFormLine[] = [];

  selectedOrderDetails: SalesOrderDetails | null = null;

  showOrderDetailsPanel = false;

  selectedOrderForSummary: SalesOrderDetails | null = null;

  selectedSaleForSummary: AdminSale | null = null;

  showSummaryPanel = false;

  showEmailPanel = false;

  emailTo = '';

  totalSalesRecords = 0;

  totalQuantitySold = 0;

  totalEstimatedRevenue = 0;

  topSellingTitle = 'N/A';

  currentPage = 1;

  pageSize = 10;

  pageSizeOptions = [5, 10, 20, 50];

  totalPages = 1;

  constructor(
    private adminSaleService: AdminSaleService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOrders();
    this.loadSales(false);
    this.loadStores();
    this.loadTitles();
  }

  loadOrders(clearMessages: boolean = true): void {
    this.isLoading = true;

    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }

    this.adminSaleService.getOrders().subscribe({
      next: (data) => {
        this.orders = data;

        this.setDashboardNumbers();
        this.applyFiltersAndSort();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sales orders:', err);

        this.errorMessage =
          err.error?.message ||
          'Could not load sales orders. Make sure the backend server is running and your account has sales access.';

        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSales(clearMessages: boolean = true): void {
    if (clearMessages) {
      this.errorMessage = '';
      this.successMessage = '';
    }

    this.adminSaleService.getSales().subscribe({
      next: (data) => {
        this.sales = data;

        this.setPublisherList();
        this.setDashboardNumbers();

        this.filteredSales = [...this.sales];
        this.pagedSales = [...this.sales];

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading sale items:', err);

        if (clearMessages) {
          this.errorMessage =
            err.error?.message ||
            'Could not load sale items.';
        }

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

  private refreshSalesData(clearMessages: boolean = false): void {
    this.loadOrders(clearMessages);
    this.loadSales(false);
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

  private setDashboardNumbers(): void {
    this.totalSalesRecords = this.orders.length;

    this.totalQuantitySold = this.orders.reduce((sum, order) => {
      return sum + Number(order.total_qty ?? 0);
    }, 0);

    this.totalEstimatedRevenue = this.orders.reduce((sum, order) => {
      return sum + this.getOrderRevenue(order);
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

    let result = [...this.orders];

    if (term) {
      result = result.filter(order =>
        order.stor_id.toLowerCase().includes(term) ||
        order.ord_num.toLowerCase().includes(term) ||
        order.payterms.toLowerCase().includes(term) ||
        (order.stor_name ?? '').toLowerCase().includes(term) ||
        (order.store_city ?? '').toLowerCase().includes(term) ||
        (order.store_state ?? '').toLowerCase().includes(term) ||
        String(order.line_count ?? '').includes(term) ||
        String(order.total_qty ?? '').includes(term) ||
        String(order.order_total ?? '').includes(term)
      );
    }

    if (this.selectedStore !== 'all') {
      result = result.filter(order =>
        order.stor_id === this.selectedStore
      );
    }

    if (this.selectedPublisher !== 'all' || this.selectedTitle !== 'all') {
      const matchingOrderKeys = this.getMatchingOrderKeysForLineFilters();

      result = result.filter(order =>
        matchingOrderKeys.has(this.getOrderKey(order.stor_id, order.ord_num))
      );
    }

    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);

      result = result.filter(order =>
        new Date(order.ord_date) >= fromDate
      );
    }

    if (this.dateTo) {
      const toDate = new Date(this.dateTo);

      toDate.setHours(23, 59, 59, 999);

      result = result.filter(order =>
        new Date(order.ord_date) <= toDate
      );
    }

    result.sort((a, b) => this.sortOrders(a, b));

    this.filteredOrders = result;

    this.currentPage = 1;

    this.updatePagedSales();

    this.cdr.detectChanges();
  }

  private getMatchingOrderKeysForLineFilters(): Set<string> {
    const keys = new Set<string>();

    this.sales.forEach((sale) => {
      const matchesPublisher =
        this.selectedPublisher === 'all' ||
        (sale.pub_name ?? '').trim() === this.selectedPublisher;

      const matchesTitle =
        this.selectedTitle === 'all' ||
        sale.title_id === this.selectedTitle;

      if (matchesPublisher && matchesTitle) {
        keys.add(this.getOrderKey(sale.stor_id, sale.ord_num));
      }
    });

    return keys;
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

  private sortOrders(a: SalesOrder, b: SalesOrder): number {
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

      case 'qtyHigh':
        return Number(b.total_qty ?? 0) - Number(a.total_qty ?? 0);

      case 'qtyLow':
        return Number(a.total_qty ?? 0) - Number(b.total_qty ?? 0);

      case 'revenueHigh':
        return this.getOrderRevenue(b) - this.getOrderRevenue(a);

      case 'revenueLow':
        return this.getOrderRevenue(a) - this.getOrderRevenue(b);

      case 'titleAsc':
        return this.compareText(a.ord_num, b.ord_num);

      case 'titleDesc':
        return this.compareText(b.ord_num, a.ord_num);

      default:
        return new Date(b.ord_date).getTime() - new Date(a.ord_date).getTime();
    }
  }

  private compareText(a: string, b: string): number {
    return a.localeCompare(b);
  }

  updatePagedSales(): void {
    this.totalPages = Math.ceil(this.filteredOrders.length / this.pageSize);

    if (this.totalPages === 0) {
      this.totalPages = 1;
    }

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    this.pagedOrders = this.filteredOrders.slice(startIndex, endIndex);
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
    if (this.filteredOrders.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecordNumber(): number {
    const end = this.currentPage * this.pageSize;

    return Math.min(end, this.filteredOrders.length);
  }

  openCreateForm(): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showSaleForm = true;
    this.formMode = 'createOrder';
    this.isEditMode = false;
    this.isAddingToExistingOrder = false;

    this.editingStoreId = null;
    this.editingOrderNumber = null;
    this.editingTitleId = null;

    this.formStoreId = '';
    this.formOrderNumber = this.generateNextOrderNumber();
    this.formOrderDate = this.getTodayForInput();
    this.formPayterms = 'Net 30';
    this.formTitleId = '';
    this.formQty = 1;

    this.formItems = [
      {
        title_id: '',
        qty: 1
      }
    ];

    this.cdr.detectChanges();
  }

  openAddLineToOrder(order: SalesOrder): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showSaleForm = true;
    this.formMode = 'createOrder';
    this.isEditMode = false;
    this.isAddingToExistingOrder = true;

    this.editingStoreId = null;
    this.editingOrderNumber = null;
    this.editingTitleId = null;

    this.formStoreId = order.stor_id;
    this.formOrderNumber = order.ord_num;
    this.formOrderDate = this.formatDateForInput(order.ord_date);
    this.formPayterms = order.payterms;
    this.formTitleId = '';
    this.formQty = 1;

    this.formItems = [
      {
        title_id: '',
        qty: 1
      }
    ];

    this.cdr.detectChanges();
  }

  openEditForm(sale: AdminSale): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.showSaleForm = true;
    this.formMode = 'editLine';
    this.isEditMode = true;
    this.isAddingToExistingOrder = false;

    this.editingStoreId = sale.stor_id;
    this.editingOrderNumber = sale.ord_num;
    this.editingTitleId = sale.title_id;

    this.formStoreId = sale.stor_id;
    this.formOrderNumber = sale.ord_num;
    this.formOrderDate = this.formatDateForInput(sale.ord_date);
    this.formQty = Number(sale.qty);
    this.formPayterms = sale.payterms;
    this.formTitleId = sale.title_id;

    this.formItems = [];

    this.cdr.detectChanges();
  }

  cancelForm(): void {
    this.showSaleForm = false;
    this.formMode = 'createOrder';
    this.isEditMode = false;
    this.isAddingToExistingOrder = false;

    this.editingStoreId = null;
    this.editingOrderNumber = null;
    this.editingTitleId = null;

    this.formStoreId = '';
    this.formOrderNumber = '';
    this.formOrderDate = '';
    this.formPayterms = '';
    this.formTitleId = '';
    this.formQty = null;
    this.formItems = [];

    this.errorMessage = '';

    this.cdr.detectChanges();
  }

  addFormLine(): void {
    this.formItems.push({
      title_id: '',
      qty: 1
    });

    this.cdr.detectChanges();
  }

  removeFormLine(index: number): void {
    if (this.formItems.length <= 1) {
      this.errorMessage = 'At least one title item is required.';
      this.cdr.detectChanges();
      return;
    }

    this.formItems.splice(index, 1);
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
      this.formMode === 'editLine' &&
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

    const createData: SalesOrderCreateRequest = {
      stor_id: this.formStoreId,
      ord_num: this.formOrderNumber.trim(),
      ord_date: this.formOrderDate,
      payterms: this.formPayterms.trim(),
      items: this.formItems.map(item => {
        return {
          title_id: item.title_id,
          qty: Number(item.qty)
        };
      })
    };

    this.createOrder(createData);
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

    if (!this.formPayterms || !this.formPayterms.trim()) {
      return 'Pay terms are required.';
    }

    if (this.formPayterms.trim().length > 12) {
      return 'Pay terms cannot be longer than 12 characters.';
    }

    if (this.formMode === 'editLine') {
      if (this.formQty === null || this.formQty === undefined) {
        return 'Quantity is required.';
      }

      const quantity = Number(this.formQty);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return 'Quantity must be a whole number greater than 0.';
      }

      if (!this.formTitleId) {
        return 'Title is required.';
      }

      return '';
    }

    if (!this.formItems || this.formItems.length === 0) {
      return 'At least one title item is required.';
    }

    const usedTitleIds = new Set<string>();

    for (const item of this.formItems) {
      if (!item.title_id) {
        return 'Each item must have a selected title.';
      }

      if (usedTitleIds.has(item.title_id)) {
        return 'The same title cannot be added twice in the same order. Increase the quantity instead.';
      }

      usedTitleIds.add(item.title_id);

      if (item.qty === null || item.qty === undefined) {
        return 'Each item must have a quantity.';
      }

      const quantity = Number(item.qty);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return 'Each quantity must be a whole number greater than 0.';
      }
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

        this.refreshSalesData(false);

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

  createOrder(orderData: SalesOrderCreateRequest): void {
    this.isSaving = true;

    this.adminSaleService.createOrder(orderData).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.cancelForm();

        this.successMessage = response.message;

        this.refreshSalesData(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating sales order:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not create sales order.';

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

        this.refreshSalesData(false);

        if (this.showOrderDetailsPanel && this.selectedOrderDetails) {
          this.loadOrderDetails(this.selectedOrderDetails.stor_id, this.selectedOrderDetails.ord_num, 'details');
        }

        if (this.showSummaryPanel && this.selectedOrderForSummary) {
          this.loadOrderDetails(this.selectedOrderForSummary.stor_id, this.selectedOrderForSummary.ord_num, 'summary');
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating sale item:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not update sale item.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteSale(sale: AdminSale): void {
    this.errorMessage = '';
    this.successMessage = '';

    const confirmed = confirm(
      `Are you sure you want to delete this item?\n\nOrder: ${sale.ord_num}\nStore: ${sale.stor_name || sale.stor_id}\nTitle: ${sale.title || sale.title_id}`
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

        this.refreshSalesData(false);

        if (this.selectedOrderDetails) {
          this.loadOrderDetails(this.selectedOrderDetails.stor_id, this.selectedOrderDetails.ord_num, 'details');
        }

        if (this.selectedOrderForSummary) {
          this.loadOrderDetails(this.selectedOrderForSummary.stor_id, this.selectedOrderForSummary.ord_num, 'summary');
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting sale item:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not delete sale item.';

        this.cdr.detectChanges();
      }
    });
  }

  deleteOrder(order: SalesOrder): void {
    this.errorMessage = '';
    this.successMessage = '';

    const confirmed = confirm(
      `Are you sure you want to delete the full order?\n\nOrder: ${order.ord_num}\nStore: ${order.stor_name || order.stor_id}\nItems: ${order.line_count}\n\nThis will delete every title item in this order.`
    );

    if (!confirmed) {
      return;
    }

    this.isSaving = true;

    this.adminSaleService.deleteOrder(order.stor_id, order.ord_num).subscribe({
      next: (response) => {
        this.isSaving = false;

        this.successMessage = response.message;

        if (
          this.selectedOrderDetails &&
          this.selectedOrderDetails.stor_id === order.stor_id &&
          this.selectedOrderDetails.ord_num === order.ord_num
        ) {
          this.closeOrderDetailsPanel();
        }

        if (
          this.selectedOrderForSummary &&
          this.selectedOrderForSummary.stor_id === order.stor_id &&
          this.selectedOrderForSummary.ord_num === order.ord_num
        ) {
          this.closeSummaryPanel();
        }

        this.refreshSalesData(false);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error deleting sales order:', err);

        this.isSaving = false;

        this.errorMessage =
          err.error?.error ||
          err.error?.message ||
          'Could not delete sales order.';

        this.cdr.detectChanges();
      }
    });
  }

  openOrderDetails(order: SalesOrder): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.loadOrderDetails(order.stor_id, order.ord_num, 'details');
  }

  closeOrderDetailsPanel(): void {
    this.selectedOrderDetails = null;
    this.showOrderDetailsPanel = false;
    this.cdr.detectChanges();
  }

  private loadOrderDetails(
    storeId: string,
    orderNumber: string,
    target: 'details' | 'summary'
  ): void {
    this.isLoading = true;

    this.adminSaleService.getOrderDetails(storeId, orderNumber).subscribe({
      next: (data) => {
        this.isLoading = false;

        if (target === 'details') {
          this.selectedOrderDetails = data;
          this.showOrderDetailsPanel = true;
        }

        if (target === 'summary') {
          this.selectedOrderForSummary = data;
          this.selectedSaleForSummary = data.lines.length > 0 ? data.lines[0] : null;
          this.showSummaryPanel = true;
          this.showEmailPanel = false;
          this.emailTo = '';
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading order details:', err);

        this.isLoading = false;

        this.errorMessage =
          err.error?.message ||
          'Could not load order details.';

        if (target === 'details') {
          this.selectedOrderDetails = null;
          this.showOrderDetailsPanel = false;
        }

        if (target === 'summary') {
          this.selectedOrderForSummary = null;
          this.selectedSaleForSummary = null;
          this.showSummaryPanel = false;
        }

        this.cdr.detectChanges();
      }
    });
  }

  openSummaryPanel(orderOrSale: SalesOrder | AdminSale): void {
    this.errorMessage = '';
    this.successMessage = '';

    this.loadOrderDetails(orderOrSale.stor_id, orderOrSale.ord_num, 'summary');
  }

  closeSummaryPanel(): void {
    this.selectedOrderForSummary = null;
    this.selectedSaleForSummary = null;
    this.showSummaryPanel = false;
    this.showEmailPanel = false;
    this.emailTo = '';
    this.cdr.detectChanges();
  }

  openEmailPanel(): void {
    if (!this.selectedOrderForSummary) {
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
    if (!this.selectedOrderForSummary) {
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
      sale: this.selectedOrderForSummary
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
    if (!this.selectedOrderForSummary) {
      return;
    }

    const order = this.selectedOrderForSummary;

    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    if (!printWindow) {
      this.errorMessage = 'Could not open print window. Please allow pop-ups for this site.';
      this.cdr.detectChanges();
      return;
    }

    const orderDate = this.formatCleanDate(order.ord_date);

    const generatedDate = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    const storeName = this.escapeHtml(order.stor_name || order.stor_id);
    const storeLocation = this.escapeHtml(this.getOrderLocation(order));
    const orderTotal = this.formatMoney(this.getOrderDetailsRevenue(order));

    const htmlParts: string[] = [];

    htmlParts.push('<!DOCTYPE html>');
    htmlParts.push('<html>');
    htmlParts.push('<head>');
    htmlParts.push('<meta charset="utf-8">');
    htmlParts.push('<title>Sales Order Summary - ' + this.escapeHtml(order.ord_num) + '</title>');

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
    htmlParts.push('.total-box { width: 360px; border: 2px solid #137333; background-color: #f3fbf6; }');
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
    htmlParts.push('<div class="doc-number">' + this.escapeHtml(order.ord_num) + '</div>');
    htmlParts.push('<div class="doc-meta">');
    htmlParts.push('<div><strong>Order Date:</strong> ' + orderDate + '</div>');
    htmlParts.push('<div><strong>Generated:</strong> ' + generatedDate + '</div>');
    htmlParts.push('<div><strong>Store ID:</strong> ' + this.escapeHtml(order.stor_id) + '</div>');
    htmlParts.push('<div><strong>Items:</strong> ' + order.lines.length + '</div>');
    htmlParts.push('</div>');
    htmlParts.push('</div>');

    htmlParts.push('</section>');

    htmlParts.push('<section class="status-row">');

    htmlParts.push('<div class="status-card dark">');
    htmlParts.push('<span>Payment Terms</span>');
    htmlParts.push('<strong>' + this.escapeHtml(order.payterms) + '</strong>');
    htmlParts.push('</div>');

    htmlParts.push('<div class="status-card">');
    htmlParts.push('<span>Total Quantity</span>');
    htmlParts.push('<strong>' + order.total_qty + '</strong>');
    htmlParts.push('</div>');

    htmlParts.push('<div class="status-card green">');
    htmlParts.push('<span>Order Total</span>');
    htmlParts.push('<strong>$' + orderTotal + '</strong>');
    htmlParts.push('</div>');

    htmlParts.push('</section>');

    htmlParts.push('<h2 class="section-title">Customer / Store Information</h2>');

    htmlParts.push('<section class="info-grid">');

    htmlParts.push('<div class="info-box">');
    htmlParts.push('<h3>Store Details</h3>');
    htmlParts.push('<div class="info-line"><span>Store Name</span><strong>' + storeName + '</strong></div>');
    htmlParts.push('<div class="info-line"><span>Store ID</span><strong>' + this.escapeHtml(order.stor_id) + '</strong></div>');
    htmlParts.push('<div class="info-line"><span>Location</span><strong>' + storeLocation + '</strong></div>');
    htmlParts.push('</div>');

    htmlParts.push('<div class="info-box">');
    htmlParts.push('<h3>Order Details</h3>');
    htmlParts.push('<div class="info-line"><span>Order Number</span><strong>' + this.escapeHtml(order.ord_num) + '</strong></div>');
    htmlParts.push('<div class="info-line"><span>Order Date</span><strong>' + orderDate + '</strong></div>');
    htmlParts.push('<div class="info-line"><span>Items</span><strong>' + order.lines.length + '</strong></div>');
    htmlParts.push('</div>');

    htmlParts.push('</section>');

    htmlParts.push('<h2 class="section-title">Order Items</h2>');

    htmlParts.push('<table>');
    htmlParts.push('<thead>');
    htmlParts.push('<tr>');
    htmlParts.push('<th>Title</th>');
    htmlParts.push('<th>Title ID</th>');
    htmlParts.push('<th>Type</th>');
    htmlParts.push('<th class="text-right">Unit Price</th>');
    htmlParts.push('<th class="text-right">Qty</th>');
    htmlParts.push('<th class="text-right">Item Total</th>');
    htmlParts.push('</tr>');
    htmlParts.push('</thead>');
    htmlParts.push('<tbody>');

    order.lines.forEach((line) => {
      const titleName = this.escapeHtml(line.title || line.title_id);
      const publisherName = this.escapeHtml(line.pub_name || 'N/A');
      const unitPrice = this.formatMoney(Number(line.price ?? 0));
      const itemTotal = this.formatMoney(this.getSaleRevenue(line));

      htmlParts.push('<tr>');
      htmlParts.push('<td class="title-cell"><strong>' + titleName + '</strong><span class="muted">' + publisherName + '</span></td>');
      htmlParts.push('<td>' + this.escapeHtml(line.title_id) + '</td>');
      htmlParts.push('<td>' + this.escapeHtml(line.type || 'N/A') + '</td>');
      htmlParts.push('<td class="text-right">$' + unitPrice + '</td>');
      htmlParts.push('<td class="text-right">' + line.qty + '</td>');
      htmlParts.push('<td class="text-right">$' + itemTotal + '</td>');
      htmlParts.push('</tr>');
    });

    htmlParts.push('</tbody>');
    htmlParts.push('</table>');

    htmlParts.push('<section class="summary-total">');
    htmlParts.push('<div class="total-box">');

    htmlParts.push('<div class="total-row">');
    htmlParts.push('<span>Subtotal</span>');
    htmlParts.push('<strong>$' + orderTotal + '</strong>');
    htmlParts.push('</div>');

    htmlParts.push('<div class="total-row final">');
    htmlParts.push('<span>Total Amount</span>');
    htmlParts.push('<strong>$' + orderTotal + '</strong>');
    htmlParts.push('</div>');

    htmlParts.push('</div>');
    htmlParts.push('</section>');

    htmlParts.push('<section class="notes">');
    htmlParts.push('<strong>Report Notes:</strong> ');
    htmlParts.push('This document is generated for internal business reporting purposes. ');
    htmlParts.push('Totals are calculated using each title price multiplied by quantity sold. ');
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

  getSelectedTitlePrice(titleId: string = this.formTitleId): number {
    const selectedTitle = this.titles.find(title =>
      title.title_id === titleId
    );

    return Number(selectedTitle?.price ?? 0);
  }

  getSelectedTitleName(titleId: string): string {
    const selectedTitle = this.titles.find(title =>
      title.title_id === titleId
    );

    return selectedTitle?.title || titleId || 'N/A';
  }

  getSelectedTitlePublisher(titleId: string): string {
    const selectedTitle = this.titles.find(title =>
      title.title_id === titleId
    );

    return selectedTitle?.pub_name || 'N/A';
  }

  getFormLineEstimatedRevenue(line: SalesOrderFormLine): number {
    const quantity = Number(line.qty ?? 0);
    const price = this.getSelectedTitlePrice(line.title_id);

    return quantity * price;
  }

  getFormEstimatedRevenue(): number {
    if (this.formMode === 'editLine') {
      const quantity = Number(this.formQty ?? 0);
      const price = this.getSelectedTitlePrice(this.formTitleId);

      return quantity * price;
    }

    return this.formItems.reduce((sum, line) => {
      return sum + this.getFormLineEstimatedRevenue(line);
    }, 0);
  }

  getSaleRevenue(sale: AdminSale): number {
    if (sale.estimated_revenue !== null && sale.estimated_revenue !== undefined) {
      return Number(sale.estimated_revenue);
    }

    return Number(sale.qty ?? 0) * Number(sale.price ?? 0);
  }

  getOrderRevenue(order: SalesOrder): number {
    return Number(order.order_total ?? 0);
  }

  getOrderDetailsRevenue(order: SalesOrderDetails): number {
    if (order.order_total !== null && order.order_total !== undefined) {
      return Number(order.order_total);
    }

    return order.lines.reduce((sum, line) => {
      return sum + this.getSaleRevenue(line);
    }, 0);
  }

  getStoreLocation(sale: AdminSale): string {
    const city = sale.store_city ?? '';
    const state = sale.store_state ?? '';

    const location = `${city} ${state}`.trim();

    return location || 'N/A';
  }

  getOrderLocation(order: SalesOrder | SalesOrderDetails): string {
    const city = order.store_city ?? '';
    const state = order.store_state ?? '';

    const location = `${city} ${state}`.trim();

    return location || 'N/A';
  }

  private generateNextOrderNumber(): string {
    const existingOrderNumbers = [
      ...this.orders.map(order => order.ord_num),
      ...this.sales.map(sale => sale.ord_num)
    ];

    const existingNumbers = existingOrderNumbers
      .map(orderNumber => String(orderNumber || '').trim().toUpperCase())
      .filter(orderNumber => /^ORD99\d{2}$/.test(orderNumber))
      .map(orderNumber => Number(orderNumber.replace('ORD', '')))
      .filter(number => !Number.isNaN(number));

    const nextNumber = existingNumbers.length > 0
      ? Math.max(...existingNumbers) + 1
      : 9901;

    return `ORD${nextNumber}`;
  }

  getTodayForInput(): string {
    const today = new Date();

    return today.toISOString().slice(0, 10);
  }

  formatDateForInput(value: string | Date | null | undefined): string {
    if (!value) {
      return this.getTodayForInput();
    }

    const rawValue = String(value);

    if (rawValue.includes('T')) {
      return rawValue.split('T')[0];
    }

    const dateValue = new Date(value);

    if (Number.isNaN(dateValue.getTime())) {
      return this.getTodayForInput();
    }

    return dateValue.toISOString().slice(0, 10);
  }

  formatDateForDisplay(value: string | Date | null | undefined): string {
    return this.formatCleanDate(value);
  }

  formatCleanDate(value: string | Date | null | undefined): string {
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
  }

  formatMoney(value: number | null | undefined): string {
    return Number(value ?? 0).toFixed(2);
  }

  private getOrderKey(storeId: string, orderNumber: string): string {
    return `${storeId}__${orderNumber}`;
  }

  private escapeHtml(value: string | null | undefined): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}