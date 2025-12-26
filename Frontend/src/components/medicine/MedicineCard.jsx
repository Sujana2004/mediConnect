import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Heart,
  Star,
  Truck,
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';
import { medicineAPI } from '../../services/api';

const toTitleCase = (s) => {
  if (!s) return '';
  return s
    .toString()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
};

const MedicineCard = ({ medicine, onCheckAvailability, pincode }) => {
  const { t } = useTranslation();
  const [ordering, setOrdering] = useState(false);

  return (
    <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow min-h-[320px]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center mb-2">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mr-3 font-bold text-lg uppercase flex-shrink-0">
              {medicine.name ? medicine.name.charAt(0) : '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 truncate">
                {toTitleCase(medicine.name)}
              </h3>
              <div className="text-sm text-gray-600 mt-1 truncate">{medicine.brand}</div>
              <div className="text-xs text-gray-500 truncate">{medicine.manufacturer}</div>
            </div>
          </div>
        </div>
        {medicine.prescriptionRequired && (
          <div className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {t('medicine.prescriptionRequired')}
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center mb-4">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-4 w-4 ${
                star <= Math.floor(medicine.rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="ml-2 text-sm text-gray-600">
          {medicine.rating} ({medicine.totalRatings})
        </span>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-center">
          <span className="text-2xl font-bold text-gray-900">
            ₹{medicine.discountPrice}
          </span>
          <span className="ml-2 text-lg text-gray-500 line-through">
            ₹{medicine.price}
          </span>
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            {medicine.discount}% OFF
          </span>
        </div>
      </div>

      {/* Stock Status */}
      <div className="mb-4">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          medicine.inStock
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {medicine.inStock ? (
            <>
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {t('medicine.inStock')} ({medicine.stockCount})
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
              {t('medicine.outOfStock')}
            </>
          )}
        </div>
      </div>

      {/* Delivery Info */}
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <Truck className="h-4 w-4 mr-2 text-green-500" />
        <span>{t('medicine.deliveryIn')} {medicine.deliveryTime}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {medicine.description}
      </p>

      {/* Availability Check */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={pincode}
              placeholder={t('medicine.enterPincode')}
              maxLength="6"
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={() => onCheckAvailability(medicine.id)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            {t('medicine.check')}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={async () => {
            if (ordering) return;
            try {
              setOrdering(true);
              const payload = { items: [{ medicineId: medicine.id || medicine._id, quantity: 1 }] };
              const res = await medicineAPI.checkout(payload);
              const orderId = res?.data?.orderId || res?.data?.id || res?.data?.order?.id;
              alert(orderId ? `Order placed — ID: ${orderId}` : 'Order placed successfully');
            } catch (err) {
              console.error('Order error', err);
              alert(err?.message || 'Failed to place order. Please try again.');
            } finally {
              setOrdering(false);
            }
          }}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm font-medium"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {ordering ? t('medicine.ordering') : t('medicine.addToCart')}
        </button>
        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Heart className="h-4 w-4 text-gray-600" />
        </button>
        <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Info className="h-4 w-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default MedicineCard;