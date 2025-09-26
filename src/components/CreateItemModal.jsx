import React, { useState } from 'react';
import { X, Package, Hash, Camera } from 'lucide-react';
import useStore, { CLOTH_TYPES } from '../store/useStore';
import { useI18n } from '../i18n';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const CreateItemModal = ({ onClose }) => {
  const { t, trType } = useI18n();
  const [formData, setFormData] = useState({
    type: '',
    billNumber: '',
    quantity: 1,
    customerName: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0, percent: 0 });
  const [uploadError, setUploadError] = useState('');

  const { createClothItem } = useStore();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.type) {
      newErrors.type = t('create_item.error_select_type');
    }

    if (!formData.billNumber.trim()) {
      newErrors.billNumber = t('create_item.error_bill_required');
    }

    if (!(Number(formData.quantity) >= 1)) {
      newErrors.quantity = t('create_item.error_quantity_min');
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create a thumbnail Blob using canvas (max 256px on the longest side)
  async function makeThumbnail(file) {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const maxSide = 256;
            let { width, height } = img;
            const scale = Math.min(1, maxSide / Math.max(width, height));
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob); else reject(new Error('THUMBNAIL_BLOB_NULL'));
            }, 'image/jpeg', 0.7);
          } catch (e) { reject(e); }
        };
        img.onerror = () => reject(new Error('IMAGE_LOAD_FAIL'));
        img.src = URL.createObjectURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setUploadError('');

    try {
      // Upload images first (if any), along with thumbnails
      const storage = getStorage();
      const images = [];
      const bill = formData.billNumber.trim();
      const total = files.length || 0;
      let done = 0;
      setUploadProgress({ done, total, percent: total ? 0 : 100 });

      for (const f of files) {
        // Build safe filename and paths
        const base = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
        const ext = (f.name && f.name.split && f.name.split('.').pop && f.name.split('.').pop() || 'jpg').toLowerCase();
        const safeName = `${base}_${(f.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const fullPath = `cloth-items/${bill}/${safeName}`;
        const thumbPath = `cloth-items/${bill}/_thumbs/${base}.jpg`;

        // Upload full image with progress
        const fullRef = storageRef(storage, fullPath);
        await new Promise((res, rej) => {
          const task = uploadBytesResumable(fullRef, f);
          task.on('state_changed', (snap) => {
            const filePct = Math.round((snap.bytesTransferred / Math.max(1, snap.totalBytes)) * 100);
            setUploadProgress((p) => ({ done, total, percent: Math.round(((done + filePct / 100) / Math.max(1, total)) * 100) }));
          }, rej, res);
        });
        const fullUrl = await getDownloadURL(fullRef);

        // Create and upload thumbnail
        let thumbUrl = '';
        try {
          const thumbBlob = await makeThumbnail(f);
          const tRef = storageRef(storage, thumbPath);
          await new Promise((res, rej) => {
            const task = uploadBytesResumable(tRef, thumbBlob);
            task.on('state_changed', () => {}, rej, res);
          });
          thumbUrl = await getDownloadURL(tRef);
        } catch (e) {
          // If thumbnail generation fails, fallback to full
          thumbUrl = fullUrl;
        }

        images.push({ fullUrl, thumbUrl, path: fullPath, thumbPath });
        done += 1;
        setUploadProgress({ done, total, percent: Math.round((done / Math.max(1, total)) * 100) });
      }

      await createClothItem(formData.type, bill, images, Number(formData.quantity) || 1, formData.customerName.trim() || null);
      onClose();
    } catch (error) {
      console.error('Error creating item:', error);
      setUploadError(t('create_item.upload_error') || 'Upload failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('create_item.title')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('create_item.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cloth Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('create_item.cloth_type')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CLOTH_TYPES.map((type) => (
                <label
                  key={type}
                  className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.type === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="sr-only"
                  />
                  <span className={`text-sm font-medium ${
                    formData.type === type ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {trType(type)}
                  </span>
                  {formData.type === type && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </label>
              ))}
            </div>
            {errors.type && (
              <p className="mt-2 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* Bill Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('create_item.bill_number')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.billNumber}
                onChange={(e) => handleInputChange('billNumber', e.target.value)}
                className={`input pl-10 ${errors.billNumber ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder={t('create_item.bill_placeholder')}
              />
            </div>
            {errors.billNumber && (
              <p className="mt-2 text-sm text-red-600">{errors.billNumber}</p>
            )}
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('create_item.customer_name') || 'Customer Name (Optional)'}
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleInputChange('customerName', e.target.value)}
              className="input"
              placeholder={t('create_item.customer_placeholder') || 'Enter customer name'}
            />
          </div>


          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('create_item.quantity')}
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleInputChange('quantity', Math.max(1, formData.quantity - 1))}
                className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
                disabled={formData.quantity <= 1}
              >
                <span className="text-lg font-medium">−</span>
              </button>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', Math.max(1, Number(e.target.value) || 1))}
                className={`flex-1 text-center input ${errors.quantity ? 'border-red-300 focus:ring-red-500' : ''}`}
                placeholder={t('create_item.quantity_placeholder') || 'Enter quantity'}
              />
              <button
                type="button"
                onClick={() => handleInputChange('quantity', formData.quantity + 1)}
                className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-lg font-medium">+</span>
              </button>
            </div>
            {errors.quantity && (
              <p className="mt-2 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('create_item.photos') || 'Photos (optional)'}
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="btn-secondary cursor-pointer inline-flex items-center">
                <Camera className="h-4 w-4 mr-2" /> {t('create_item.add_photo') || 'Add photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
              <div className="text-xs text-gray-500">{files.length > 0 ? `${files.length} ${t('create_item.selected') || 'selected'}` : t('create_item.photo_hint') || 'Use camera or gallery'}</div>
              {isSubmitting && (
                <div className="text-xs text-blue-700">
                  {(t('create_item.uploading') || 'Uploading') + ` ${uploadProgress.done}/${uploadProgress.total}`}{uploadProgress.total ? ` (${uploadProgress.percent}%)` : ''}
                </div>
              )}
              {uploadError && (
                <div className="text-xs text-red-600">{uploadError}</div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary py-2"
              disabled={isSubmitting}
            >
              {t('create_item.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary py-2"
              disabled={isSubmitting || !formData.type || !formData.billNumber.trim() || !(Number(formData.quantity) >= 1)}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('create_item.creating')}
                </div>
              ) : (
                t('create_item.create')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateItemModal;
