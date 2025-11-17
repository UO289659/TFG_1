// =================== EditTransactionModal.js ===================
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

  const prepareInitialData = (transaction) => {
    // 1. Lista de todos los participantes
    let allParticipantIds = [transaction.clientId.toString()];
    let customAmounts = {};

    // 2. Verificar qué valor del creador usar
    const creatorAmount = transaction.value;
    customAmounts[transaction.clientId.toString()] = creatorAmount;

    // 3. Procesar sharedWith existente
    if (transaction.sharedWith && Array.isArray(transaction.sharedWith)) {
      
      transaction.sharedWith.forEach((item, index) => {
        
        if (item.userId) {
          const id = item.userId.toString();
          
          if (!allParticipantIds.includes(id)) {
            allParticipantIds.push(id);
          }
          
          if (transaction.splitType === 'custom') {
            if (item.amount !== undefined && item.amount !== null) {
              customAmounts[id] = item.amount;
            }
          } else {
            customAmounts[id] = transaction.value;
            
          }
        }
      });
    }

    const sharedWithIds = allParticipantIds.filter(id => id !== transaction.clientId.toString());
    
    const finalData = {
      name: transaction.name,
      type: transaction.type,
      category: transaction.category.name,
      value: transaction.originalValue || transaction.value,
      originalValue: transaction.originalValue || transaction.value,
      icon: transaction.icon,
      _id: transaction._id,
      clientId: transaction.clientId,
      sharedWith: sharedWithIds,
      splitType: transaction.splitType || "equal",
      customAmounts: customAmounts, 
      isSharedExpense: sharedWithIds.length > 0
    };
    
    return finalData;
  };

  const handleSubmit = (formData) => {
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