package com.groceryshop.supplier;

import com.groceryshop.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SupplierLookup {
    private final SupplierRepository supplierRepository;

    public Supplier resolve(Long id) {
        if (id == null) {
            return null;
        }
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + id));
    }
}
