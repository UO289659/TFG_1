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
    console.log("🔍 [EditModal] 1. Transacción original de BD:", {
      _id: transaction._id,
      name: transaction.name,
      category: transaction.category,
      value: transaction.value,
      originalValue: transaction.originalValue,
      splitType: transaction.splitType,
      sharedWith: transaction.sharedWith,
      clientId: transaction.clientId
    });

    // 1. Lista de todos los participantes
    let allParticipantIds = [transaction.clientId.toString()];
    let customAmounts = {};

    // 2. CRÍTICO: Verificar qué valor del creador usar
    const creatorAmount = transaction.value;
    customAmounts[transaction.clientId.toString()] = creatorAmount;
    
    console.log("🔍 [EditModal] 2. Inicializando creador:", {
      clientId: transaction.clientId,
      creatorAmount: creatorAmount
    });

    // 3. Procesar sharedWith existente
    if (transaction.sharedWith && Array.isArray(transaction.sharedWith)) {
      console.log("🔍 [EditModal] 3. Procesando sharedWith existente:");
      
      transaction.sharedWith.forEach((item, index) => {
        console.log(`  [${index}] userId: ${item.userId}, amount: ${item.amount}, isPaid: ${item.isPaid}`);
        
        if (item.userId) {
          const id = item.userId.toString();
          
          if (!allParticipantIds.includes(id)) {
            allParticipantIds.push(id);
          }
          
          if (transaction.splitType === 'custom') {
            // AQUÍ ESTÁ EL PUNTO CRÍTICO
            if (item.amount !== undefined && item.amount !== null) {
              customAmounts[id] = item.amount;
              console.log(`  ✅ Asignando amount ${item.amount} a ${id}`);
            } else {
              console.log(`  ❌ item.amount es undefined/null para ${id}`);
            }
          } else {
            customAmounts[id] = transaction.value;
            console.log(`  ✅ Equal split: asignando ${transaction.value} a ${id}`);
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
      customAmounts: customAmounts, // ← ESTE ES EL OBJETO CRÍTICO
      isSharedExpense: sharedWithIds.length > 0
    };

    console.log("🔍 [EditModal] 4. Datos finales preparados:", finalData);
    console.log("🔍 [EditModal] 5. customAmounts específicamente:", customAmounts);
    
    return finalData;
  };

  const handleSubmit = (formData) => {
    console.log("📤 [EditModal] Enviando datos desde EditTransactionModal:", formData);
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