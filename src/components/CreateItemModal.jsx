import React, { useState } from 'react';
import { X, Package, Hash } from 'lucide-react';
import useStore, { CLOTH_TYPES } from '../store/useStore';

const CreateItemModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    type: '',
    billNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createClothItem, getAllItems } = useStore();
  const existingItems = getAllItems();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.type) {
      newErrors.type = 'Please select a cloth type';
    }

    if (!formData.billNumber.trim()) {
      newErrors.billNumber = 'Bill number is required';
    } else if (existingItems.some(item => item.billNumber === formData.billNumber.trim())) {
      newErrors.billNumber = 'Bill number already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createClothItem(formData.type, formData.billNumber.trim());
      onClose();
    } catch (error) {
      console.error('Error creating item:', error);
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
                Create New Item
              </h2>
              <p className="text-sm text-gray-600">
                Add a new cloth item to the workflow
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
              Cloth Type *
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
                    {type}
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
              Bill Number *
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
                placeholder="Enter unique bill number"
              />
            </div>
            {errors.billNumber && (
              <p className="mt-2 text-sm text-red-600">{errors.billNumber}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary py-2"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary py-2"
              disabled={isSubmitting || !formData.type || !formData.billNumber.trim()}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Create Item'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateItemModal;
