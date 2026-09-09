import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Layers, 
  Tag, 
  Eye,
  AlertCircle,
  UploadCloud,
  Star,
  Image as ImageIcon
} from 'lucide-react';
import { Product } from '../../types';
import { uploadAdminImage } from '../../lib/adminMedia';

export interface AdminProductsProps {
  products: Product[];
  formatPrice: (priceLKR: number) => string;
  isSuperAdmin: boolean;
  onSaveProduct: (product: Partial<Product>) => Promise<{ success: boolean; error?: string; product?: Product }>;
  onDeleteProduct: (id: string) => void;
  isProductModalOpen: boolean;
  setIsProductModalOpen: (open: boolean) => void;
  editingProduct: Product | null;
  setEditingProduct: (prod: Product | null) => void;
}

function getProductStock(product: Partial<Product>) {
  return Math.max(0, Number(product.stockCount) || 0);
}

function getProductCompletion(product: Partial<Product>) {
  const missing: string[] = [];
  if (!product.title?.trim()) missing.push('title');
  if (!(Number(product.priceLKR) > 0)) missing.push('price');
  if (!product.category) missing.push('category');
  if (!Array.isArray(product.images) || !product.images.some(url => String(url).startsWith('https://'))) missing.push('image');
  if (!product.description?.trim()) missing.push('description');
  if (!product.fabricDetails?.trim()) missing.push('fabric');
  if (!product.color?.trim()) missing.push('color');
  if (!product.fit?.trim()) missing.push('fit');
  if (product.category !== 'accessories' && (!Array.isArray(product.sizes) || product.sizes.length === 0)) missing.push('sizes');
  return { complete: missing.length === 0, missing };
}

