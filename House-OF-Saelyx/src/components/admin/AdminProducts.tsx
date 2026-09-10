import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  ADMIN_IMAGE_ACCEPT,
  isSupportedAdminImageFile,
  uploadAdminImage
} from '../../lib/adminMedia';

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

const COMMON_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

function parseSizesText(value: string) {
  return Array.from(new Set(
    value
      .split(',')
      .map(size => size.trim())
      .filter(Boolean)
  ));
}

function getProductStock(product: Partial<Product>) {
  return Math.max(0, Number(product.stockCount) || 0);
}

function normalizeHttpsUrls(values: unknown[]) {
  return Array.from(new Set(
    values
      .map(value => String(value || '').trim())
      .filter(value => value.startsWith('https://'))
  )).slice(0, 16);
}

function getProductCompletion(product: Partial<Product>) {
  const missing: string[] = [];
  if (!product.title?.trim()) missing.push('title');
  if (!(Number(product.priceLKR) > 0)) missing.push('price');
  if (!product.category) missing.push('category');
  if (!normalizeHttpsUrls(Array.isArray(product.images) ? product.images : []).length) missing.push('image');
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
  const [sizesText, setSizesText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageUrls = useMemo(
    () => normalizeHttpsUrls(Array.isArray(form.images) ? form.images : []),
    [form.images]
  );

  const resetEditorState = useCallback(() => {
    setForm(createEmptyProduct());
    setBulletsText('');
    setImagesText('');
    setSizesText('');
    setFormError('');
    setUploadStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const closeProductModal = useCallback(() => {
    if (isSaving || isUploadingImages) return;
    setIsProductModalOpen(false);
    setEditingProduct(null);
    resetEditorState();
  }, [isSaving, isUploadingImages, resetEditorState, setEditingProduct, setIsProductModalOpen]);

  useEffect(() => {
    if (!isProductModalOpen) return;
    setFormError('');
    setUploadStatus('');
    if (editingProduct) {
      const urls = normalizeHttpsUrls(editingProduct.images || []);
      const existingSizes = Array.from(new Set((editingProduct.sizes || []).map(size => String(size || '').trim()).filter(Boolean)));
      setForm({
        ...editingProduct,
        images: urls,
        sizes: existingSizes,
        hoverImage: editingProduct.hoverImage && urls.includes(editingProduct.hoverImage) ? editingProduct.hoverImage : '',
        completeTheSetProductId: editingProduct.completeTheSetProductId || '',
        bulletDetails: editingProduct.bulletDetails || []
      });
      setBulletsText((editingProduct.bulletDetails || []).join('\n'));
      setImagesText(urls.join('\n'));
      setSizesText(existingSizes.join(', '));
    } else {
      resetEditorState();
    }
  }, [editingProduct, isProductModalOpen, resetEditorState]);

  useEffect(() => {
    if (!isProductModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving && !isUploadingImages) closeProductModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeProductModal, isProductModalOpen, isSaving, isUploadingImages]);

  const syncImages = useCallback((urls: string[]) => {
    const unique = normalizeHttpsUrls(urls);
    setImagesText(unique.join('\n'));
    setForm(current => ({
      ...current,
      images: unique,
      hoverImage: current.hoverImage && unique.includes(current.hoverImage) ? current.hoverImage : ''
    }));
  }, []);

  const syncSizes = useCallback((value: string) => {
    setSizesText(value);
    const parsed = parseSizesText(value);
    setForm(current => ({ ...current, sizes: parsed }));
  }, []);

  const toggleCommonSize = useCallback((size: string) => {
    const currentSizes = parseSizesText(sizesText);
    const nextSizes = currentSizes.includes(size)
      ? currentSizes.filter(item => item !== size)
      : [...currentSizes, size];
    const nextText = nextSizes.join(', ');
    setSizesText(nextText);
    setForm(current => ({ ...current, sizes: nextSizes }));
  }, [sizesText]);

  const removeImageUrl = (url: string) => syncImages(imageUrls.filter(item => item !== url));
  const makePrimaryImage = (url: string) => syncImages([url, ...imageUrls.filter(item => item !== url)]);

  const handleImageFiles = async (files: File[]) => {
    if (isUploadingImages || isSaving || files.length === 0) return;

    const dedupedFiles = Array.from(new Map(
      files.map(file => [`${file.name}|${file.size}|${file.lastModified}`, file] as const)
    ).values());
    const unsupported = dedupedFiles.filter(file => !isSupportedAdminImageFile(file));
    if (unsupported.length) {
      setFormError(`Unsupported image type: ${unsupported.map(file => file.name).join(', ')}. Use JPG, PNG, WebP, or AVIF.`);
      return;
    }
    if (imageUrls.length + dedupedFiles.length > 16) {
      setFormError(`A product can have up to 16 images. You can add ${Math.max(0, 16 - imageUrls.length)} more.`);
      return;
    }

    setIsUploadingImages(true);
    setFormError('');
    setUploadStatus('Preparing images from your computer...');
    const baseUrls = [...imageUrls];
    const uploadedUrls: string[] = [];

    try {
      for (let index = 0; index < dedupedFiles.length; index += 1) {
        const file = dedupedFiles[index];
        setUploadStatus(`Uploading ${index + 1} of ${dedupedFiles.length}: ${file.name}`);
        const url = await uploadAdminImage(file, 'products');
        uploadedUrls.push(url);
        syncImages([...baseUrls, ...uploadedUrls]);
      }
      setUploadStatus(uploadedUrls.length === 1
        ? 'Image uploaded successfully.'
        : `${uploadedUrls.length} images uploaded successfully.`);
    } catch (error) {
      if (uploadedUrls.length) syncImages([...baseUrls, ...uploadedUrls]);
      setUploadStatus('');
      setFormError(error instanceof Error ? error.message : 'Image upload failed. Please retry.');
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsProductModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving || isUploadingImages) return;
    setFormError('');

    const price = Number(form.priceLKR);
    const stock = Number(form.stockCount);
    const normalizedSizes = parseSizesText(sizesText);
    const parsedImages = normalizeHttpsUrls(imageUrls);
    const publishCheck = getProductCompletion({ ...form, images: parsedImages, sizes: normalizedSizes });

    if (!form.title?.trim()) return setFormError('Product title is required.');
    if (!Number.isFinite(price) || price <= 0) return setFormError('Price must be greater than zero.');
    if (!Number.isInteger(stock) || stock < 0) return setFormError('Stock must be a whole number of zero or more.');
    if (!parsedImages.length) return setFormError('Upload at least one product image before publishing.');
    if (!form.description?.trim()) return setFormError('Editorial description is required before publishing.');
    if (!form.fabricDetails?.trim()) return setFormError('Fabric details are required before publishing.');
    if (!form.color?.trim()) return setFormError('Product color is required before publishing.');
    if (!form.fit?.trim()) return setFormError('Product fit is required before publishing.');
    if (form.category !== 'accessories' && normalizedSizes.length === 0) return setFormError('Add at least one size for clothing products.');
    if (!publishCheck.complete) return setFormError(`Complete the required product fields: ${publishCheck.missing.join(', ')}.`);

    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!slug) return setFormError('Product title must contain letters or numbers.');
    const collision = products.find(product => product.slug === slug && product.id !== editingProduct?.id);
    if (collision) return setFormError('Another product already uses this title/slug. Choose a distinct title.');

    const parsedBullets = bulletsText.split('\n').map(item => item.trim()).filter(Boolean);
    const payload: Partial<Product> = {
      ...(editingProduct ? { id: editingProduct.id } : {}),
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || '',
      description: form.description.trim(),
      fabricDetails: form.fabricDetails.trim(),
      color: form.color.trim(),
      fit: form.fit.trim(),
      priceLKR: price,
      stockCount: stock,
      inStock: stock > 0,
      images: parsedImages,
      hoverImage: form.hoverImage && parsedImages.includes(form.hoverImage) ? form.hoverImage : '',
      sizes: normalizedSizes,
      bulletDetails: parsedBullets,
      slug
    };

    setIsSaving(true);
    try {
      const result = await onSaveProduct(payload);
      if (!result.success) {
        setFormError(result.error || 'Product could not be saved. Please review the fields and try again.');
        return;
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      resetEditorState();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'An unexpected product save error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = useMemo(() => products.filter(product => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query ||
      product.title.toLowerCase().includes(query) ||
      product.subtitle?.toLowerCase().includes(query) ||
      product.badge?.toLowerCase().includes(query);
    return matchesSearch && (selectedCategory === 'all' || product.category === selectedCategory);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()), [products, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="admin-card p-4! flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-70">
          <div className="table-search-box max-w-md! w-full">
            <Search className="w-4 h-4 text-stone-400" />
            <input type="text" placeholder="Search products..." value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="table-search-input" />
          </div>
          <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value as 'all' | Product['category'])} className="form-input-custom max-w-48" aria-label="Filter products by category">
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-500 hidden sm:inline">Showing <strong>{filteredProducts.length}</strong> products</span>
          <button type="button" onClick={() => handleOpenModal()} className="btn-saelyxe-lime text-xs">
            <Plus className="w-3.5 h-3.5" /><span>Add Product</span>
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="admin-card text-center py-16">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No products found</h3>
          <p className="text-xs text-stone-400 mt-1">Adjust the filter or add a new SAELYXE product.</p>
          <button type="button" onClick={() => handleOpenModal()} className="btn-saelyxe-primary text-xs mt-4"><Plus className="w-3.5 h-3.5" />Add Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map(product => {
            const stock = getProductStock(product);
            const completion = getProductCompletion(product);
            return (
              <div key={product.id} className={`admin-card p-0! overflow-hidden flex flex-col justify-between group hover:shadow-md transition-all border-2 ${completion.complete ? 'border-emerald-300' : 'border-amber-200'}`}>
                <div>
                  <div className="relative aspect-4/5 bg-stone-100 overflow-hidden">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">Image required</div>}
                    {(product.hoverImage || product.images?.[1]) && (
                      <img src={product.hoverImage || product.images[1]} alt={`${product.title} alternate view`} className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100" loading="lazy" />
                    )}
                    {product.badge && <div className="absolute top-3 left-3 bg-stone-900/80 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md">{product.badge}</div>}
                    <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${stock > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{stock > 0 ? `${stock} in stock` : 'Sold Out'}</div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">{product.category}{product.sizes?.length ? ` • ${product.sizes.join(', ')}` : ''}</div>
                      <span title={completion.complete ? 'Product setup complete' : `Missing: ${completion.missing.join(', ')}`} className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${completion.complete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{completion.complete ? 'Complete' : `${completion.missing.length} missing`}</span>
                    </div>
                    <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{product.title}</h3>
                    <p className="text-xs text-stone-500 line-clamp-2">{product.subtitle || product.description}</p>
                  </div>
                </div>
                <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                  <div><span className="text-[10px] text-stone-400 uppercase font-semibold block">Price</span><span className="text-sm font-extrabold text-stone-900">{formatPrice(product.priceLKR)}</span></div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => handleOpenModal(product)} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700" title="Edit Product"><Edit3 className="w-3.5 h-3.5" /></button>
                    {isSuperAdmin && <button type="button" onClick={() => onDeleteProduct(product.id)} className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600" title="Delete Product"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isProductModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) closeProductModal();
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="product-editor-title" className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200" onMouseDown={event => event.stopPropagation()}>
            <div className="p-5 border-b border-stone-100 flex items-center justify-between gap-4">
              <div>
                <h3 id="product-editor-title" className="text-base font-extrabold text-stone-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <p className="text-xs text-stone-500">Required fields must be complete before publishing.</p>
              </div>
              <button type="button" onClick={closeProductModal} disabled={isSaving || isUploadingImages} className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg disabled:opacity-40" aria-label="Close product editor"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              {formError && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{formError}</span></div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="form-label-custom">Product Title *</label><input type="text" required value={form.title || ''} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} placeholder="SAELYXE Signature Shirt" className="form-input-custom" /></div>
                <div><label className="form-label-custom">Subtitle</label><input type="text" value={form.subtitle || ''} onChange={event => setForm(current => ({ ...current, subtitle: event.target.value }))} placeholder="Premium cotton, refined silhouette" className="form-input-custom" /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="form-label-custom">Price (LKR) *</label><input type="number" required min={1} step={1} value={form.priceLKR ?? 0} onChange={event => setForm(current => ({ ...current, priceLKR: Number(event.target.value) }))} className="form-input-custom" /></div>
                <div><label className="form-label-custom">Category *</label><select value={form.category || 'men'} onChange={event => setForm(current => ({ ...current, category: event.target.value as Product['category'] }))} className="form-input-custom">{CATEGORY_OPTIONS.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div>
                <div><label className="form-label-custom">Badge</label><input type="text" value={form.badge || ''} onChange={event => setForm(current => ({ ...current, badge: event.target.value }))} placeholder="NEW / LIMITED" className="form-input-custom" /></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="form-label-custom">Fabric Details *</label><input type="text" required value={form.fabricDetails || ''} onChange={event => setForm(current => ({ ...current, fabricDetails: event.target.value }))} placeholder="400 GSM Combed Cotton" className="form-input-custom" /></div>
                <div><label className="form-label-custom">Stock Units *</label><input type="number" required min={0} step={1} value={form.stockCount ?? 0} onChange={event => { const stock = Math.max(0, Number(event.target.value) || 0); setForm(current => ({ ...current, stockCount: stock, inStock: stock > 0 })); }} className="form-input-custom" /></div>
                <div className="flex flex-col justify-center"><label className="form-label-custom">Availability</label><div className={`rounded-xl border px-3 py-2.5 ${getProductStock(form) > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}><div className={`text-xs font-bold ${getProductStock(form) > 0 ? 'text-emerald-800' : 'text-rose-800'}`}>{getProductStock(form) > 0 ? 'In Stock' : 'Sold Out'}</div><div className="mt-0.5 text-[10px] text-stone-500">Automatic from stock units</div></div></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label-custom">Sizes {form.category !== 'accessories' ? '*' : '(optional)'}</label>
                  <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Common size options">
                    {COMMON_SIZE_OPTIONS.map(size => {
                      const selected = parseSizesText(sizesText).includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleCommonSize(size)}
                          className={`min-w-9 rounded-lg border px-2.5 py-1.5 text-[10px] font-extrabold transition-colors ${selected ? 'border-[#051C12] bg-[#051C12] text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    required={form.category !== 'accessories'}
                    value={sizesText}
                    onChange={event => syncSizes(event.target.value)}
                    placeholder="S, M, L, XL"
                    className="form-input-custom"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-[10px] leading-relaxed text-stone-400">Select sizes above or type custom sizes separated by commas.</p>
                </div>
                <div><label className="form-label-custom">Color *</label><input type="text" required value={form.color || ''} onChange={event => setForm(current => ({ ...current, color: event.target.value }))} placeholder="Ivory" className="form-input-custom" /></div>
                <div><label className="form-label-custom">Fit *</label><input type="text" required value={form.fit || ''} onChange={event => setForm(current => ({ ...current, fit: event.target.value }))} placeholder="Relaxed Tailored Fit" className="form-input-custom" /></div>
              </div>

              <div><label className="form-label-custom">Editorial Description *</label><textarea rows={3} required value={form.description || ''} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Describe the garment, construction, feel, and design." className="form-textarea-custom" /></div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div><label className="form-label-custom mb-1!">Product Images *</label><p className="text-[10px] leading-relaxed text-stone-500">Choose images directly from your computer. They are optimized before secure upload.</p></div>
                  <div className="rounded-full bg-white border border-stone-200 px-2.5 py-1 text-[10px] font-bold text-stone-500 shrink-0">{imageUrls.length}/16</div>
                </div>

                <label className={`group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-5 py-6 text-center transition-all ${isUploadingImages || isSaving ? 'pointer-events-none border-stone-300 opacity-70' : 'border-stone-300 hover:border-[#051C12] hover:bg-emerald-50/30'}`} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void handleImageFiles(Array.from(event.dataTransfer.files || [])); }}>
                  <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-[#051C12] text-[#B4F105] shadow-sm"><UploadCloud className="h-5 w-5" /></div>
                  <p className="text-xs font-bold text-stone-800">{isUploadingImages ? 'Uploading & optimizing...' : 'Choose images from computer'}</p>
                  <p className="mt-1 max-w-sm text-[10px] leading-relaxed text-stone-400">Click or drag & drop. JPG, PNG, WebP or AVIF. Multiple files supported.</p>
                  <input ref={fileInputRef} type="file" accept={ADMIN_IMAGE_ACCEPT} multiple className="hidden" disabled={isUploadingImages || isSaving} onChange={event => void handleImageFiles(Array.from(event.target.files || []))} />
                </label>

                {uploadStatus && <div className={`mt-3 rounded-lg border px-3 py-2 text-[11px] font-medium flex items-center gap-2 ${isUploadingImages ? 'border-sky-200 bg-sky-50 text-sky-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{!isUploadingImages && <CheckCircle2 className="h-3.5 w-3.5" />}{uploadStatus}</div>}

                {imageUrls.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {imageUrls.map((url, index) => (
                      <div key={url} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xs">
                        <div className="relative aspect-4/5 overflow-hidden bg-stone-100">
                          <img src={url} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                            {index === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-[#051C12] px-2 py-1 text-[9px] font-bold text-white"><Star className="h-2.5 w-2.5 fill-[#B4F105] text-[#B4F105]" /> PRIMARY</span>}
                            {form.hoverImage === url && <span className="rounded-full bg-white/95 px-2 py-1 text-[9px] font-bold text-stone-700">HOVER</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 border-t border-stone-100">
                          <button type="button" onClick={() => makePrimaryImage(url)} disabled={index === 0 || isSaving || isUploadingImages} className="px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 disabled:text-stone-300">{index === 0 ? 'Primary' : 'Make Primary'}</button>
                          <button type="button" onClick={() => removeImageUrl(url)} disabled={isSaving || isUploadingImages} className="border-l border-stone-100 px-2 py-2 text-[9px] font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 disabled:opacity-40">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800"><ImageIcon className="h-4 w-4 shrink-0" /> Upload at least one image before publishing.</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div><label className="form-label-custom">Hover Image</label><select value={form.hoverImage || ''} onChange={event => setForm(current => ({ ...current, hoverImage: event.target.value }))} className="form-input-custom"><option value="">Use second image automatically</option>{imageUrls.map((url, index) => <option key={url} value={url}>Image {index + 1}</option>)}</select></div>
                  <div><label className="form-label-custom">Complete-the-set Product</label><select value={form.completeTheSetProductId || ''} onChange={event => setForm(current => ({ ...current, completeTheSetProductId: event.target.value }))} className="form-input-custom"><option value="">None</option>{products.filter(product => product.id !== editingProduct?.id).map(product => <option key={product.id} value={product.id}>{product.title}</option>)}</select></div>
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800">Advanced · Paste image URLs</summary>
                  <textarea rows={3} value={imagesText} onChange={event => { const raw = event.target.value; setImagesText(raw); const urls = normalizeHttpsUrls(raw.split('\n')); setForm(current => ({ ...current, images: urls, hoverImage: current.hoverImage && urls.includes(current.hoverImage) ? current.hoverImage : '' })); }} placeholder="One HTTPS image URL per line" className="form-textarea-custom mt-2 font-mono text-xs" />
                </details>
              </div>

              <div><label className="form-label-custom">Bullet Specifications</label><textarea rows={3} value={bulletsText} onChange={event => setBulletsText(event.target.value)} placeholder="One product feature per line" className="form-textarea-custom font-mono text-xs" /></div>

              <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                {(isSaving || isUploadingImages) && <span className="text-[10px] text-stone-500">Please wait for the current operation to finish before closing.</span>}
                <div className="ml-auto flex items-center gap-3">
                  <button type="button" onClick={closeProductModal} disabled={isSaving || isUploadingImages} className="btn-table-action disabled:opacity-40">Cancel</button>
                  <button type="submit" disabled={isSaving || isUploadingImages} className="btn-saelyxe-primary">{isUploadingImages ? 'Uploading Images...' : isSaving ? 'Saving Product...' : 'Save & Publish Product'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
