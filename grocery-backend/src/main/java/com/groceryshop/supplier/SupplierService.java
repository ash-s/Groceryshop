package com.groceryshop.supplier;

import com.groceryshop.dto.SupplierDto;
import com.groceryshop.dto.SupplierRequest;
import com.groceryshop.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<SupplierDto> getAll() {
        return supplierRepository.findAll().stream().map(this::toDto).toList();
    }

    public SupplierDto getById(Long id) {
        return toDto(getSupplier(id));
    }

    public SupplierDto create(SupplierRequest request) {
        Supplier supplier = Supplier.builder()
                .name(request.getName())
                .company(request.getCompany())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(supplierRepository.save(supplier));
    }

    public SupplierDto update(Long id, SupplierRequest request) {
        Supplier supplier = getSupplier(id);
        supplier.setName(request.getName());
        supplier.setCompany(request.getCompany());
        supplier.setPhone(request.getPhone());
        supplier.setEmail(request.getEmail());
        supplier.setAddress(request.getAddress());
        return toDto(supplierRepository.save(supplier));
    }

    public void delete(Long id) {
        supplierRepository.delete(getSupplier(id));
    }

    private Supplier getSupplier(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + id));
    }

    private SupplierDto toDto(Supplier supplier) {
        return SupplierDto.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .company(supplier.getCompany())
                .phone(supplier.getPhone())
                .email(supplier.getEmail())
                .address(supplier.getAddress())
                .build();
    }
}