export const AdminProducts: React.FC<AdminProductsProps> = ({
  products,
  formatPrice,
  isSuperAdmin,
  onSaveProduct,
  onDeleteProduct,
  isProductModalOpen,
  setIsProductModalOpen,
  editingProduct,
  setEditingProduct
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'men' | 'women' | 'sets' | 'accessories'>('all');

  // Form State
  const [form, setForm] = useState<Partial<Product>>({
    title: '',
    subtitle: '',
    priceLKR: 0,
    category: 'men',
    images: [],
    hoverImage: '',
    completeTheSetProductId: '',
    description: '',
    fabricDetails: '',
    bulletDetails: [],
    sizes: [],
    inStock: true,
    stockCount: 0,
    badge: ''
  });
  const [bulletsText, setBulletsText] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const getImageUrls = (value = imagesText) => value
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.startsWith('https://'));

  const setImageUrls = (urls: string[]) => {
    const unique = Array.from(new Set(urls.filter(url => url.startsWith('https://')))).slice(0, 16);
    setImagesText(unique.join('\n'));
    setForm(current => ({ ...current, images: unique }));
  };

  const appendImageUrl = (url: string) => {
    setImageUrls([...getImageUrls(), url]);
  };

  const removeImageUrl = (url: string) => {
    const next = getImageUrls().filter(item => item !== url);
    setImageUrls(next);
    setForm(current => ({
      ...current,
      hoverImage: current.hoverImage === url ? '' : current.hoverImage
    }));
  };

  const makePrimaryImage = (url: string) => {
    const next = [url, ...getImageUrls().filter(item => item !== url)];
    setImageUrls(next);
  };

  const handleImageFiles = async (files: File[]) => {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      setFormError('Choose a JPG, PNG, WebP, or AVIF image.');
      return;
    }
    if (getImageUrls().length + images.length > 16) {
      setFormError('A product can have up to 16 images. Remove an image before adding more.');
      return;
    }

    setIsUploadingImages(true);
    setFormError('');
    setUploadStatus('');
    try {
      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        setUploadStatus(`Uploading ${index + 1} of ${images.length}: ${file.name}`);
        const url = await uploadAdminImage(file, 'products');
        appendImageUrl(url);
      }
      setUploadStatus(images.length === 1 ? 'Image uploaded successfully.' : `${images.length} images uploaded successfully.`);
    } catch (err: any) {
      setUploadStatus('');
      setFormError(err?.message || 'Image upload failed. Please try another image.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Open Add/Edit Modal
  const handleOpenModal = (prod?: Product) => {
    setFormError('');
    setUploadStatus('');
    if (prod) {
      setEditingProduct(prod);
      setForm({
        ...prod,
        hoverImage: prod.hoverImage || '',
        completeTheSetProductId: prod.completeTheSetProductId || '',
        bulletDetails: prod.bulletDetails || []
      });
      setBulletsText((prod.bulletDetails || []).join('\n'));
      setImagesText((prod.images || []).join('\n'));
    } else {
      setEditingProduct(null);
      setForm({
        title: '',
        subtitle: '',
        priceLKR: 0,
        category: 'men',
        images: [],
        hoverImage: '',
        completeTheSetProductId: '',
        description: '',
        fabricDetails: '',
        bulletDetails: [],
        sizes: [],
        inStock: true,
        stockCount: 0,
        badge: '',
        color: '',
        fit: ''
      });
      setBulletsText('');
      setImagesText('');
    }
    setIsProductModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      setFormError('Product title is required.');
      return;
    }
    const price = Number(form.priceLKR);
    const stock = Number(form.stockCount);
    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Price must be greater than zero.');
      return;
    }
    if (!Number.isInteger(stock) || stock < 0) {
      setFormError('Stock must be a whole number of zero or more.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      const parsedBullets = bulletsText
        .split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0);

      const parsedImages = imagesText
        .split('\n')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      if (!parsedImages.length || parsedImages.some(url => !url.startsWith('https://'))) {
        setFormError('Add at least one secure HTTPS product image.');
        return;
      }

      const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const collision = products.find(product => product.slug === slug && product.id !== editingProduct?.id);
      if (collision) {
        setFormError('Another product already uses this title/slug. Choose a distinct title.');
        return;
      }

      const normalizedSizes = (form.sizes || []).map(size => size.trim()).filter(Boolean);
      const payload: Partial<Product> = {
        ...(editingProduct ? { id: editingProduct.id } : {}),
        ...form,
        priceLKR: price,
        stockCount: stock,
        inStock: stock > 0,
        images: parsedImages,
        sizes: normalizedSizes,
        bulletDetails: parsedBullets,
        slug
      };

      const result = await onSaveProduct(payload);
      if (result.success) {
        setIsProductModalOpen(false);
      } else {
        setFormError(result.error || 'Product could not be saved. Please review the required fields and try again.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery.trim() || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.badge?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search & Category Filter Controls */}
      <div className="admin-card p-4! flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-70">
          <div className="table-search-box max-w-md! w-full">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search garments, drops, or silhouettes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="table-search-input"
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
            {(['all', 'men', 'women', 'sets', 'accessories'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  selectedCategory === cat 
                    ? 'bg-white text-stone-900 shadow-xs' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">
            Showing <strong>{filteredProducts.length}</strong> creations
          </span>
          <button
            onClick={() => handleOpenModal()}
            className="btn-saelyxe-lime text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Garment</span>
          </button>
        </div>
      </div>

      {/* Product Cards Grid */}
      {filteredProducts.length === 0 ? (
        <div className="admin-card text-center py-16">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No creations found</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or create a new garment silhouette for the boutique.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="btn-saelyxe-primary text-xs mt-4"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Craft New Silhouette</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...filteredProducts].sort((a, b) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          ).map(prod => {
            const stock = getProductStock(prod);
            const isAvailable = stock > 0;
            const completion = getProductCompletion(prod);

            return (
            <div 
              key={prod.id} 
              className={`admin-card p-0! overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all border-2 ${
                completion.complete ? 'border-emerald-300' : 'border-amber-200'
              }`}
            >
              <div>
                {/* Image Aspect Box */}
                <div className="relative aspect-4/5 bg-stone-100 overflow-hidden">
                  {prod.images?.[0] ? (
                    <img
                      src={prod.images[0]}
                      alt={prod.title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center px-4 text-center text-[11px] font-semibold text-stone-400">
                      Product image required
                    </div>
                  )}
                  {(prod.hoverImage || prod.images?.[1]) && (
                    <img
                      src={prod.hoverImage || prod.images[1]}
                      alt={`${prod.title} alternate view`}
                      className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      loading="lazy"
                    />
                  )}
                  {prod.badge && (
                    <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md">
                      {prod.badge}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isAvailable
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                    }`}>
                      {isAvailable ? `${stock} in stock` : 'Sold Out'}
                    </span>
                  </div>
                </div>

                {/* Garment Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      {prod.category} • {prod.sizes?.join(', ')}
                    </div>
                    <span
                      title={completion.complete ? 'Product setup complete' : `Missing: ${completion.missing.join(', ')}`}
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        completion.complete
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {completion.complete ? 'Complete' : `${completion.missing.length} missing`}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 line-clamp-1">
                    {prod.title}
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {prod.subtitle || prod.description}
                  </p>
                </div>
              </div>

              {/* Price & Action Row */}
              <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-semibold block">Price</span>
                  <span className="text-sm font-extrabold text-stone-900">
                    {formatPrice(prod.priceLKR)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenModal(prod)}
                    className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                    title="Edit Garment"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {isSuperAdmin && (
                    <button
                      onClick={() => onDeleteProduct(prod.id)}
                      className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                      title="Retire from Boutique"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  {editingProduct ? 'Edit Silhouette Specifications' : 'Craft New Garment Silhouette'}
                </h3>
                <p className="text-xs text-stone-500">
                  Configure high-fashion parameters, pricing, fabric weight, and imagery.
                </p>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Row 1: Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label-custom">Garment Title</label>
                  <input
                    type="text"
                    required
                    value={form.title || ''}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. SÆ SIGNATURE OVERSIZED TEE"
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Subtitle / Value Prop</label>
                  <input
                    type="text"
                    value={form.subtitle || ''}
                    onChange={e => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="e.g. Heavyweight Sand Washed Pure Combed Cotton"
                    className="form-input-custom"
                  />
                </div>
              </div>

              {/* Row 2: Price & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Price (LKR)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={form.priceLKR ?? 0}
                    onChange={e => setForm({ ...form, priceLKR: Number(e.target.value) })}
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Category</label>
                  <select
                    value={form.category || 'men'}
                    onChange={e => setForm({ ...form, category: e.target.value as any })}
                    className="form-input-custom"
                  >
                    <option value="men">Men's Silhouette</option>
                    <option value="women">Women's Silhouette</option>
                    <option value="sets">Coordinates / Sets</option>
                    <option value="accessories">Accessories / Leather</option>
                  </select>
                </div>
                <div>
                  <label className="form-label-custom">Drop Badge</label>
                  <input
                    type="text"
                    value={form.badge || ''}
                    onChange={e => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g. DROP 001 / LIMITED"
                    className="form-input-custom"
                  />
                </div>
              </div>

              {/* Row 3: Fabric & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Fabric Details</label>
                  <input
                    type="text"
                    value={form.fabricDetails || ''}
                    onChange={e => setForm({ ...form, fabricDetails: e.target.value })}
                    placeholder="e.g. 400 GSM Combed Cotton"
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Stock Units Available</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={form.stockCount ?? 0}
                    onChange={e => {
                      const stock = Math.max(0, Number(e.target.value) || 0);
                      setForm({ ...form, stockCount: stock, inStock: stock > 0 });
                    }}
                    className="form-input-custom"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="form-label-custom">Availability</label>
                  <div className={`rounded-xl border px-3 py-2.5 ${
                    getProductStock(form) > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                  }`}>
                    <div className={`text-xs font-bold ${
                      getProductStock(form) > 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}>
                      {getProductStock(form) > 0 ? 'In Stock' : 'Sold Out'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-stone-500">Automatic from Stock Units</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Sizes (comma separated)</label>
                  <input
                    type="text"
                    value={(form.sizes || []).join(', ')}
                    onChange={e => setForm({ ...form, sizes: e.target.value.split(',').map(value => value.trim()).filter(Boolean) })}
                    placeholder="S, M, L, XL"
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Color</label>
                  <input
                    type="text"
                    value={form.color || ''}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    placeholder="Midnight Navy"
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Fit</label>
                  <input
                    type="text"
                    value={form.fit || ''}
                    onChange={e => setForm({ ...form, fit: e.target.value })}
                    placeholder="Structured Boxy Fit"
                    className="form-input-custom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label-custom">Hover Image</label>
                  <select
                    value={form.hoverImage || ''}
                    onChange={e => setForm({ ...form, hoverImage: e.target.value })}
                    className="form-input-custom"
                  >
                    <option value="">Use second product image automatically</option>
                    {getImageUrls().map((url, index) => (
                      <option key={url} value={url}>Image {index + 1}{index === 0 ? ' (Primary)' : ''}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-stone-400">Optional. Choose an uploaded image for the hover view.</p>
                </div>
                <div>
                  <label className="form-label-custom">Complete-the-set Product</label>
                  <select
                    value={form.completeTheSetProductId || ''}
                    onChange={e => setForm({ ...form, completeTheSetProductId: e.target.value })}
                    className="form-input-custom"
                  >
                    <option value="">None</option>
                    {products.filter(product => product.id !== editingProduct?.id).map(product => (
                      <option key={product.id} value={product.id}>{product.title}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-stone-400">Optional cross-sell shown with this product.</p>
                </div>
              </div>

              {/* Product Images */}
              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <label className="form-label-custom mb-1!">
                      Product Images <span className="text-rose-600">*</span>
                    </label>
                    <p className="text-[10px] leading-relaxed text-stone-500">
                      Upload from your PC. Images are automatically optimized and stored in SAELYXE Cloud Media.
                    </p>
                  </div>
                  <div className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[10px] font-bold text-stone-500 shrink-0">
                    {getImageUrls().length}/16
                  </div>
                </div>

                <label
                  className={`group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-5 py-6 text-center transition-all ${
                    isUploadingImages
                      ? 'pointer-events-none border-stone-300 opacity-70'
                      : 'border-stone-300 hover:border-[#051C12] hover:bg-emerald-50/30'
                  }`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (!isUploadingImages) {
                      void handleImageFiles(Array.from(e.dataTransfer.files || []));
                    }
                  }}
                >
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#051C12] text-[#B4F105] shadow-sm">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">
                    {isUploadingImages ? 'Uploading & optimizing images…' : 'Click to choose images or drag them here'}
                  </p>
                  <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-stone-400">
                    JPG, PNG, WebP or AVIF. Large images are resized automatically for reliable product delivery.
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="hidden"
                    disabled={isUploadingImages}
                    onChange={e => {
                      const files = Array.from(e.target.files || []);
                      e.target.value = '';
                      void handleImageFiles(files);
                    }}
                  />
                </label>

                {uploadStatus && (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] font-medium ${
                    isUploadingImages
                      ? 'border-sky-200 bg-sky-50 text-sky-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}>
                    {uploadStatus}
                  </div>
                )}

                {getImageUrls().length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {getImageUrls().map((url, index) => (
                      <div key={url} className="group/image overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
                        <div className="relative aspect-4/5 overflow-hidden bg-stone-100">
                          <img src={url} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                            {index === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#051C12] px-2 py-1 text-[9px] font-bold text-white">
                                <Star className="h-2.5 w-2.5 fill-[#B4F105] text-[#B4F105]" />
                                PRIMARY
                              </span>
                            )}
                            {form.hoverImage === url && (
                              <span className="rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold text-stone-700 shadow-sm">
                                HOVER
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => makePrimaryImage(url)}
                            disabled={index === 0}
                            className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 disabled:text-stone-300"
                          >
                            {index === 0 ? 'Primary' : 'Make Primary'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImageUrl(url)}
                            className="border-l border-stone-100 px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
                    <ImageIcon className="h-4 w-4 shrink-0" />
                    Add at least one image before saving the product.
                  </div>
                )}

                <details className="mt-4">
                  <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800">
                    Advanced · Paste image URLs
                  </summary>
                  <textarea
                    rows={3}
                    value={imagesText}
                    onChange={e => {
                      setImagesText(e.target.value);
                      setForm(current => ({
                        ...current,
                        images: e.target.value
                          .split('\n')
                          .map(url => url.trim())
                          .filter(url => url.startsWith('https://'))
                      }));
                    }}
                    placeholder="One HTTPS image URL per line"
                    className="form-textarea-custom mt-2 font-mono text-xs"
                  />
                </details>
              </div>

              {/* Description */}
              <div>
                <label className="form-label-custom">Editorial Description</label>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Garment narrative, drape details, and structural cues..."
                  className="form-textarea-custom"
                />
              </div>

              {/* Bullet Details */}
              <div>
                <label className="form-label-custom">
                  Bullet Specifications (One feature per line)
                </label>
                <textarea
                  rows={3}
                  value={bulletsText}
                  onChange={e => setBulletsText(e.target.value)}
                  placeholder="Heavyweight 400 GSM custom combed cotton&#10;Structured architectural drape"
                  className="form-textarea-custom font-mono text-xs"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="btn-table-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isUploadingImages}
                  className="btn-saelyxe-primary"
                >
                  {isUploadingImages ? 'Uploading Images...' : isSaving ? 'Persisting...' : 'Save & Publish Garment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
