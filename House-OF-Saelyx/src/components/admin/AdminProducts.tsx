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
  AlertCircle
} from 'lucide-react';
import { Product } from '../../types';
import { getAdminMediaUploadConfig, uploadAdminImageWithConfig } from '../../lib/adminMedia';

export interface AdminProductsProps {
  products: Product[];
  formatPrice: (priceLKR: number) => string;
  isSuperAdmin: boolean;
  onSaveProduct: (product: Partial<Product>) => Promise<boolean>;
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

  const appendImageUrl = (url: string) => {
    setImagesText(current => `${current}${current ? '\n' : ''}${url}`);
  };

  const handleImageFiles = async (files: File[]) => {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      setFormError('Please select image files only.');
      return;
    }

    setIsUploadingImages(true);
    setFormError('');
    try {
      const config = await getAdminMediaUploadConfig('products');
      for (const file of images) {
        const url = await uploadAdminImageWithConfig(file, config);
        appendImageUrl(url);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Image upload failed.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  // Open Add/Edit Modal
  const handleOpenModal = (prod?: Product) => {
    setFormError('');
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

      const success = await onSaveProduct(payload);
      if (success) {
        setIsProductModalOpen(false);
      } else {
        setFormError('Failed to persist creation. Please check connection.');
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
                  <img
                    src={prod.images?.[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'}
                    alt={prod.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
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
                  <label className="form-label-custom">Hover Image URL</label>
                  <input
                    type="url"
                    value={form.hoverImage || ''}
                    onChange={e => setForm({ ...form, hoverImage: e.target.value.trim() })}
                    placeholder="https://..."
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Complete-the-set Product ID</label>
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
                </div>
              </div>

              {/* Product Images */}
              <div>
                <label className="form-label-custom">
                  Product Images
                </label>
                <div
                  className="mb-2 rounded-xl border-2 border-dashed border-stone-200 p-4 text-center text-xs text-stone-500 transition-colors hover:border-stone-400"
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    if (!isUploadingImages) {
                      void handleImageFiles(Array.from(e.dataTransfer.files as FileList) as File[]);
                    }
                  }}
                >
                  <p className="font-semibold text-stone-700">
                    {isUploadingImages ? 'Uploading to SAELYXE Cloud Media...' : 'Drop product images here'}
                  </p>
                  <p className="mt-1 text-[10px] text-stone-400">
                    JPG, PNG, WEBP, AVIF and other image formats · max 10 MB each
                  </p>
                  <label className={`mt-3 inline-flex cursor-pointer items-center rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-700 shadow-xs ${isUploadingImages ? 'pointer-events-none opacity-50' : 'hover:bg-stone-50'}`}>
                    Choose images from PC
                    <input
                      type="file"
                      accept="image/*"
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
                </div>

                {imagesText && (
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {imagesText
                      .split('\n')
                      .map(url => url.trim())
                      .filter(url => url.startsWith('https://'))
                      .slice(0, 6)
                      .map((url, index) => (
                        <div key={`${url}-${index}`} className="aspect-4/5 overflow-hidden rounded-lg bg-stone-100">
                          <img src={url} alt={`Product upload preview ${index + 1}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                  </div>
                )}

                <textarea
                  rows={3}
                  value={imagesText}
                  onChange={e => setImagesText(e.target.value)}
                  placeholder="Cloudinary image URLs appear here automatically. HTTPS URLs can also be pasted manually."
                  className="form-textarea-custom font-mono text-xs"
                />
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
