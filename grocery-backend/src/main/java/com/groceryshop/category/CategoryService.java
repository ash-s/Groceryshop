package com.groceryshop.category;

import com.groceryshop.dto.CategoryDto;
import com.groceryshop.dto.CategoryRequest;
import com.groceryshop.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryDto> getAll() {
        return categoryRepository.findAll().stream().map(this::toDto).toList();
    }

    public CategoryDto getById(Long id) {
        return toDto(getCategory(id));
    }

    public CategoryDto create(CategoryRequest request) {
        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(categoryRepository.save(category));
    }

    public CategoryDto update(Long id, CategoryRequest request) {
        Category category = getCategory(id);
        category.setName(request.getName());
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        return toDto(categoryRepository.save(category));
    }

    public void delete(Long id) {
        categoryRepository.delete(getCategory(id));
    }

    private Category getCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    private CategoryDto toDto(Category category) {
        return CategoryDto.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .imageUrl(category.getImageUrl())
                .build();
    }
}