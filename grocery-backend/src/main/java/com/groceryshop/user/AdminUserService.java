package com.groceryshop.user;

import com.groceryshop.cart.CartItemRepository;
import com.groceryshop.dto.AdminResetPasswordRequest;
import com.groceryshop.dto.AdminResetPasswordResponse;
import com.groceryshop.dto.CreateUserRequest;
import com.groceryshop.dto.UserDto;
import com.groceryshop.exception.BadRequestException;
import com.groceryshop.exception.ResourceNotFoundException;
import com.groceryshop.order.OrderRepository;
import com.groceryshop.util.CurrentUserUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    /** Charset without confusing characters (0/O, 1/l/I). */
    private static final String TEMP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final OrderRepository orderRepository;
    private final CartItemRepository cartItemRepository;
    private final CurrentUserUtil currentUserUtil;

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public UserDto createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BadRequestException("Username '" + request.getUsername() + "' is already taken.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email '" + request.getEmail() + "' is already registered.");
        }
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(request.getRole())
                .createdAt(LocalDateTime.now())
                .build();
        return toDto(userRepository.save(user));
    }

    /**
     * Resets a user's password. If {@code request.newPassword} is provided, it is used;
     * otherwise a random temporary password is generated, hashed, and returned so the
     * manager can share it with the staff member.
     */
    @Transactional
    public AdminResetPasswordResponse resetPassword(Long id, AdminResetPasswordRequest request) {
        User admin = currentUserUtil.getCurrentUser();
        if (admin.getId().equals(id)) {
            throw new BadRequestException("You cannot reset your own password. Ask another admin to do it.");
        }
        User user = getUser(id);

        boolean customPassword = request.getNewPassword() != null && !request.getNewPassword().isBlank();
        if (customPassword && request.getNewPassword().length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters.");
        }

        String newPassword = customPassword ? request.getNewPassword() : generateTemporaryPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return AdminResetPasswordResponse.builder()
                .message("Password for '" + user.getUsername() + "' has been reset.")
                .temporaryPassword(customPassword ? null : newPassword)
                .build();
    }

    /**
     * Promotes a staff member to admin (or demotes back to staff). Guards: not yourself, and you cannot
     * demote the very last admin or you would lock everyone out.
     */
    @Transactional
    public UserDto updateRole(Long id, Role role) {
        User admin = currentUserUtil.getCurrentUser();
        if (admin.getId().equals(id)) {
            throw new BadRequestException("You cannot change your own role.");
        }
        User user = getUser(id);

        if (user.getRole() == Role.ADMIN && role == Role.STAFF && countAdmins() <= 1) {
            throw new BadRequestException("Cannot demote the last admin account. Promote another user to ADMIN first.");
        }

        user.setRole(role);
        return toDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        User admin = currentUserUtil.getCurrentUser();
        if (admin.getId().equals(id)) {
            throw new BadRequestException("You cannot delete your own account.");
        }
        User user = getUser(id);

        if (user.getRole() == Role.ADMIN && countAdmins() <= 1) {
            throw new BadRequestException("Cannot delete the last admin account. Promote another user to ADMIN first.");
        }

        if (orderRepository.existsByUserId(id)) {
            throw new BadRequestException(
                    "Cannot delete this user: they have order history. Reset their password instead.");
        }

        cartItemRepository.deleteByUserId(id);
        userRepository.delete(user);
    }

    private long countAdmins() {
        return userRepository.findAll().stream().filter(u -> u.getRole() == Role.ADMIN).count();
    }

    private String generateTemporaryPassword() {
        StringBuilder sb = new StringBuilder(10);
        for (int i = 0; i < 10; i++) {
            sb.append(TEMP_CHARS.charAt(RANDOM.nextInt(TEMP_CHARS.length())));
        }
        return sb.toString();
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
    }
}