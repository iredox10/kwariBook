import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { addBroker } from '../lib/db';
import { X } from 'lucide-react';

interface AddBrokerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddBrokerForm({ onSuccess, onCancel }: AddBrokerFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setIsSubmitting(true);
    try {
      await addBroker({
        name,
        phone,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add broker:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
      <button 
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        <X size={20} />
      </button>
      
      <h3 className="text-xl font-bold text-gray-800 mb-6">{t('addBroker')}</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('brokerName')}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
            placeholder="E.g. Alhaji Sani"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('phoneNumber')}
          </label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-kwari-green focus:border-transparent outline-none transition-all"
            placeholder="080..."
          />
        </div>

        <div className="pt-4 flex space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 p-3 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 p-3 bg-kwari-green text-white font-bold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t('recording') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
