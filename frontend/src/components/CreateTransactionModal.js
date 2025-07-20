// CreateTransactionModal.js
import React from 'react';
import TransactionForm from './TransactionForm';

const CreateTransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  friends,
  expenseCategories,
  incomeCategories,
  iconOptions,
  isPremium
}) => {
  if (!isOpen) return null;

  const handleSubmit = (formData) => {
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="my-modal-content-wide">
        <div className="my-modal-header">
          <h2 className="my-modal-title">Nueva Transacción</h2>
        </div>
        <div className="my-modal-body">
          <TransactionForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            friends={friends}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            iconOptions={iconOptions}
            isPremium={isPremium}
            isEditing={false}
          />
        </div>
      </div>
    </div>
  );
};
export default CreateTransactionModal;