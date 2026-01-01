'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Loader from '@/components/Loader';

interface PurchaseInvoice {
  id: number;
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  amount: number;
  description?: string;
  category?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  uploader: {
    id: number;
    name: string;
    email: string;
  };
}

interface StorageUsage {
  usedFormatted: string;
  limitFormatted: string;
  usedPercentage: number;
  isNearLimit: boolean;
  warning: string | null;
}

export default function PurchaseInvoicesPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = [
    'Office Supplies',
    'Equipment',
    'Services',
    'Utilities',
    'Rent',
    'Software',
    'Travel',
    'Marketing',
    'Other',
  ];

  useEffect(() => {
    const initializePage = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }
      
      // Fetch data in parallel
      await Promise.all([fetchInvoices(), fetchStorageUsage()]);
    };
    
    initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStorageUsage = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/storage/usage', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStorageUsage(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch storage usage:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      // Build query params
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/purchase-invoices?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('Failed to load purchase invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(selectedFile.type)) {
        alert('Only PDF and image files are allowed');
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !invoiceNumber || !vendorName || !invoiceDate || !amount) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('invoiceNumber', invoiceNumber);
      formData.append('vendorName', vendorName);
      formData.append('invoiceDate', invoiceDate);
      formData.append('amount', amount);
      if (description) formData.append('description', description);
      if (category) formData.append('category', category);

      const response = await fetch('/api/purchase-invoices', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      // Reset form
      setFile(null);
      setInvoiceNumber('');
      setVendorName('');
      setInvoiceDate('');
      setAmount('');
      setDescription('');
      setCategory('');
      setShowUploadForm(false);

      // Refresh invoices and storage
      await fetchInvoices();
      await fetchStorageUsage();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/purchase-invoices/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete invoice');

      await fetchInvoices();
      await fetchStorageUsage();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete invoice');
    }
  };

  const applyFilters = () => {
    fetchInvoices();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCategoryFilter('');
    setTimeout(() => fetchInvoices(), 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  if (loading) {
    return <Loader fullScreen text="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link
              href="/"
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Back to Home"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Purchase Invoices</h1>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0"
          >
            <span className="hidden sm:inline">{showUploadForm ? 'Cancel' : '+ Upload'}</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4">

      {/* Storage Usage Alert */}
      {storageUsage && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            storageUsage.isNearLimit
              ? 'bg-red-100 border-2 border-red-500 text-red-800'
              : 'bg-blue-100 border border-blue-300 text-blue-800'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <strong>Storage Usage:</strong> {storageUsage.usedFormatted} / {storageUsage.limitFormatted}
              ({storageUsage.usedPercentage.toFixed(2)}%)
            </div>
            {storageUsage.warning && (
              <div className="font-bold">⚠️ {storageUsage.warning}</div>
            )}
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${storageUsage.isNearLimit ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(storageUsage.usedPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

        {/* Upload Form */}
      {showUploadForm && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
          <h2 className="text-xl font-bold mb-4">Upload Purchase Invoice</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  File (PDF or Image) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
            >
              {uploading ? 'Uploading...' : 'Upload Invoice'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 border">
        <h2 className="text-xl font-bold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Invoice # or Vendor"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={applyFilters}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Apply Filters
          </button>
          <button
            onClick={clearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border p-8 text-center text-gray-500">
            No purchase invoices found. Upload your first invoice to get started.
          </div>
        ) : (
          invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-lg shadow-md border p-4 sm:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col gap-4">
                {/* Header - Invoice Number and Category */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {invoice.invoiceNumber}
                    </h3>
                    <p className="text-sm text-gray-600">{invoice.vendorName}</p>
                  </div>
                  {invoice.category && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                      {invoice.category}
                    </span>
                  )}
                </div>

                {/* Date and Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 block">Date:</span>
                    <p className="font-medium text-gray-900">
                      {formatDate(invoice.invoiceDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Amount:</span>
                    <p className="font-bold text-green-600 text-lg">
                      {formatCurrency(Number(invoice.amount))}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {invoice.description && (
                  <div className="text-sm">
                    <span className="text-gray-500 block mb-1">Description:</span>
                    <p className="text-gray-700">{invoice.description}</p>
                  </div>
                )}

                {/* Uploader Info */}
                <div className="text-xs text-gray-500 pt-3 border-t space-y-1">
                  <p>Uploaded by: <span className="font-medium">{invoice.uploader.name}</span> ({invoice.uploader.email})</p>
                  <p>File size: {formatFileSize(invoice.fileSize)}</p>
                  <div className="pt-2">
                    <p className="text-gray-600 font-medium mb-1">File URL:</p>
                    <a 
                      href={invoice.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all text-xs"
                    >
                      {invoice.fileUrl}
                    </a>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        // Fetch the file as blob
                        const response = await fetch(invoice.fileUrl);
                        const blob = await response.blob();
                        
                        // Ensure filename has proper extension
                        let fileName = invoice.fileName;
                        const fileExt = fileName.split('.').pop()?.toLowerCase();
                        if (!fileExt || !['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
                          // Determine extension from URL or default to pdf
                          if (invoice.fileUrl.includes('/raw/')) {
                            fileName = fileName + '.pdf';
                          } else {
                            fileName = fileName + '.jpg';
                          }
                        }
                        
                        // Create object URL and download
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('Download failed:', error);
                        alert('Failed to download file');
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(invoice.id)}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

        {/* Summary */}
        {invoices.length > 0 && (
          <div className="mt-6 bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm sm:text-base">
              <div className="flex items-baseline gap-2">
                <span className="text-gray-600">Total Invoices:</span>
                <span className="font-semibold text-gray-900">{invoices.length}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(
                    invoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
