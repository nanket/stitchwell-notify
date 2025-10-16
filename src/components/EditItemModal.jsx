import React, { useState } from 'react';
import { X, Package, Hash, Pencil } from 'lucide-react';
import useStore, { CLOTH_TYPES } from '../store/useStore';
import { useI18n } from '../i18n';

const EditItemModal = ({ item, onClose }) => {
  const { t, trType } = useI18n();
  const { updateClothItemDetails } = useStore();

  const [formData, setFormData] = useState({
    type: item?.type || '',
    billNumber: String(item?.billNumber ?? ''),
    quantity: Number(item?.quantity) || 1,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.type) newErrors.type = t('create_item.error_select_type');
    if (!String(formData.billNumber || '').trim()) newErrors.billNumber = t('create_item.error_bill_required');
    if (!(Number(formData.quantity) >= 1)) newErrors.quantity = t('create_item.error_quantity_min');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const ok = await updateClothItemDetails(item.id, {
        type: formData.type,
        billNumber: String(formData.billNumber || '').trim(),
        quantity: Number(formData.quantity) || 1,
      });
      if (ok) onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Pencil className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('edit_item.title') || 'Edit Item'}</h2>
              <p className="text-sm text-gray-600">{t('edit_item.subtitle') || 'Modify item details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Cloth Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('create_item.cloth_type')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CLOTH_TYPES.map((type) => (
                <label
                  key={type}
                  className={`relative flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.type === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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
                  <span className={`text-sm font-medium ${formData.type === type ? 'text-blue-700' : 'text-gray-700'}`}>
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
            {errors.type && <p className="mt-2 text-sm text-red-600">{errors.type}</p>}
          </div>

          {/* Bill Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('create_item.bill_number')}</label>
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
            {errors.billNumber && <p className="mt-2 text-sm text-red-600">{errors.billNumber}</p>}
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('create_item.quantity')}</label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleInputChange('quantity', Math.max(1, Number(formData.quantity) - 1))}
                className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
                disabled={Number(formData.quantity) <= 1}
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
                onClick={() => handleInputChange('quantity', Number(formData.quantity) + 1)}
                className="flex-shrink-0 w-10 h-10 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <span className="text-lg font-medium">+</span>
              </button>
            </div>
            {errors.quantity && <p className="mt-2 text-sm text-red-600">{errors.quantity}</p>}
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-2" disabled={isSubmitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="flex-1 btn-primary py-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('edit_item.saving') || 'Saving...'}
                </div>
              ) : (
                t('edit_item.save') || 'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;

