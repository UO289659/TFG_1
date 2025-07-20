import React from 'react';
import TransactionForm from './TransactionForm';

const EditTransactionModal = ({
  isOpen,
  onClose,
  onSubmit,
  transaction,
  friends,
  expenseCategories,
  incomeCategories,
  iconOptions,
  isPremium
}) => {
  if (!isOpen) return null;

  // Preparar datos iniciales para edición
 const prepareInitialData = (transaction) => {
  // 1. Lista de todos los participantes (incluye al propio usuario)
  let allParticipantIds = [transaction.clientId.toString()];
  let customAmounts = {
    [transaction.clientId.toString()]: transaction.value
  };

  if (transaction.sharedWith && Array.isArray(transaction.sharedWith)) {
    transaction.sharedWith.forEach(item => {
      if (item.userId) {
        const id = item.userId.toString();
        if (!allParticipantIds.includes(id)) {
          allParticipantIds.push(id);
        }
        if (transaction.splitType === 'custom' && item.amount !== undefined) {
          customAmounts[id] = item.amount;
        }
      }
    });
  }

  return {
    name: transaction.name,
    type: transaction.type,
    category: transaction.category,
    value: transaction.originalValue,
    originalValue: transaction.originalValue,
    icon: transaction.icon,
    _id: transaction._id,
    clientId: transaction.clientId,
    sharedWith: allParticipantIds.filter(id => id !== transaction.clientId.toString()),
    splitType: transaction.splitType || "equal",
    customAmounts,
    isSharedExpense: allParticipantIds.length > 1
  };
};

  const handleSubmit = (formData) => {
    console.log("📤 Enviando datos desde EditTransactionModal:", formData);
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="my-modal-content-wide">
        <div className="my-modal-header">
          <h2 className="my-modal-title">Editar Transacción</h2>
        </div>
        <div className="my-modal-body">
          <TransactionForm
            initialData={prepareInitialData(transaction)}
            onSubmit={handleSubmit}
            onCancel={onClose}
            friends={friends}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            iconOptions={iconOptions}
            isPremium={isPremium}
            isEditing={true}
          />
        </div>
      </div>
    </div>
  );
};

export default EditTransactionModal;