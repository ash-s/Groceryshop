package com.groceryshop.user;

import com.groceryshop.dto.AdminResetPasswordRequest;
import com.groceryshop.dto.AdminResetPasswordResponse;
import com.groceryshop.dto.CreateUserRequest;
import com.groceryshop.dto.UpdateSalaryRequest;
import com.groceryshop.dto.UpdateUserRoleRequest;
import com.groceryshop.dto.UserDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<List<UserDto>> getAll() {
        return ResponseEntity.ok(adminUserService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<UserDto> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminUserService.createUser(request));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<AdminResetPasswordResponse> resetPassword(
            @PathVariable Long id, @Valid @RequestBody AdminResetPasswordRequest request) {
        return ResponseEntity.ok(adminUserService.resetPassword(id, request));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<UserDto> updateRole(
            @PathVariable Long id, @Valid @RequestBody UpdateUserRoleRequest request) {
        return ResponseEntity.ok(adminUserService.updateRole(id, request.getRole()));
    }

    @PutMapping("/{id}/salary")
    public ResponseEntity<UserDto> updateSalary(
            @PathVariable Long id, @Valid @RequestBody UpdateSalaryRequest request) {
        return ResponseEntity.ok(adminUserService.updateSalary(id, request.getMonthlySalary()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        adminUserService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}