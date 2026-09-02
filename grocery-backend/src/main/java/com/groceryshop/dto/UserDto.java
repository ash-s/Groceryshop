package com.groceryshop.dto;

import com.groceryshop.user.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserDto {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private LocalDateTime createdAt;
}