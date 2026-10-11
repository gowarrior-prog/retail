'use client';

import React from 'react';
import DeleteConfirmationModal from '@/components/common/DeleteConfirmationModal';

interface DeleteConfirmModalProps {
  productName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ productName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <DeleteConfirmationModal
      title="Confirm Product Deletion"
      entityName={productName}
      message={`Are you sure you want to delete ${productName || 'this product'}?`}
      onClose={onCancel}
      onConfirm={onConfirm}
    />
  );
}
