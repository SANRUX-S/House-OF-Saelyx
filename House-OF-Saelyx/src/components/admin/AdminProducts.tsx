import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  AlertCircle,
  UploadCloud,
  Star,
  Image as ImageIcon,
  CheckCircle2
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

const CATEGORY_OPTIONS: Array<{ value: Product['category']; label: string }> = [
  { value: 'men', label: "Men's" },
  { value: 'women', label: "Women's" },
  { value: 'new', label: 'New Arrivals' },
  { value: 'collections', label: 'Collections' },
  { value: 'knits', label: 'Knits' },
  { value: 'sets', label: 'Coordinates / Sets' },
  { value: 'accessories', label: 'Accessories / Leather' }
];

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

function createEmptyProduct(): Partial<Product> {
  return {
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
    inStock: false,
    stockCount: 0,
    badge: '',
    color: '',
    fit: ''
  };
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
  const [selectedCategory, setSelectedCategory] = useState<'all' | Product['category']>('all');
  const [form, setForm] = useState<Partial<Product>>(createEmptyProduct());
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
    setForm(current => ({
      ...current,
      images: unique,
      hoverImage: current.hoverImage && unique.includes(current.hoverImage) ? current.hoverImage : ''
    }));
  };

  const removeImageUrl = (url: string) => {
    setImageUrls(getImageUrls().filter(item => item !== url));
  };

  const makePrimaryImage = (url: string) => {
    setImageUrls([url, ...getImageUrls().filter(item => item !== url)]);
  };

  const handleImageFiles = async (files: File[]) => {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      setFormError('Choose a JPG, PNG, WebP, or AVIF image from your computer.');
      return;
    }

    const existingUrls = getImageUrls();
    if (existingUrls.length + images.length > 16) {
      setFormError(`A product can have up to 16 images. You can add ${Math.max(0, 16 - existingUrls.length)} more.`);
      return;
    }

    setIsUploadingImages(true);
    setFormError('');
    setUploadStatus('Preparing images from your computer...');

    const uploadedUrls: string[] = [];
    try {
      for (let index = 0; index < images.length; index += 1) {
        const file = images[index];
        setUploadStatus(`Uploading ${index + 1} of ${images.length}: ${file.name}`);
        const url = await uploadAdminImage(file, 'products');
        uploadedUrls.push(url);
        // Preserve every successful image immediately, even if a later file fails.
        setImageUrls([...existingUrls, ...uploadedUrls]);
      }
      setUploadStatus(images.length === 1
        ? 'Image uploaded successfully from your computer.'
        : `${images.length} images uploaded successfully from your computer.`);
    } catch (error) {
      if (uploadedUrls.length) setImageUrls([...existingUrls, ...uploadedUrls]);
      setUploadStatus('');
      setFormError(error instanceof Error ? error.message : 'Image upload failed. Please try another image.');
    } finally {
      setIsUploadingImages(false);
    }
  };

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
      setForm(createEmptyProduct());
      setBulletsText('');
      setImagesText('');
    }
    setIsProductModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    const price = Number(form.priceLKR);
    const stock = Number(form.stockCount);
    const normalizedSizes = (form.sizes || []).map(size => size.trim()).filter(Boolean);
    const parsedImages = getImageUrls();
    const publishCheck = getProductCompletion({ ...form, images: parsedImages, sizes: normalizedSizes });

    if (!form.title?.trim()) return setFormError('Product title is required.');
    if (!Number.isFinite(price) || price <= 0) return setFormError('Price must be greater than zero.');
    if (!Number.isInteger(stock) || stock < 0) return setFormError('Stock must be a whole number of zero or more.');
    if (!parsedImages.length) return setFormError('Upload at least one product image from your computer before publishing.');
    if (!form.description?.trim()) return setFormError('Editorial description is required before publishing.');
    if (!form.fabricDetails?.trim()) return setFormError('Fabric details are required before publishing.');
    if (!form.color?.trim()) return setFormError('Product color is required before publishing.');
    if (!form.fit?.trim()) return setFormError('Product fit is required before publishing.');
    if (form.category !== 'accessories' && normalizedSizes.length === 0) {
      return setFormError('Add at least one size for clothing products.');
    }
    if (!publishCheck.complete) {
      return setFormError(`Complete the required product fields: ${publishCheck.missing.join(', ')}.`);
    }

    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) return setFormError('Product title must contain letters or numbers.');
    const collision = products.find(product => product.slug === slug && product.id !== editingProduct?.id);
    if (collision) return setFormError('Another product already uses this title/slug. Choose a distinct title.');

    const parsedBullets = bulletsText
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      const payload: Partial<Product> = {
        ...(editingProduct ? { id: editingProduct.id } : {}),
        ...form,
        title: form.title.trim(),
        description: form.description!.trim(),
        fabricDetails: form.fabricDetails!.trim(),
        color: form.color!.trim(),
        fit: form.fit!.trim(),
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
        setUploadStatus('');
      } else {
        setFormError(result.error || 'Product could not be saved. Please review the required fields and try again.');
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      product.title.toLowerCase().includes(query) ||
      product.subtitle?.toLowerCase().includes(query) ||
      product.badge?.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="admin-card p-4! flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-70">
          <div className="table-search-box max-w-md! w-full">
            <Search className="w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="table-search-input"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={event => setSelectedCategory(event.target.value as 'all' | Product['category'])}
            className="form-input-custom max-w-48"
            aria-label="Filter products by category"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map(category => (
              <option key={category.value} value={category.value}>{category.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">
            Showing <strong>{filteredProducts.length}</strong> products
          </span>
          <button onClick={() => handleOpenModal()} className="btn-saelyxe-lime text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="admin-card text-center py-16">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No products found</h3>
          <p className="text-xs text-stone-400 mt-1">Adjust the filter or add a new SAELYXE product.</p>
          <button onClick={() => handleOpenModal()} className="btn-saelyxe-primary text-xs mt-4">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...filteredProducts]
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .map(product => {
              const stock = getProductStock(product);
              const completion = getProductCompletion(product);
              return (
                <div
                  key={product.id}
                  className={`admin-card p-0! overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all border-2 ${completion.complete ? 'border-emerald-300' : 'border-amber-200'}`}
                >
                  <div>
                    <div className="relative aspect-4/5 bg-stone-100 overflow-hidden">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">Image required</div>
                      )}
                      {(product.hoverImage || product.images?.[1]) && (
                        <img
                          src={product.hoverImage || product.images[1]}
                          alt={`${product.title} alternate view`}
                          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          loading="lazy"
                        />
                      )}
                      {product.badge && (
                        <div className="absolute top-3 left-3 bg-stone-900/80 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md">
                          {product.badge}
                        </div>
                      )}
                      <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${stock > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                        {stock > 0 ? `${stock} in stock` : 'Sold Out'}
                      </div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                          {product.category}{product.sizes?.length ? ` • ${product.sizes.join(', ')}` : ''}
                        </div>
                        <span
                          title={completion.complete ? 'Product setup complete' : `Missing: ${completion.missing.join(', ')}`}
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${completion.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                        >
                          {completion.complete ? 'Complete' : `${completion.missing.length} missing`}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{product.title}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2">{product.subtitle || product.description}</p>
                    </div>
                  </div>
                  <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-semibold block">Price</span>
                      <span className="text-sm font-extrabold text-stone-900">{formatPrice(product.priceLKR)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleOpenModal(product)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700" title="Edit Product">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {isSuperAdmin && (
                        <button onClick={() => onDeleteProduct(product.id)} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600" title="Delete Product">
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

      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <p className="text-xs text-stone-500">Required fields must be complete before the product can be published.</p>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg" aria-label="Close product editor">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label-custom">Product Title *</label>
                  <input type="text" required value={form.title || ''} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="SAELYXE Signature Shirt" className="form-input-custom" />
                </div>
                <div>
                  <label className="form-label-custom">Subtitle</label>
                  <input type="text" value={form.subtitle || ''} onChange={event => setForm({ ...form, subtitle: event.target.value })} placeholder="Premium cotton, refined silhouette" className="form-input-custom" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Price (LKR) *</label>
                  <input type="number" required min={1} step={1} value={form.priceLKR ?? 0} onChange={event => setForm({ ...form, priceLKR: Number(event.target.value) })} className="form-input-custom" />
                </div>
                <div>
                  <label className="form-label-custom">Category *</label>
                  <select value={form.category || 'men'} onChange={event => setForm({ ...form, category: event.target.value as Product['category'] })} className="form-input-custom">
                    {CATEGORY_OPTIONS.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label-custom">Badge</label>
                  <input type="text" value={form.badge || ''} onChange={event => setForm({ ...form, badge: event.target.value })} placeholder="NEW / LIMITED" className="form-input-custom" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Fabric Details *</label>
                  <input type="text" required value={form.fabricDetails || ''} onChange={event => setForm({ ...form, fabricDetails: event.target.value })} placeholder="400 GSM Combed Cotton" className="form-input-custom" />
                </div>
                <div>
                  <label className="form-label-custom">Stock Units *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={form.stockCount ?? 0}
                    onChange={event => {
                      const stock = Math.max(0, Number(event.target.value) || 0);
                      setForm({ ...form, stockCount: stock, inStock: stock > 0 });
                    }}
                    className="form-input-custom"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <label className="form-label-custom">Availability</label>
                  <div className={`rounded-xl border px-3 py-2.5 ${getProductStock(form) > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <div className={`text-xs font-bold ${getProductStock(form) > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {getProductStock(form) > 0 ? 'In Stock' : 'Sold Out'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-stone-500">Automatic from stock units</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Sizes {form.category !== 'accessories' ? '*' : '(optional)'}</label>
                  <input
                    type="text"
                    required={form.category !== 'accessories'}
                    value={(form.sizes || []).join(', ')}
                    onChange={event => setForm({ ...form, sizes: event.target.value.split(',').map(value => value.trim()).filter(Boolean) })}
                    placeholder="S, M, L, XL"
                    className="form-input-custom"
                  />
                </div>
                <div>
                  <label className="form-label-custom">Color *</label>
                  <input type="text" required value={form.color || ''} onChange={event => setForm({ ...form, color: event.target.value })} placeholder="Ivory" className="form-input-custom" />
                </div>
                <div>
                  <label className="form-label-custom">Fit *</label>
                  <input type="text" required value={form.fit || ''} onChange={event => setForm({ ...form, fit: event.target.value })} placeholder="Relaxed Tailored Fit" className="form-input-custom" />
                </div>
              </div>

              <div>
                <label className="form-label-custom">Editorial Description *</label>
                <textarea rows={3} required value={form.description || ''} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Describe the garment, construction, feel, and design." className="form-textarea-custom" />
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <label className="form-label-custom mb-1!">Product Images *</label>
                    <p className="text-[10px] leading-relaxed text-stone-500">Choose images directly from your computer. They are optimized before secure upload.</p>
                  </div>
                  <div className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[10px] font-bold text-stone-500 shrink-0">{getImageUrls().length}/16</div>
                </div>

                <label
                  className={`group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-5 py-6 text-center transition-all ${isUploadingImages ? 'pointer-events-none border-stone-300 opacity-70' : 'border-stone-300 hover:border-[#051C12] hover:bg-emerald-50/30'}`}
                  onDragOver={event => event.preventDefault()}
                  onDrop={event => {
                    event.preventDefault();
                    if (!isUploadingImages) void handleImageFiles(Array.from(event.dataTransfer.files || []));
                  }}
                >
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#051C12] text-[#B4F105] shadow-sm">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-stone-800">{isUploadingImages ? 'Uploading & optimizing...' : 'Choose images from computer'}</p>
                  <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-stone-400">Click here or drag & drop. JPG, PNG, WebP or AVIF. Multiple files supported.</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    className="hidden"
                    disabled={isUploadingImages}
                    onChange={event => {
                      const files = Array.from(event.target.files || []);
                      event.target.value = '';
                      void handleImageFiles(files);
                    }}
                  />
                </label>

                {uploadStatus && (
                  <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] font-medium flex items-center gap-2 ${isUploadingImages ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                    {!isUploadingImages && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {uploadStatus}
                  </div>
                )}

                {getImageUrls().length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {getImageUrls().map((url, index) => (
                      <div key={url} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
                        <div className="relative aspect-4/5 overflow-hidden bg-stone-100">
                          <img src={url} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                            {index === 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#051C12] px-2 py-1 text-[9px] font-bold text-white">
                                <Star className="h-2.5 w-2.5 fill-[#B4F105] text-[#B4F105]" /> PRIMARY
                              </span>
                            )}
                            {form.hoverImage === url && <span className="rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold text-stone-700">HOVER</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 border-t border-stone-100">
                          <button type="button" onClick={() => makePrimaryImage(url)} disabled={index === 0} className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 disabled:text-stone-300">{index === 0 ? 'Primary' : 'Make Primary'}</button>
                          <button type="button" onClick={() => removeImageUrl(url)} className="border-l border-stone-100 px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
                    <ImageIcon className="h-4 w-4 shrink-0" /> Upload at least one image before publishing.
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="form-label-custom">Hover Image</label>
                    <select value={form.hoverImage || ''} onChange={event => setForm({ ...form, hoverImage: event.target.value })} className="form-input-custom">
                      <option value="">Use second image automatically</option>
                      {getImageUrls().map((url, index) => <option key={url} value={url}>Image {index + 1}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-custom">Complete-the-set Product</label>
                    <select value={form.completeTheSetProductId || ''} onChange={event => setForm({ ...form, completeTheSetProductId: event.target.value })} className="form-input-custom">
                      <option value="">None</option>
                      {products.filter(product => product.id !== editingProduct?.id).map(product => <option key={product.id} value={product.id}>{product.title}</option>)}
                    </select>
                  </div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800">Advanced · Paste image URLs</summary>
                  <textarea
                    rows={3}
                    value={imagesText}
                    onChange={event => {
                      setImagesText(event.target.value);
                      setForm(current => ({ ...current, images: event.target.value.split('\n').map(url => url.trim()).filter(url => url.startsWith('https://')).slice(0, 16) }));
                    }}
                    placeholder="One HTTPS image URL per line"
                    className="form-textarea-custom mt-2 font-mono text-xs"
                  />
                </details>
              </div>

              <div>
                <label className="form-label-custom">Bullet Specifications</label>
                <textarea rows={3} value={bulletsText} onChange={event => setBulletsText(event.target.value)} placeholder="One product feature per line" className="form-textarea-custom font-mono text-xs" />
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="btn-table-action">Cancel</button>
                <button type="submit" disabled={isSaving || isUploadingImages} className="btn-saelyxe-primary">
                  {isUploadingImages ? 'Uploading Images...' : isSaving ? 'Saving Product...' : 'Save & Publish Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
